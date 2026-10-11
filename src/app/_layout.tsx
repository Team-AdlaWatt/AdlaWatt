import { Slot } from "expo-router";
import { useEffect } from "react";
import { LogBox, Platform, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";

import { AuthProvider, useAuth } from "@/context/AuthContext";

import {
  initSentry,
  setSentryUser,
} from "@/services/sentry";

// Side effect: boots i18next (default English paints
// instantly; the saved language applies when loaded).
import "@/services/i18n";

// Init once at module load (guarded no-op without DSN,
// on web, or under Jest) so early boot crashes report.
initSentry();

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

// Syncs the anonymous Sentry user id with auth state.
// Runs inside AuthProvider so useAuth is available. Calls
// the Sentry SDK only (no React state), so no cascading
// render concern.
function SentryUserSync() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    setSentryUser(userId);
  }, [userId]);

  return null;
}

function CrashFallback() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#F0EAD6",
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#1A1A1A",
          textAlign: "center",
        }}
      >
        Something went wrong
      </Text>

      <Text
        style={{
          marginTop: 8,
          fontSize: 14,
          color: "#5A5A5A",
          textAlign: "center",
        }}
      >
        Please restart the app. The error was reported.
      </Text>
    </View>
  );
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
// Sentry boundary wraps the slot so render crashes report
// to the preview project instead of grey-screening.
// ============================================================

function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SentryUserSync />

        <Sentry.ErrorBoundary fallback={<CrashFallback />}>
          <Slot />
        </Sentry.ErrorBoundary>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
