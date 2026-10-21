import { Slot, router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useAppColors } from "@/hooks/useAppColors";
import { useAppFonts } from "@/hooks/useAppFonts";
import { Routes } from "@/constants/routes";
import {
  getCurrentUserProfile,
  resolveOnboardingAwareRoute,
} from "@/services/auth";

// ============================================================
// ONBOARDING LAYOUT
//
// Gates the panel on font load (AppText needs the bundled
// family, same contract as the auth layout) and on auth:
// signed-out mounts bounce to login.
//
// No ThemeProvider on purpose — useTheme's out-of-provider
// fallback is always light, which is exactly the fixed cream
// palette the onboarding panels require regardless of the
// saved dashboard theme.
//
// Deep-link guard: a user who already completed onboarding
// (or an admin) opening /onboarding directly is routed back
// to the right screen instead of re-watching the panels.
// ============================================================

export default function OnboardingLayout() {
  const fontsLoaded = useAppFonts();
  const colors = useAppColors();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.replace(Routes.LOGIN);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const profile = await getCurrentUserProfile();

        if (cancelled || !profile.success) {
          return;
        }

        const route = resolveOnboardingAwareRoute(
          profile.role,
          profile.onboardingCompleted,
        );

        if (route !== Routes.ONBOARDING) {
          router.replace(route as never);
        }
      } catch {
        // Profile probe is best-effort; the screen's own
        // Skip/Proceed navigation still gets the user out.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

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

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: "#F0EAD6",
    alignItems: "center",
    justifyContent: "center",
  },
});
