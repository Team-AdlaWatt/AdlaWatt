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
import AdminHistoryTab from "@/admin/components/AdminHistoryTab";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { useScreenPadding } from "@/constants/sizing";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  getAdminFleetHistory,
  getAdminFleetOverview,
  type AdminFleetHistoryPoint,
  type AdminFleetOverview,
} from "@/services/adminService";
import type {
  AdminHistoryRange,
  AdminTab,
} from "@/admin/constants";

const POLL_INTERVAL_MS = 20_000;

export default function AdminDashboardScreen() {
  const colors = useAppColors();
  const styles = getStyles(colors);
  const screenPadding = useScreenPadding();
  const [activeTab, setActiveTab] =
    useState<AdminTab>("overview");
  const [range, setRange] =
    useState<AdminHistoryRange>(24);
  const [overview, setOverview] =
    useState<AdminFleetOverview | null>(null);
  const [history, setHistory] = useState<
    AdminFleetHistoryPoint[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<
    string | null
  >(null);
  const [historyError, setHistoryError] = useState<
    string | null
  >(null);
  const [stale, setStale] = useState(false);

  const overviewRef = useRef<AdminFleetOverview | null>(
    null,
  );
  const historyRef = useRef<
    AdminFleetHistoryPoint[] | null
  >(null);
  const inFlightRef = useRef(false);

  const loadOverview = useCallback(async () => {
    const result = await getAdminFleetOverview();

    if (result.data) {
      setOverview(result.data);
      overviewRef.current = result.data;
      setOverviewError(null);

      return true;
    }

    setOverviewError(result.error);

    if (overviewRef.current === null) {
      setOverview(null);
    }

    return false;
  }, []);

  const loadHistory = useCallback(
    async (nextRange: AdminHistoryRange) => {
      const result = await getAdminFleetHistory(nextRange);

      if (result.data) {
        setHistory(result.data);
        historyRef.current = result.data;
        setHistoryError(null);

        return true;
      }

      setHistoryError(result.error);

      if (historyRef.current === null) {
        setHistory(null);
      }

      return false;
    },
    [],
  );

  const refreshAll = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setLoading(
      overviewRef.current === null &&
        historyRef.current === null,
    );

    try {
      const [overviewOk, historyOk] = await Promise.all([
        loadOverview(),
        loadHistory(range),
      ]);

      setStale(!overviewOk || !historyOk);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [loadOverview, loadHistory, range]);

  const refreshAllRef = useRef(refreshAll);

  useEffect(() => {
    refreshAllRef.current = refreshAll;
  }, [refreshAll]);

  useEffect(() => {
    void refreshAllRef.current();

    const timer = setInterval(() => {
      const browserDocument = (
        globalThis as {
          document?: { visibilityState?: string };
        }
      ).document;

      const hidden =
        browserDocument?.visibilityState === "hidden";

      if (!hidden) {
        void refreshAllRef.current();
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const handleRangeChange = useCallback(
    (nextRange: AdminHistoryRange) => {
      setRange(nextRange);

      void loadHistory(nextRange).then((ok) => {
        setStale(!ok);
      });
    },
    [loadHistory],
  );

  const { refreshing, onRefresh } =
    usePullToRefresh(refreshAll);

  const handleRetry = () => {
    void refreshAll();
  };

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
            data={overview}
            loading={loading}
            error={overviewError}
            stale={stale}
            onRetry={handleRetry}
          />
        ) : null}

        {activeTab === "history" ? (
          <AdminHistoryTab
            data={history}
            lastUpdated={overview?.last_updated ?? null}
            range={range}
            onRangeChange={handleRangeChange}
            loading={loading}
            error={historyError}
            stale={stale}
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
