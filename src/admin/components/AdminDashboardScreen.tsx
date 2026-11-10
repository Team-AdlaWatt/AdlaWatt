import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
} from "react-native";

import Copyright from "@/components/ui/Copyright";
import AdminNavBarTop from "@/admin/components/AdminNavBarTop";
import AdminScreenContainer from "@/admin/components/AdminScreenContainer";
import AdminOverviewTab from "@/admin/components/AdminOverviewTab";
import AdminUsersTab from "@/admin/components/AdminUsersTab";
import AdminReportsTab from "@/admin/components/AdminReportsTab";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { useScreenPadding } from "@/constants/sizing";
import { useAdminGuard } from "@/admin/hooks/useAdminGuard";
import type { AdminTab } from "@/admin/constants";

export default function AdminDashboardScreen() {
  const colors = useAppColors();
  const styles = getStyles(colors);
  const screenPadding = useScreenPadding();
  const { canRender } = useAdminGuard();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  if (!canRender) {
    return null;
  }

  return (
    <AdminScreenContainer
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <AdminNavBarTop />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" ? (
          <AdminOverviewTab />
        ) : null}

        {activeTab === "users" ? (
          <AdminUsersTab />
        ) : null}

        {activeTab === "reports" ? (
          <AdminReportsTab />
        ) : null}

        <Copyright />
      </ScrollView>
    </AdminScreenContainer>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scroll: {
      gap: 18,
      paddingTop: 18,
      paddingBottom: 24,
    },
  });
