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

export default function AdminReportsTab() {
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
          {error || "No report data available"}
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

  const totalSolarKwh = fleet.total_solar_wh_24h / 1000;

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <AppText variant="title" style={styles.headerTitle}>
          Reports
        </AppText>

        <AppText variant="caption" style={styles.headerSub}>
          Fleet aggregates from the last 24 hours.
        </AppText>
      </View>

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
          value={`${totalSolarKwh.toFixed(1)} kWh`}
          colors={colors}
        />

        <StatCard
          label="Unsafe battery"
          value={String(fleet.low_battery_count)}
          colors={colors}
        />

        <StatCard
          label="Avg battery"
          value={
            fleet.avg_battery == null
              ? "—"
              : `${Math.round(fleet.avg_battery)}%`
          }
          colors={colors}
        />

        <StatCard
          label="Avg voltage"
          value={
            fleet.avg_voltage == null
              ? "—"
              : `${fleet.avg_voltage.toFixed(2)} V`
          }
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
          updated:{" "}
          {fleet.last_updated
            ? new Date(fleet.last_updated).toLocaleString()
            : "—"}
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
