import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  ADMIN_HOUSEHOLDS,
  countByBand,
} from "@/admin/mockData";

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

  const households = ADMIN_HOUSEHOLDS;
  const bandCounts = countByBand(households);
  const totalSolar = households.reduce(
    (sum, household) => sum + household.solarKwhPerDay,
    0,
  );
  const totalLoad = households.reduce(
    (sum, household) => sum + household.loadKwhPerDay,
    0,
  );
  const unsafeCount = households.filter(
    (household) => household.batteryHealth <= 20,
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <AppText variant="title" style={styles.headerTitle}>
          Reports
        </AppText>

        <AppText variant="caption" style={styles.headerSub}>
          Fleet aggregates and pseudonymous per-household summary.
        </AppText>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          label="Households"
          value={String(households.length)}
          colors={colors}
        />

        <StatCard
          label="Solar / day"
          value={`${totalSolar.toFixed(1)} kWh`}
          colors={colors}
        />

        <StatCard
          label="Load / day"
          value={`${totalLoad.toFixed(1)} kWh`}
          colors={colors}
        />

        <StatCard
          label="Unsafe battery"
          value={String(unsafeCount)}
          colors={colors}
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name="pie-chart-outline"
            size={20}
            color={colors.primary}
          />

          <AppText variant="body" style={styles.sectionTitle}>
            Battery health bands
          </AppText>
        </View>

        {Object.entries(bandCounts).map(([band, count]) => (
          <View key={band} style={styles.bandRow}>
            <AppText variant="caption" style={styles.bandLabel}>
              {band}%
            </AppText>

            <View style={styles.bandTrack}>
              <View
                style={[
                  styles.bandFill,
                  {
                    width: `${(count / households.length) * 100}%`,
                  },
                ]}
              />
            </View>

            <AppText variant="caption" style={styles.bandValue}>
              {count}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name="list-outline"
            size={20}
            color={colors.primary}
          />

          <AppText variant="body" style={styles.sectionTitle}>
            Per-household summary
          </AppText>
        </View>

        <View style={styles.list}>
          {households.map((household) => (
            <View key={household.alias} style={styles.summaryRow}>
              <View style={styles.summaryBody}>
                <AppText variant="body" style={styles.summaryTitle}>
                  {household.alias}
                </AppText>

                <AppText variant="caption" style={styles.summaryMeta}>
                  Battery {household.batteryHealth}% · Solar{" "}
                  {household.solarKwhPerDay.toFixed(1)} · Load{" "}
                  {household.loadKwhPerDay.toFixed(1)} kWh/day
                </AppText>
              </View>

              <AppText variant="caption" style={styles.summaryBand}>
                {household.band}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <AppText variant="caption" style={styles.note}>
        Aggregates and pseudonymous summaries only. No raw rows,
        activity logs, or personal identifiers are shown.
      </AppText>
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

    bandRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    bandLabel: {
      width: 64,
      color: colors.text,
      fontWeight: "600",
    },

    bandTrack: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.border,
      overflow: "hidden",
    },

    bandFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: colors.primary,
      minWidth: 2,
    },

    bandValue: {
      width: 32,
      textAlign: "right",
      color: colors.text,
      fontWeight: "700",
    },

    list: {
      width: "100%",
      gap: 10,
    },

    summaryRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    summaryBody: {
      flex: 1,
      gap: 2,
    },

    summaryTitle: {
      color: colors.text,
      fontWeight: "700",
    },

    summaryMeta: {
      color: colors.textSecondary,
    },

    summaryBand: {
      color: colors.primary,
      fontWeight: "700",
    },

    note: {
      color: colors.textSecondary,
      textAlign: "center",
    },
  });
