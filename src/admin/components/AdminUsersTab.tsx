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
  formatVoltage,
} from "@/admin/format";
import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: AppColors;
}) {
  const styles = useMemo(() => getDetailStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>

      <AppText variant="body" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

export default function AdminUsersTab({
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
        message={error || "No user data available"}
        onRetry={onRetry}
      />
    );
  }

  if (fleet.device_count === 0) {
    return (
      <EmptyState
        icon="people-outline"
        title="No users yet"
        description="No households are connected yet. Fleet aggregates will appear once devices come online."
      />
    );
  }

  return (
    <View style={styles.container}>
      <AdminTabHeader
        title="Users"
        subtitle={`${fleet.device_count} households connected. Pseudonymous fleet aggregates only.`}
      />

      <View style={styles.detailCard}>
        <DetailRow
          label="Households"
          value={String(fleet.device_count)}
          colors={colors}
        />

        <DetailRow
          label="Online now"
          value={String(fleet.online_count)}
          colors={colors}
        />

        <DetailRow
          label="Avg battery"
          value={formatBatteryPercent(fleet.avg_battery)}
          colors={colors}
        />

        <DetailRow
          label="Avg voltage"
          value={formatVoltage(fleet.avg_voltage)}
          colors={colors}
        />

        <DetailRow
          label="Unsafe battery"
          value={String(fleet.low_battery_count)}
          colors={colors}
        />

        <DetailRow
          label="Last updated"
          value={formatLastUpdated(fleet.last_updated)}
          colors={colors}
        />
      </View>

      <AppText variant="caption" style={styles.note}>
        Household-level detail is intentionally withheld. Only
        fleet-wide, pseudonymous aggregates are shown.
      </AppText>
    </View>
  );
}

const getDetailStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      width: "100%",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 4,
    },

    label: {
      color: colors.textSecondary,
      fontWeight: "600",
    },

    value: {
      color: colors.text,
      fontWeight: "600",
    },
  });

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      width: "100%",
      gap: 18,
    },

    detailCard: {
      width: "100%",
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      paddingHorizontal: 18,
      paddingVertical: 6,
    },

    note: {
      color: colors.textSecondary,
      textAlign: "center",
    },
  });
