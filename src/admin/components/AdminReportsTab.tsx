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
import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

interface StatCardProps {
  label: string;
  value: string;
  colors: AppColors;
}

function StatCard({ label, value, colors }: StatCardProps) {
  const styles = useMemo(() => getStatStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>

      <AppText variant="heading" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

export default function AdminReportsTab({
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
        message={error || "No report data available"}
        onRetry={onRetry}
      />
    );
  }

  if (fleet.device_count === 0) {
    return (
      <EmptyState
        icon="document-text-outline"
        title="No reports yet"
        description="Fleet reports will appear once households start sending data."
      />
    );
  }

  return (
    <View style={styles.container}>
      <AdminTabHeader
        title="Reports"
        subtitle="Fleet aggregates from the last 24 hours."
      />

      <View style={styles.statGrid}>
        <StatCard
          label="Households"
          value={String(fleet.device_count)}
          colors={colors}
        />

        <StatCard
          label="Online"
          value={String(fleet.online_count)}
          colors={colors}
        />

        <StatCard
          label="Solar / 24h"
          value={formatSolarKwh(fleet.total_solar_wh_24h)}
          colors={colors}
        />

        <StatCard
          label="Unsafe battery"
          value={String(fleet.low_battery_count)}
          colors={colors}
        />

        <StatCard
          label="Avg battery"
          value={formatBatteryPercent(fleet.avg_battery)}
          colors={colors}
        />

        <StatCard
          label="Avg voltage"
          value={formatVoltage(fleet.avg_voltage)}
          colors={colors}
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primary}
          />

          <AppText variant="body" style={styles.sectionTitle}>
            Privacy note
          </AppText>
        </View>

        <AppText variant="caption" style={styles.note}>
          Aggregates and fleet-wide summaries only. No raw rows,
          activity logs, or personal identifiers are shown. Last
          updated: {formatLastUpdated(fleet.last_updated)}
        </AppText>
      </View>
    </View>
  );
}

const getStatStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      width: "48%",
      minHeight: 84,
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      padding: 14,
      gap: 6,
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

    statGrid: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },

    sectionCard: {
      width: "100%",
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      padding: 18,
      gap: 12,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    sectionTitle: {
      color: colors.text,
      fontWeight: "700",
    },

    note: {
      color: colors.textSecondary,
    },
  });
