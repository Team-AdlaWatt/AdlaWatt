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
import type { AdminFleetUser } from "@/services/adminService";

// Users tab owns one extra prop over the shared tab contract:
// the pseudonymized household rows from get_admin_fleet_users().
export interface AdminUsersTabProps extends AdminTabDataProps {
  users: AdminFleetUser[] | null;
}

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

function OnlineBadge({
  isOnline,
  colors,
}: {
  isOnline: boolean;
  colors: AppColors;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.badge,
        isOnline ? styles.badgeOnline : styles.badgeOffline,
      ]}
    >
      <AppText
        variant="caption"
        style={
          isOnline
            ? styles.badgeOnlineText
            : styles.badgeOfflineText
        }
      >
        {isOnline ? "Online" : "Offline"}
      </AppText>
    </View>
  );
}

function HouseholdCard({
  user,
  colors,
}: {
  user: AdminFleetUser;
  colors: AppColors;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.detailCard}>
      <View style={styles.householdHeader}>
        <AppText variant="body" style={styles.householdName}>
          {user.pseudonym}
        </AppText>

        <OnlineBadge isOnline={user.is_online} colors={colors} />
      </View>

      <DetailRow
        label="Avg battery"
        value={formatBatteryPercent(user.avg_battery)}
        colors={colors}
      />

      <DetailRow
        label="Avg voltage"
        value={formatVoltage(user.avg_voltage)}
        colors={colors}
      />

      <DetailRow
        label="Solar / 24h"
        value={formatSolarKwh(user.solar_wh_24h)}
        colors={colors}
      />

      <DetailRow
        label="Unsafe battery"
        value={String(user.low_battery_count)}
        colors={colors}
      />

      <DetailRow
        label="Last updated"
        value={formatLastUpdated(user.last_updated)}
        colors={colors}
      />
    </View>
  );
}

export default function AdminUsersTab({
  fleet,
  users,
  loading,
  error,
  onRetry,
}: AdminUsersTabProps) {
  const colors = useAppColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (loading) {
    return <AdminTabLoading />;
  }

  if (!fleet || !users) {
    return (
      <AdminTabError
        message={error || "No user data available"}
        onRetry={onRetry}
      />
    );
  }

  if (fleet.device_count === 0 || users.length === 0) {
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

      {users.map((user) => (
        <HouseholdCard
          key={user.pseudonym}
          user={user}
          colors={colors}
        />
      ))}

      <AppText variant="caption" style={styles.note}>
        Households are listed under sequential pseudonyms
        assigned by first-seen order. Usernames, emails, and raw
        readings never leave the server.
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

    householdHeader: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingTop: 12,
      paddingBottom: 4,
    },

    householdName: {
      color: colors.text,
      fontWeight: "700",
    },

    badge: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
    },

    badgeOnline: {
      backgroundColor: colors.primaryWash,
      borderColor: colors.primarySoft,
    },

    badgeOffline: {
      backgroundColor: colors.scrimFaint,
      borderColor: colors.border,
    },

    badgeOnlineText: {
      color: colors.primaryText,
      fontWeight: "700",
    },

    badgeOfflineText: {
      color: colors.textSecondary,
      fontWeight: "700",
    },

    note: {
      color: colors.textSecondary,
      textAlign: "center",
    },
  });
