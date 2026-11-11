import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { StyleSheet } from "react-native";

import Copyright from "@/components/ui/Copyright";
import PullRefreshScroll from "@/components/PullRefreshScroll";
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
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  getAdminFleetHealth,
  getAdminFleetUsers,
  type AdminFleetHealth,
  type AdminFleetUser,
} from "@/services/adminService";
import type { AdminTab } from "@/admin/constants";

export default function AdminDashboardScreen() {
  const colors = useAppColors();
  const styles = getStyles(colors);
  const screenPadding = useScreenPadding();
  const { canRender } = useAdminGuard();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // One shared admin fetch for all three tabs: pull-to-refresh
  // and tab switches reuse it instead of refetching per tab.
  // Fleet health feeds Overview/Reports; fleet users feed the
  // pseudonymized household list on the Users tab.
  const [fleet, setFleet] = useState<AdminFleetHealth | null>(null);
  const [users, setUsers] = useState<AdminFleetUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref mirrors of the latest snapshots so `load` stays
  // stable: with data on screen, a pull refreshes in place
  // (last-known values stay up) instead of flipping back to
  // the full-screen loader.
  const fleetRef = useRef<AdminFleetHealth | null>(null);
  const usersRef = useRef<AdminFleetUser[] | null>(null);

  const load = useCallback(async () => {
    if (fleetRef.current === null) {
      setLoading(true);
    }

    setError(null);

    const [fleetResult, usersResult] = await Promise.all([
      getAdminFleetHealth(),
      getAdminFleetUsers(),
    ]);

    // Same loader contract as the household dashboard: keep
    // last-known values on a failed refresh; the error card
    // only takes over with nothing to show.
    if (fleetResult.error || !fleetResult.data) {
      if (fleetRef.current === null) {
        setFleet(null);
      }
    } else {
      setFleet(fleetResult.data);
      fleetRef.current = fleetResult.data;
    }

    if (usersResult.error || !usersResult.data) {
      if (usersRef.current === null) {
        setUsers(null);
      }
    } else {
      setUsers(usersResult.data);
      usersRef.current = usersResult.data;
    }

    setError(
      fleetResult.error ||
        usersResult.error ||
        null,
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!canRender) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial Supabase fetch once the admin guard clears
    void load();
  }, [canRender, load]);

  const { refreshing, onRefresh } = usePullToRefresh(load);

  // Same retry action for all three tabs' error states.
  const handleRetry = () => {
    void load();
  };

  if (!canRender) {
    return null;
  }

  return (
    <AdminScreenContainer
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <AdminNavBarTop />

      <PullRefreshScroll
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        refreshLabel="Pull down to refresh"
        refreshTint={colors.primary}
        testID="admin-pull-scroll"
      >
        {activeTab === "overview" ? (
          <AdminOverviewTab
            fleet={fleet}
            loading={loading}
            error={error}
            onRetry={handleRetry}
          />
        ) : null}

        {activeTab === "users" ? (
          <AdminUsersTab
            fleet={fleet}
            users={users}
            loading={loading}
            error={error}
            onRetry={handleRetry}
          />
        ) : null}

        {activeTab === "reports" ? (
          <AdminReportsTab
            fleet={fleet}
            loading={loading}
            error={error}
            onRetry={handleRetry}
          />
        ) : null}

        <Copyright />
      </PullRefreshScroll>
    </AdminScreenContainer>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },

    scrollContent: {
      gap: 18,
      paddingTop: 18,
      paddingBottom: 24,
    },
  });
