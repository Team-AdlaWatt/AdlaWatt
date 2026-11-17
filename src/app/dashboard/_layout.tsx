import { Slot, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { useEffect, useRef } from "react";

import { SettingsProvider } from "@/context/SettingsContext";
import {
  ThemeProvider,
  useTheme,
} from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useHouseholdGuard } from "@/hooks/useHouseholdGuard";
import { useAlertVibration } from "@/hooks/useAlertVibration";
import RouteErrorBoundary from "@/components/ui/RouteErrorBoundary";
import VibrationGuidancePanel from "@/components/guidance/VibrationGuidancePanel";
import { useLocalReminders } from "@/hooks/useLocalReminders";
import {
  initializeNotificationService,
  shutdownNotificationService,
} from "@/services/notificationService";

// ============================================================
// DASHBOARD LAYOUT (household-only)
//
// Single shared typography + theme instances for the whole
// dashboard, behind an auth + household-role guard. Admin
// sessions bounce to /admin (see useHouseholdGuard); the
// mirror useAdminGuard keeps household out of /admin.
// Save in Menu propagates typography to all dashboard screens;
// the Dark Mode toggle applies instantly. Auth screens live in
// their own layout with the saved theme.
// StatusBar follows the active theme.
// ============================================================

function ThemedDashboard() {
  const { isDark } = useTheme();
  const { isLoaded, isSignedIn, user } = useAuth();
  const { canRender: canRenderHousehold } = useHouseholdGuard();
  const userId = user?.id ?? null;
  const initializedUserId = useRef<string | null>(null);

  // Persistent alert buzz while unread alerts exist.
  // Mounted once for the whole signed-in dashboard.
  useAlertVibration();

  // Local reminder schedules + tap deep-linking.
  // Mounted once for the whole signed-in dashboard.
  useLocalReminders();

  // Auth guard: unauthenticated deep-links land here
  // without passing through splash.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/auth/login");
    }
  }, [isLoaded, isSignedIn]);

  // Notification service lifecycle: start explicitly only
  // when signed in, staggered after first paint so Navbar +
  // monitoring subscribes settle first (avoids 4-channel
  // burst + StrictMode init/shutdown churn -> socket 1006).
  // No cleanup-shutdown on re-run; shutdown only on user
  // change or true unmount / sign-out.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      if (isLoaded && !isSignedIn) {
        initializedUserId.current = null;
        shutdownNotificationService().catch(() => {});
      }

      return;
    }

    if (initializedUserId.current === userId) {
      return;
    }

    initializedUserId.current = userId;

    const timer = setTimeout(() => {
      initializeNotificationService().catch((error) => {
        console.error(
          "Failed to initialize notification service:",
          error,
        );
        initializedUserId.current = null;
      });
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, [isLoaded, isSignedIn, userId]);

  useEffect(
    () => () => {
      initializedUserId.current = null;
      shutdownNotificationService().catch(() => {});
    },
    [],
  );

  if (!isLoaded || !isSignedIn || !canRenderHousehold) {
    return null;
  }

  return (
    <SettingsProvider>
      {/* Native-only: expo-status-bar is a no-op on web. */}
      {Platform.OS !== "web" && (
        <StatusBar
          style={isDark ? "light" : "dark"}
        />
      )}
      <RouteErrorBoundary>
        <Slot />
      </RouteErrorBoundary>
      <VibrationGuidancePanel />
    </SettingsProvider>
  );
}

export default function DashboardLayout() {
  return (
    <ThemeProvider>
      <ThemedDashboard />
    </ThemeProvider>
  );
}
