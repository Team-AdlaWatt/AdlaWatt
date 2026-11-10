import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";

import AnalyticsChartCard from "@/components/AnalyticsChartCard";
import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { SlidingToggle } from "@/components/ui/SlidingToggle";
import {
  ADMIN_HOUSEHOLDS,
  BATTERY_HEALTH_BANDS,
  countByBand,
} from "@/admin/mockData";

type EnergyMode = "solar" | "load";

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
  const [mode, setMode] = useState<EnergyMode>("solar");

  const styles = useMemo(() => getStyles(colors), [colors]);

  const households = ADMIN_HOUSEHOLDS;
  const totalHouseholds = households.length;
  const bandCounts = countByBand(households);
  const totalSolar = households.reduce(
    (sum, household) => sum + household.solarKwhPerDay,
    0,
  );
  const totalLoad = households.reduce(
    (sum, household) => sum + household.loadKwhPerDay,
    0,
  );
  const averageBattery =
    households.reduce(
      (sum, household) => sum + household.batteryHealth,
      0,
    ) / totalHouseholds;

  const pieColors = [
    colors.error,
    colors.warning,
    colors.primarySoft,
    colors.primary,
  ];

  const pieData = BATTERY_HEALTH_BANDS.map((band, index) => ({
    value: bandCounts[band],
    color: pieColors[index],
    text: band,
  }));

  const barMax = Math.max(
    ...households.map((household) =>
      mode === "solar"
        ? household.solarKwhPerDay
        : household.loadKwhPerDay,
    ),
    1,
  );

  const toggleOptions = [
    {
      value: "solar" as EnergyMode,
      label: "Solar",
      activeColor: colors.warning,
      accessibilityLabel: "Show solar energy",
    },
    {
      value: "load" as EnergyMode,
      label: "Load",
      activeColor: colors.primary,
      accessibilityLabel: "Show load energy",
    },
  ];

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
          value={String(totalHouseholds)}
          icon="people"
          colors={colors}
        />

        <KpiCard
          label="Avg battery"
          value={`${Math.round(averageBattery)}%`}
          icon="battery-half-outline"
          colors={colors}
        />

        <KpiCard
          label="Solar / day"
          value={`${totalSolar.toFixed(1)} kWh`}
          icon="sunny-outline"
          colors={colors}
        />

        <KpiCard
          label="Load / day"
          value={`${totalLoad.toFixed(1)} kWh`}
          icon="flash-outline"
          colors={colors}
        />
      </View>

      <AnalyticsChartCard
        title="Battery Health"
        subtitle="Households by battery health band."
        icon="battery-half-outline"
      >
        <View style={styles.chartBody}>
          <View style={styles.donutWrap}>
            <PieChart
              data={pieData}
              donut
              radius={82}
              innerRadius={52}
              strokeWidth={2}
              strokeColor={colors.background}
              backgroundColor="transparent"
              innerCircleColor={colors.isDark ? "#252525" : "white"}
              showText={false}
              isAnimated={false}
              centerLabelComponent={() => (
                <View style={styles.centerLabel}>
                  <AppText variant="heading" style={styles.centerValue}>
                    {totalHouseholds}
                  </AppText>

                  <AppText variant="caption" style={styles.centerCaption}>
                    homes
                  </AppText>
                </View>
              )}
            />
          </View>

          <View style={styles.legend}>
            {BATTERY_HEALTH_BANDS.map((band, index) => (
              <View key={band} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: pieColors[index] },
                  ]}
                />

                <AppText variant="caption" style={styles.legendText}>
                  {band}% ({bandCounts[band]})
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </AnalyticsChartCard>

      <AnalyticsChartCard
        title="Fleet Energy / Day"
        subtitle="Solar or load energy by household."
        icon="flash-outline"
      >
        <View style={styles.chartBody}>
          <SlidingToggle<EnergyMode>
            options={toggleOptions}
            value={mode}
            onChange={setMode}
          />

          <View style={styles.barList}>
            {households.map((household) => {
              const value =
                mode === "solar"
                  ? household.solarKwhPerDay
                  : household.loadKwhPerDay;

              return (
                <View key={household.alias} style={styles.barRow}>
                  <AppText variant="caption" style={styles.barLabel}>
                    {household.alias}
                  </AppText>

                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${(value / barMax) * 100}%`,
                          backgroundColor:
                            mode === "solar"
                              ? colors.warning
                              : colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <AppText variant="caption" style={styles.barValue}>
                    {value.toFixed(1)}
                  </AppText>
                </View>
              );
            })}
          </View>
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

    donutWrap: {
      alignItems: "center",
      justifyContent: "center",
    },

    centerLabel: {
      alignItems: "center",
      justifyContent: "center",
    },

    centerValue: {
      color: colors.text,
      fontWeight: "700",
    },

    centerCaption: {
      color: colors.textSecondary,
    },

    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
    },

    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    legendSwatch: {
      width: 14,
      height: 14,
      borderRadius: 4,
    },

    legendText: {
      color: colors.textSecondary,
      fontWeight: "600",
    },

    barList: {
      width: "100%",
      gap: 10,
    },

    barRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    barLabel: {
      width: 118,
      color: colors.text,
      fontWeight: "600",
    },

    barTrack: {
      flex: 1,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.border,
      overflow: "hidden",
    },

    barFill: {
      height: "100%",
      borderRadius: 6,
      minWidth: 2,
    },

    barValue: {
      width: 42,
      textAlign: "right",
      color: colors.text,
      fontWeight: "700",
    },
  });
