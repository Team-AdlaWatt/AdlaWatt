import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  getAdminFleetHealth,
  type AdminFleetHealth,
} from "@/services/adminService";

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

export default function AdminUsersTab() {
  const colors = useAppColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [fleet, setFleet] = useState<AdminFleetHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          {error || "No user data available"}
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

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <AppText variant="title" style={styles.headerTitle}>
          Users
        </AppText>

        <AppText variant="caption" style={styles.headerSub}>
          {fleet.device_count} households connected. Pseudonymous
          fleet aggregates only.
        </AppText>
      </View>

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
          value={
            fleet.avg_battery == null
              ? "—"
              : `${Math.round(fleet.avg_battery)}%`
          }
          colors={colors}
        />

        <DetailRow
          label="Avg voltage"
          value={
            fleet.avg_voltage == null
              ? "—"
              : `${fleet.avg_voltage.toFixed(2)} V`
          }
          colors={colors}
        />

        <DetailRow
          label="Unsafe battery"
          value={String(fleet.low_battery_count)}
          colors={colors}
        />

        <DetailRow
          label="Last updated"
          value={
            fleet.last_updated
              ? new Date(fleet.last_updated).toLocaleString()
              : "—"
          }
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
