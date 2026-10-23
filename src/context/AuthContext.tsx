import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/services/auth";

// ============================================================
// AUTH CONTEXT
// ============================================================
//
// Single source of truth for the signed-in session.
// Bootstraps from persisted storage on mount, then follows
// onAuthStateChange (sign-in, sign-out, token refresh,
// email confirmation). Screens and layouts consume
// useAuth() instead of calling getSession() ad hoc so
// session restores survive cold starts and guards agree.
// ============================================================

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  // Cached profile username, loaded once per session so
  // consumers (e.g. Navbar) never refetch per mount and
  // the name never blinks on navigation. Null while
  // signed out or before the first load resolves.
  profileUsername: string | null;
  refreshProfile: () => Promise<void>;
  // True between a PASSWORD_RECOVERY event and the password
  // actually being updated (or sign-out). Lets the auth
  // layout exempt /auth/forgot-password from its usual
  // signed-in bounce so the user can set the new password.
  isRecoverySession: boolean;
  clearRecoverySession: () => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [isRecoverySession, setIsRecoverySession] =
    useState(false);

  const [profileUsername, setProfileUsername] =
    useState<string | null>(null);

  // Serializes overlapping loads (sign-in storm, StrictMode
  // remount): only the latest request may write.
  const profileRequestId = useRef(0);

  const clearRecoverySession = useCallback(() => {
    setIsRecoverySession(false);
  }, []);

  const loadProfile = useCallback(
    async (hasSession: boolean) => {
      const requestId = (profileRequestId.current += 1);

      if (!hasSession) {
        setProfileUsername(null);
        return;
      }

      try {
        const profile = await getCurrentUserProfile();

        if (
          profileRequestId.current !== requestId
        ) {
          return;
        }

        if (profile.success && profile.username) {
          setProfileUsername(profile.username);
        } else {
          setProfileUsername(null);
        }
      } catch {
        if (
          profileRequestId.current === requestId
        ) {
          setProfileUsername(null);
        }
      }
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile(true);
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    const {
      data: { session: current },
    } = await supabase.auth.getSession();

    setSession(current);
    setIsLoaded(true);
    await loadProfile(current !== null);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session: current } }) => {
        if (mounted) {
          setSession(current);
          setIsLoaded(true);
          void loadProfile(current !== null);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoaded(true);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (mounted) {
          if (event === "PASSWORD_RECOVERY") {
            setIsRecoverySession(true);
          } else if (event === "SIGNED_OUT") {
            setIsRecoverySession(false);
            // Session-death diagnosis (task 1): a background
            // sign-out (expired/rejected refresh token) lands
            // here, distinct from an explicit signOut() call.
            console.info(
              "[auth] session ended (SIGNED_OUT event)",
            );
          }

          setSession(nextSession);
          setIsLoaded(true);
          void loadProfile(nextSession !== null);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    profileRequestId.current += 1;
    // Clear local state first so any consumer awaiting signOut
    // is not blocked on the network round-trip; the SIGNED_OUT
    // event then re-confirms the null session.
    setProfileUsername(null);
    setSession(null);
    setIsRecoverySession(false);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoaded,
      isSignedIn: session !== null,
      isRecoverySession,
      clearRecoverySession,
      refresh,
      signOut,
      profileUsername,
      refreshProfile,
    }),
    [
      session,
      isLoaded,
      isRecoverySession,
      clearRecoverySession,
      refresh,
      signOut,
      profileUsername,
      refreshProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider.",
    );
  }

  return context;
}
