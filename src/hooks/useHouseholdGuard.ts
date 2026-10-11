import { router } from "expo-router";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { Routes } from "@/constants/routes";
import { getCurrentUserProfile } from "@/services/auth";

// ============================================================
// useHouseholdGuard (role-based, mirror of useAdminGuard)
//
// Household renders, admin bounces to /admin, signed-out to
// /login. Unknown/error falls back to household (fail-open to
// household so a transient role-fetch failure never locks a
// user out of their dashboard; /admin stays fail-closed and
// requires an explicit admin role).
// ============================================================

// Mirror of the useAdminGuard throttle: shared in-flight role
// check + 5s cooldown trims client chatter on fast remounts.
// Server-side Supabase rate limits remain the real gate.
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
      // Household fallback decides render; report non-admin
      // so callers fail-open to household (never lock out).
      return false;
    }
  })();

  return inFlightRoleCheck;
}

export function useHouseholdGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const [isHousehold, setIsHousehold] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auth guard syncs role state + router (external system) on sign-out
      setIsHousehold(false);
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

        setIsHousehold(!admin);
        setRoleLoaded(true);

        if (admin) {
          router.replace(Routes.ADMIN);
        }
      } catch {
        if (cancelled) {
          return;
        }

        // Asymmetric fallback: stay on household on error.
        setIsHousehold(true);
        setRoleLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return {
    isLoaded,
    isSignedIn,
    isHousehold,
    // Render gate: wait for auth + role, require non-admin.
    canRender: isLoaded && isSignedIn && roleLoaded && isHousehold,
  };
}
