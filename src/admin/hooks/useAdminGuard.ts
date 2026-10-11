import { router } from "expo-router";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { Routes } from "@/constants/routes";
import { getCurrentUserProfile } from "@/services/auth";

// ============================================================
// useAdminGuard (role-based)
//
// Real check against self-readable users.role: admin renders,
// household bounces to /dashboard, signed-out to /login.
// Unknown/error roles fall back to household (never fail open).
// ============================================================

// Per-principles rate limiting: repeated role checks (e.g. fast
// remounts, deep-link spam) share one in-flight request and
// observe a 5s cooldown so /admin cannot hammer the profile
// endpoint. Server-side Supabase rate limits remain the real
// gate; this only trims client chatter.
let lastRoleCheckAt = 0;
let inFlightRoleCheck: Promise<boolean> | null = null;
const ROLE_CHECK_COOLDOWN_MS = 5000;

async function checkIsAdmin(): Promise<boolean> {
  const now = Date.now();

  if (
    inFlightRoleCheck &&
    now - lastRoleCheckAt < ROLE_CHECK_COOLDOWN_MS
  ) {
    return inFlightRoleCheck;
  }

  lastRoleCheckAt = now;
  inFlightRoleCheck = (async () => {
    try {
      const profile = await getCurrentUserProfile();

      return (
        profile.success &&
        (profile as { role?: unknown }).role === "admin"
      );
    } catch {
      return false;
    }
  })();

  return inFlightRoleCheck;
}

export function useAdminGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auth guard syncs role state + router (external system) on sign-out
      setIsAdmin(false);
      setRoleLoaded(true);
      router.replace(Routes.LOGIN);
      return;
    }

    let cancelled = false;
    setRoleLoaded(false);

    void (async () => {
      try {
        const admin = await checkIsAdmin();

        if (cancelled) {
          return;
        }

        setIsAdmin(admin);
        setRoleLoaded(true);

        if (!admin) {
          router.replace(Routes.DASHBOARD);
        }
      } catch {
        if (cancelled) {
          return;
        }

        setIsAdmin(false);
        setRoleLoaded(true);
        router.replace(Routes.DASHBOARD);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return {
    isLoaded,
    isSignedIn,
    isAdmin,
    // Render gate: wait for auth + role, require admin.
    canRender: isLoaded && isSignedIn && roleLoaded && isAdmin,
  };
}
