import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

export type SolarStatus = "Low" | "Moderate" | "High";

export interface Card1Props {
  solarStatus?: SolarStatus;
  solarTimer?: string;
  solarInput?: number | string;
  solarVoltage?: number | string;
  solarCurrent?: number | string;
  totalEnergy?: number | string;
  loading?: boolean;
}

interface MetricCellProps {
  label: string;
  value: string;
  badge?: string;
  badgeStyle?: object;
  badgeTextStyle?: object;
}

export default function Card1({
  solarStatus = "Low",
  solarTimer = "00:00:00",
  solarInput = 0,
  solarVoltage = 0,
  solarCurrent = 0,
  totalEnergy = 0,
  loading = false,
}: Card1Props) {
  const colors = useAppColors();
  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );
  const displayValue = (
    value: number | string,
    unit: string,
  ) => (loading ? "—" : `${value}${unit}`);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="sunny-outline"
            size={36}
            color={colors.headerContent}
          />
          <AppText
            variant="heading"
            style={styles.headerTitle}
          >
            Solar Monitoring
          </AppText>
        </View>

        <View style={styles.timer}>
          <AppText
            variant="caption"
            style={styles.timerLabel}
          >
            Timer
          </AppText>
          <AppText
            variant="heading"
            style={styles.timerValue}
          >
            {loading ? "—" : solarTimer}
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.row}>
          <MetricCell
            styles={styles}
            label="Solar Input"
            value={displayValue(solarInput, "W")}
            badge={solarStatus}
            badgeStyle={getSolarBadgeStyle(solarStatus, styles)}
            badgeTextStyle={getSolarBadgeTextStyle(solarStatus, styles)}
          />
          <MetricCell
            styles={styles}
            label="Voltage"
            value={displayValue(solarVoltage, "V")}
          />
        </View>

        <View style={styles.row}>
          <MetricCell
            styles={styles}
            label="Current"
            value={displayValue(solarCurrent, "A")}
          />
          <MetricCell
            styles={styles}
            label="Total Energy"
            value={displayValue(totalEnergy, "Wh")}
          />
        </View>
      </View>
    </View>
  );
}

function MetricCell({
  styles,
  label,
  value,
  badge,
  badgeStyle,
  badgeTextStyle,
}: MetricCellProps & { styles: ReturnType<typeof getStyles> }) {
  return (
    <View style={styles.metricCell}>
      <AppText
        variant="caption"
        style={styles.metricLabel}
      >
        {label}
      </AppText>

      <AppText
        variant="heading"
        style={styles.metricValue}
      >
        {value}
      </AppText>

      <View style={styles.statusSlot}>
        {badge && (
          <View
            style={[
              styles.statusBadge,
              badgeStyle,
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.statusBadgeText,
                badgeTextStyle,
              ]}
            >
              {badge}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

function getSolarBadgeStyle(status: SolarStatus, styles: ReturnType<typeof getStyles>) {
  switch (status) {
    case "High":
      return styles.highBadge;
    case "Moderate":
      return styles.moderateBadge;
    case "Low":
    default:
      return styles.lowBadge;
  }
}

function getSolarBadgeTextStyle(status: SolarStatus, styles: ReturnType<typeof getStyles>) {
  return status === "Moderate"
    ? styles.darkBadgeText
    : styles.lightBadgeText;
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
  card: {
    width: "100%",
    minHeight: 300,
    backgroundColor: colors.glass.white,
    borderWidth: 3,
    borderColor: colors.cardBorder,
    borderRadius: 15,
    overflow: "hidden",
  },

  header: {
    width: "100%",
    minHeight: 30,
    backgroundColor: colors.headerBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },

  headerTitle: {
    color: colors.headerContent,
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 10,
    flexShrink: 1,
  },

  timer: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 92,
  },

  timerLabel: {
    color: colors.headerContent,
    fontSize: 13,
    lineHeight: 16,
  },

  timerValue: {
    color: colors.headerContent,
    fontSize: 19,
    fontWeight: "600",
    lineHeight: 23,
    textAlign: "right",
  },

  grid: {
    width: "100%",
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  row: {
    width: "100%",
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },

  metricCell: {
    width: "50%",
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },

  metricLabel: {
    color: colors.text,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 21,
    flexShrink: 1,
  },

  metricValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 30,
    flexShrink: 1,
  },

  statusSlot: {
    minHeight: 25,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 42,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
  },

  highBadge: {
    backgroundColor: colors.primary,
  },

  moderateBadge: {
    backgroundColor: colors.secondary,
  },

  lowBadge: {
    backgroundColor: colors.error,
  },

  lightBadgeText: {
    color: colors.onPrimary,
  },

  darkBadgeText: {
    color: colors.text,
  },
});
