import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import {
  AdminFreshness,
  AdminTabDataProps,
  AdminTabError,
  AdminTabHeader,
  AdminTabLoading,
} from "@/admin/components/AdminTabShared";
import {
  formatBatteryPercent,
  formatEnergyWh,
  formatPowerW,
} from "@/admin/format";
import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import type { AdminFleetOverview } from "@/services/adminService";

interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  featured?: boolean;
  colors: AppColors;
}

function KpiCard({
  label,
  value,
  detail,
  icon,
  featured = false,
  colors,
}: KpiCardProps) {
  const styles = useMemo(
    () => getKpiStyles(colors, featured),
    [colors, featured],
  );

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon}
          size={featured ? 24 : 20}
          color={colors.primary}
        />
      </View>

      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>

      <AppText variant="heading" style={styles.value}>
        {value}
      </AppText>

      <AppText variant="caption" style={styles.detail}>
        {detail}
      </AppText>
    </View>
  );
}

export default function AdminOverviewTab({
  data,
  loading,
  error,
  stale,
  onRetry,
}: AdminTabDataProps<AdminFleetOverview>) {
  const colors = useAppColors();

  const styles = useMemo(() => getStyles(colors), [colors]);

  if (loading) {
    return <AdminTabLoading />;
  }

  if (!data) {
    return (
      <AdminTabError
        message={error || "No fleet data available"}
        onRetry={onRetry}
      />
    );
  }

  if (data.device_count === 0) {
    return (
      <EmptyState
        icon="analytics-outline"
        title="No fleet data yet"
        description="Once households connect their devices, battery, solar, and load metrics will appear here."
      />
    );
  }

  return (
    <View style={styles.container}>
      <AdminTabHeader
        title="Overview"
        subtitle="Live fleet monitoring at a glance."
      />

      <KpiCard
        featured
        label="Battery level"
        value={formatBatteryPercent(data.avg_battery)}
        detail={`${data.online_count} online · ${data.low_battery_count} low`}
        icon="battery-charging-outline"
        colors={colors}
      />

      <View style={styles.row}>
        <KpiCard
          label="Solar energy"
          value={formatEnergyWh(data.solar_wh_24h)}
          detail="Collected in 24h"
          icon="sunny-outline"
          colors={colors}
        />

        <KpiCard
          label="Load consumption"
          value={formatPowerW(data.load_w_avg)}
          detail={`${formatEnergyWh(data.load_wh_24h)} used`}
          icon="flash-outline"
          colors={colors}
        />
      </View>

      <AdminFreshness
        lastUpdated={data.last_updated}
        stale={stale}
      />
    </View>
  );
}

const getKpiStyles = (
  colors: AppColors,
  featured: boolean,
) =>
  StyleSheet.create({
    card: {
      width: featured ? "100%" : "48%",
      minHeight: featured ? 150 : 132,
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      padding: 16,
      gap: 6,
      justifyContent: "center",
    },

    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
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
      fontSize: featured ? 34 : 24,
      fontWeight: "700",
    },

    detail: {
      color: colors.textSecondary,
    },
  });

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      width: "100%",
      gap: 18,
    },

    row: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
  });
