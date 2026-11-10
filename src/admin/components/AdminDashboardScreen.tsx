import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import Copyright from "@/components/ui/Copyright";
import AdminMenuSection from "@/admin/components/AdminMenuSection";
import AdminNavBarTop from "@/admin/components/AdminNavBarTop";
import AdminScreenContainer from "@/admin/components/AdminScreenContainer";
import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Radius, Spacing } from "@/constants/theme";
import { useAdminGuard } from "@/admin/hooks/useAdminGuard";

// ============================================================
// ADMIN DASHBOARD SCREEN (English-only, pinned light)
//
// Blank starting shell for role-based login verification.
// Login gate (useAdminGuard) and Log Out / Exit
// (AdminMenuSection) are the only live functions. Fixed
// light palette + default type (no Theme/Settings providers
// in app/admin/_layout) and hardcoded English so household
// theme/font/language changes never affect admin.
// ============================================================

export default function AdminDashboardScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { canRender } = useAdminGuard();

  if (!canRender) {
    return null;
  }

  return (
    <AdminScreenContainer
      activeTab="menu"
      onTabChange={() => {}}
    >
      {/* Same green header + yellow accent as the household
          upper navbar, admin name only: no online/offline
          capsule, no notification bell. */}
      <AdminNavBarTop />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <AppText variant="title" style={styles.headerTitle}>
            Admin Dashboard
          </AppText>

          <AppText variant="body" style={styles.headerSub}>
            Admin access confirmed. Dashboard modules are
            coming next.
          </AppText>
        </View>

        <AdminMenuSection />

        <Copyright />
      </ScrollView>
    </AdminScreenContainer>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scroll: {
      gap: Spacing.md,
      padding: Spacing.md,
      paddingBottom: Spacing.xl,
    },

    headerCard: {
      width: "100%",
      backgroundColor: colors.headerBackground,
      borderRadius: Radius.lg,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      padding: Spacing.md,
      gap: 4,
    },

    headerTitle: {
      color: colors.headerContent,
    },

    headerSub: {
      color: colors.headerContent,
      opacity: 0.85,
    },
  });
