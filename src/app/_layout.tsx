import { Slot } from "expo-router";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";


import { AuthProvider, useAuth } from "@/context/AuthContext";

import AccountSessionGuard from "@/components/auth/AccountSessionGuard";
import AppUpdateGuard from "@/components/updates/AppUpdateGuard";



import {
  registerForPushNotificationsAsync,
} from "@/services/pushNotifications";

// Side effect: boots i18next (default English paints
// instantly; the saved language applies when loaded).
import "@/services/i18n";


// Canonical web-only CSS entry (Expo-accepted location).
// Guarded so native OTA bundles skip CSS at runtime; Metro + tsc
// resolve types via src/types/css.d.ts, Jest via styleMock.
if (Platform.OS === "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/global.css");
}

// Benign web-only responder noise ("Cannot record touch end
// without a touch start", empty Touch Bank) fires without user
// interaction on localhost and doesn't block taps. Filter it
// from the dev overlay while keeping all other warnings.
LogBox.ignoreLogs([
  "Cannot record touch end without a touch start",
]);


// Registers this install for remote push once a user session
// exists. Same shape as SentryUserSync: it only calls a service
// (no React state), so it cannot cascade renders. Failures are
// absorbed inside the service, so a device without Play services
// or a refused permission never blocks startup.
function PushRegistrationSync() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      return;
    }

    void registerForPushNotificationsAsync();
  }, [userId]);

  return null;
}

// ============================================================
// ROOT LAYOUT
// ============================================================
//
// Single mount point for cross-cutting providers. Session
// state (AuthProvider) lives here so splash, auth screens,
// and dashboard guards share one bootstrap instead of each
// calling getSession() ad hoc. Fonts and theme stay in the
// group layouts (auth renders its fallback theme by design).
//
// The GlobalErrorBoundary sits OUTSIDE the providers so a
// throw inside AuthProvider / push registration still lands
// on a recoverable screen, and fatal event-handler/timer
// errors (which React boundaries never see) also get a retry
// path. Sentry's RN integration reports unhandled rejections
// on its own; we deliberately do NOT take over the screen for
// them, so one stray background rejection can't interrupt a
// demo. Sentry captures before the fallback renders — no
// duplicate events.
// ============================================================

function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PushRegistrationSync />

        <Slot />

        {/* Cross-cutting session watcher: an account deleted
            while the app is open keeps a valid JWT until it
            expires, so the dashboard would keep rendering.
            Mounted here (above every route) so the takeover
            covers dashboard, admin, and auth. */}
        <AccountSessionGuard />
        <AppUpdateGuard />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default RootLayout;
