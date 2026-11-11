import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AnalyticsChartCard from "@/components/AnalyticsChartCard";
import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import { Radius } from "@/constants/theme";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { SlidingToggle } from "@/components/ui/SlidingToggle";
import {
  getAdminFleetHealth,
  type AdminFleetHealth,
} from "@/services/adminService";

interface KpiCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: AppColors;
}

function KpiCard({ label, value, icon, colors }: KpiCardProps) {
  const styles = useMemo(() => getKpiStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>

      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>

      <AppText variant="heading" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

export default function AdminOverviewTab() {
  const colors = useAppColors();
  const [fleet, setFleet] = useState<AdminFleetHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => getStyles(colors), [colors]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getAdminFleetHealth();

    if (result.error || !result.data) {
      setError(result.error || "Failed to load fleet health");
      setFleet(null);
    } else {
      setFleet(result.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial Supabase fetch on mount
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !fleet) {
    return (
      <View style={styles.center}>
        <AppText variant="body" style={styles.errorText}>
          {error || "No fleet data available"}
        </AppText>

        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <AppText variant="body" style={styles.retryText}>
            Retry
          </AppText>
        </Pressable>
      </View>
    );
  }

  if (fleet.device_count === 0) {
    return (
      <EmptyState
        icon="analytics-outline"
        title="No fleet data yet"
        description="Once households connect their devices, fleet metrics will appear here."
      />
    );
  }

  const totalSolarKwh = fleet.total_solar_wh_24h / 1000;

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <AppText variant="title" style={styles.headerTitle}>
          Overview
        </AppText>

        <AppText variant="caption" style={styles.headerSub}>
          Fleet health and energy at a glance.
        </AppText>
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard
          label="Households"
          value={String(fleet.device_count)}
          icon="people"
          colors={colors}
        />

        <KpiCard
          label="Online"
          value={String(fleet.online_count)}
          icon="wifi"
          colors={colors}
        />

        <KpiCard
          label="Avg battery"
          value={
            fleet.avg_battery == null
              ? "—"
              : `${Math.round(fleet.avg_battery)}%`
          }
          icon="battery-half-outline"
          colors={colors}
        />

        <KpiCard
          label="Solar / 24h"
          value={`${totalSolarKwh.toFixed(1)} kWh`}
          icon="sunny-outline"
          colors={colors}
        />

        <KpiCard
          label="Unsafe battery"
          value={String(fleet.low_battery_count)}
          icon="warning-outline"
          colors={colors}
        />

        <KpiCard
          label="Avg voltage"
          value={
            fleet.avg_voltage == null
              ? "—"
              : `${fleet.avg_voltage.toFixed(2)} V`
          }
          icon="flash-outline"
          colors={colors}
        />
      </View>

      <AnalyticsChartCard
        title="Fleet Status"
        subtitle="Live aggregates from the last 24 hours."
        icon="stats-chart-outline"
      >
        <View style={styles.chartBody}>
          <AppText variant="caption" style={styles.metaText}>
            Last updated:{" "}
            {fleet.last_updated
              ? new Date(fleet.last_updated).toLocaleString()
              : "—"}
          </AppText>
        </View>
      </AnalyticsChartCard>
    </View>
  );
}

const getKpiStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      width: "48%",
      minHeight: 96,
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      padding: 14,
      gap: 6,
    },

    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryWash,
    },

    label: {
      color: colors.textSecondary,
      fontWeight: "600",
    },

    value: {
      color: colors.text,
      fontWeight: "700",
    },
  });

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      width: "100%",
      gap: 18,
    },

    headerCard: {
      width: "100%",
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      padding: 18,
      gap: 6,
    },

    headerTitle: {
      color: colors.text,
      fontWeight: "700",
    },

    headerSub: {
      color: colors.textSecondary,
    },

    kpiGrid: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },

    chartBody: {
      width: "100%",
      gap: 16,
    },

    metaText: {
      color: colors.textSecondary,
    },

    center: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 12,
    },

    errorText: {
      color: colors.textSecondary,
      textAlign: "center",
    },

    retryButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },

    retryText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    pressed: {
      opacity: 0.7,
    },
  });
