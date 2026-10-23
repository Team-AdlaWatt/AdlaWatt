import { Colors } from "@/constants/colors";
import { useAppFonts } from "@/hooks/useAppFonts";
import { useAuth } from "@/context/AuthContext";
import {
  getCurrentUserProfile,
  resolveOnboardingAwareRoute,
} from "@/services/auth";
import { Routes } from "@/constants/routes";
import { router } from "expo-router";
import { useEffect } from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    View
} from "react-native";

export default function SplashScreen() {
  const fontsLoaded = useAppFonts();
  const {
    isLoaded: authLoaded,
    isSignedIn,
    user,
  } = useAuth();

  useEffect(() => {
    if (!fontsLoaded || !authLoaded) {
      return;
    }

    // Cold-start restore diagnosis (task 1): records whether
    // a persisted session survived, so a "logged out again"
    // report shows found/missing instead of guesswork.
    console.info(
      `[auth] cold-start restore: ${
        isSignedIn
          ? `signed-in (${user?.id ?? "unknown-id"})`
          : "no-session"
      }`,
    );

    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        if (!isSignedIn) {
          if (!cancelled) {
            router.replace(Routes.LOGIN);
          }
          return;
        }

        // Cold start routing: admin test account lands on
        // /admin, first-time household users on /onboarding,
        // everyone else on /dashboard.
        try {
          const profile = await getCurrentUserProfile();

          if (!cancelled) {
            router.replace(
              resolveOnboardingAwareRoute(
                profile.success
                  ? (profile as { role?: unknown }).role
                  : null,
                profile.success
                  ? profile.onboardingCompleted
                  : true,
              ) as never,
            );
          }
        } catch {
          if (!cancelled) {
            router.replace(Routes.DASHBOARD);
          }
        }
      })();
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fontsLoaded, authLoaded, isSignedIn, user?.id]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/adlawatt-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <ActivityIndicator
        size="large"
        color={Colors.light.primary}
        style={styles.loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  logo: {
    width: 300,
    height: 200,
    marginBottom: 5,
  },

  loading: {
    marginTop: 40,
  },
});