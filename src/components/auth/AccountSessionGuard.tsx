import { router, usePathname } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import AccountNotFoundOverlay from "@/components/auth/AccountNotFoundOverlay";
import { Routes } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { checkAccountExists } from "@/services/accountSessionChecker";

// ============================================================
// ACCOUNT SESSION GUARD
// ============================================================
//
// Watches the signed-in account from the root layout, so it
// covers every route the user can sit on: dashboard, admin,
// account pages.
//
// Cadence:
//   - one check on mount (a cold start after the account was
//     deleted must not open a ghost dashboard)
//   - one check every 15s while the app is in the foreground
//   - one check the moment the app returns to the foreground
//   - no check while offline, and no check in the background
//
// A deleted account (Supabase -> Authentication -> Users) keeps
// a valid JWT until it expires, so nothing else in the app
// notices: the dashboard keeps rendering until the next server
// write fails. This guard is that missing signal.
//
// The session is dropped as soon as the deletion is confirmed,
// so the takeover is a dead end with exactly one way out.
// ============================================================

const CHECK_INTERVAL_MS = 15000;
const REDIRECT_DELAY_MS = 2500;

export default function AccountSessionGuard() {
  const {
    isLoaded,
    isSignedIn,
    user,
    signOut,
  } = useAuth();
  const { connected } = useConnectivity();
  const pathname = usePathname();

  const [isMissing, setIsMissing] = useState(false);
  const isMissingRef = useRef(false);
  const isCheckingRef = useRef(false);
  const pathnameRef = useRef(pathname);

  const userId = user?.id ?? null;

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const showMissing = useCallback(() => {
    isMissingRef.current = true;
    setIsMissing(true);
  }, []);

  const dismiss = useCallback(() => {
    isMissingRef.current = false;
    setIsMissing(false);
  }, []);

  const handleBackToSignIn = useCallback(() => {
    // Local state first (AuthContext clears it synchronously),
    // then leave: the signed-in bounce in the auth layout must
    // not fire on the way out.
    void signOut();
    router.replace(Routes.LOGIN);
    dismiss();
  }, [dismiss, signOut]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled || isCheckingRef.current) {
        return;
      }

      // A backgrounded app checks again when it returns; a
      // tick now would only burn battery.
      if (AppState.currentState !== "active") {
        return;
      }

      // Offline: no request, no verdict. The next tick retries
      // once the connection is back.
      if (connected === false) {
        return;
      }

      isCheckingRef.current = true;

      try {
        const outcome = await checkAccountExists({
          userId: userId ?? undefined,
        });

        if (!cancelled && outcome.status === "deleted") {
          showMissing();
        }
      } catch (error) {
        // The checker never throws by contract. This guard
        // keeps a bug in it from ever breaking the dashboard.
        console.warn(
          "Account check failed:",
          error instanceof Error ? error.message : error,
        );
      } finally {
        isCheckingRef.current = false;
      }
    };

    void tick();

    const interval = setInterval(() => {
      void tick();
    }, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void tick();
        }
      },
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [
    connected,
    isLoaded,
    isSignedIn,
    showMissing,
    userId,
  ]);

  // The takeover ends on its own: the account is gone, so the
  // app walks the user back to the login screen.
  useEffect(() => {
    if (!isMissing) {
      return;
    }

    // The session dies here: the account no longer exists, so
    // nothing may keep writing with it.
    void signOut();

    const timer = setTimeout(() => {
      if (!isMissingRef.current) {
        return;
      }

      if (pathnameRef.current !== Routes.LOGIN) {
        router.replace(Routes.LOGIN);
      }

      dismiss();
    }, REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [dismiss, isMissing, signOut]);

  // A fresh sign-in replaced the dead session: the takeover no
  // longer applies.
  useEffect(() => {
    if (isSignedIn && isMissingRef.current) {
      dismiss();
    }
  }, [dismiss, isSignedIn]);

  return (
    <AccountNotFoundOverlay
      visible={isMissing}
      onBackToSignIn={handleBackToSignIn}
    />
  );
}
