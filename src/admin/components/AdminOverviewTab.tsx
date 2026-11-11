import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import {
  AdminTabDataProps,
  AdminTabError,
  AdminTabHeader,
  AdminTabLoading,
} from "@/admin/components/AdminTabShared";
import {
  formatBatteryPercent,
  formatLastUpdated,
  formatSolarKwh,
  formatVoltage,
} from "@/admin/format";
import AnalyticsChartCard from "@/components/AnalyticsChartCard";
import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

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

export default function AdminOverviewTab({
  fleet,
  loading,
  error,
  onRetry,
}: AdminTabDataProps) {
  const colors = useAppColors();

  const styles = useMemo(() => getStyles(colors), [colors]);

  if (loading) {
    return <AdminTabLoading />;
  }

  if (!fleet) {
    return (
      <AdminTabError
        message={error || "No fleet data available"}
        onRetry={onRetry}
      />
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

  return (
    <View style={styles.container}>
      <AdminTabHeader
        title="Overview"
        subtitle="Fleet health and energy at a glance."
      />

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
          value={formatBatteryPercent(fleet.avg_battery)}
          icon="battery-half-outline"
          colors={colors}
        />

        <KpiCard
          label="Solar / 24h"
          value={formatSolarKwh(fleet.total_solar_wh_24h)}
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
          value={formatVoltage(fleet.avg_voltage)}
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
            {formatLastUpdated(fleet.last_updated)}
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
  });
