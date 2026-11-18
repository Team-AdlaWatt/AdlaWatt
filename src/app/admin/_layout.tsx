import { Slot, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAdminGuard } from "@/admin/hooks/useAdminGuard";
import { useAppFonts } from "@/hooks/useAppFonts";
import RouteErrorBoundary from "@/components/ui/RouteErrorBoundary";

// ============================================================
// ADMIN LAYOUT (admin-only, pinned light + Inter + English)
//
// Deliberately WITHOUT ThemeProvider / SettingsProvider:
// household theme flips, font-size/family changes and
// language switches must never restyle admin. Missing
// providers fall back to the light palette + DEFAULT_
// TYPOGRAPHY (Medium / Inter) — do not add the providers
// back. StatusBar is fixed dark-on-light. Render waits for
// bundled fonts (same gate as auth screens) so Inter paints
// on first frame even via cold deep link.
// Admin uses its own AdminScreenContainer + AdminNavBarBottom
// from src/admin/. Auth + role guard here (see
// useAdminGuard); the screen keeps its own gate as well.
// ============================================================

function ThemedAdmin() {
  const fontsLoaded = useAppFonts();
  const { isLoaded, isSignedIn } = useAuth();
  const { canRender: canRenderAdmin } = useAdminGuard();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/auth/login");
    }
  }, [isLoaded, isSignedIn]);

  if (
    !fontsLoaded ||
    !isLoaded ||
    !isSignedIn ||
    !canRenderAdmin
  ) {
    return null;
  }

  return (
    <>
      {Platform.OS !== "web" && (
        <StatusBar style="dark" />
      )}
      <RouteErrorBoundary>
        <Slot />
      </RouteErrorBoundary>
    </>
  );
}

export default function AdminLayout() {
  return <ThemedAdmin />;
}
