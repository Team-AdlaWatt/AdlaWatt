import {
  Slot,
  router,
  useGlobalSearchParams,
  useSegments,
} from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import { ThemeProvider } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  getCurrentUserProfile,
  resolvePostLoginRoute,
} from "@/services/auth";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { useAppFonts } from "@/hooks/useAppFonts";

// ============================================================
// AUTH LAYOUT
//
// Gates login + register on bundled font load so the auth
// screens always render Inter (the app default, same as the
// dashboard) even when opened directly via deep link or
// fast refresh without passing through splash. Auth screens
// intentionally mount no SettingsProvider: they fall back to
// DEFAULT_TYPOGRAPHY (Inter).
//
// Theme follows the saved preference (same storage key as
// the dashboard instance) so auth greens match the
// dashboard buttons in both light and dark mode. Auth never
// writes the theme; the toggle lives in dashboard Menu.
// ============================================================

export default function AuthLayout() {
  return (
    <ThemeProvider>
      <ThemedAuth />
    </ThemeProvider>
  );
}

function ThemedAuth() {
  const fontsLoaded = useAppFonts();
  const colors = useAppColors();
  const {
    isLoaded,
    isSignedIn,
    isRecoverySession,
  } = useAuth();
  const segments = useSegments();
  const globalParams = useGlobalSearchParams<{
    code?: string | string[];
    token_hash?: string | string[];
  }>();

  // Signed-in users have no business on login/register.
  // Exception: a recovery session must stay on
  // /auth/forgot-password until the new password is set —
  // bouncing it to the dashboard would strand the flow.
  const onForgotPassword =
    segments[segments.length - 1] ===
    "forgot-password";

  // A signed-in user opening a fresh recovery link must
  // also stay: the link hasn't been exchanged yet, so the
  // recovery flag isn't set — the link params themselves
  // are the signal. Without this, the bounce below fires
  // before the screen can verify the code.
  const firstParam = (
    value: string | string[] | undefined,
  ): string => {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value) && value.length > 0) {
      return value[0] ?? "";
    }

    return "";
  };

  const arrivingWithRecoveryLink =
    onForgotPassword &&
    (firstParam(globalParams.code) !== "" ||
      firstParam(globalParams.token_hash) !== "");

  // Web callback owns its own navigation: on success it
  // shows the standalone "close this tab" card (with its
  // own Continue button), so the instant bounce below must
  // not unmount it — that race is what left a blank tab.
  // Native keeps the auto-bounce; email/recovery sub-flows
  // keep their own routers inside the callback screen.
  const onCallbackScreen =
    segments[segments.length - 1] === "callback";

  const skipBounceForWebCallback =
    Platform.OS === "web" && onCallbackScreen;

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      skipBounceForWebCallback ||
      (isRecoverySession && onForgotPassword) ||
      arrivingWithRecoveryLink
    ) {
      return;
    }

    // Signed-in users have no business on login/register —
    // route role-aware so the admin test account lands on
    // /admin instead of /dashboard.
    void (async () => {
      try {
        const profile = await getCurrentUserProfile();

        router.replace(
          resolvePostLoginRoute(
            profile.success
              ? (profile as { role?: unknown }).role
              : null,
          ) as never,
        );
      } catch {
        router.replace("/dashboard");
      }
    })();
  }, [
    isLoaded,
    isSignedIn,
    isRecoverySession,
    onForgotPassword,
    arrivingWithRecoveryLink,
    skipBounceForWebCallback,
  ]);

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.fallback}>
        <ActivityIndicator
          size="large"
          color={colors.accentContent}
        />
      </View>
    );
  }

  return <Slot />;
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    fallback: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
  });
