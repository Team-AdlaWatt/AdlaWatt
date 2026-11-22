import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  ChartFrequency,
  FREQUENCIES,
} from "@/services/analyticsService";
import {
  SlidingToggle,
} from "@/components/ui/SlidingToggle";

/* ============================================================
   PROPS
   ============================================================ */

export interface AnalyticsChartCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  frequency?: ChartFrequency;
  onFrequencyChange?: (
    frequency: ChartFrequency,
  ) => void;
  children: React.ReactNode;
}

/* ============================================================
   CARD
   ============================================================ */

export default function AnalyticsChartCard({
  title,
  subtitle,
  icon,
  frequency,
  onFrequencyChange,
  children,
}: AnalyticsChartCardProps) {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <View style={styles.card}>
      {/* Header / Accent Panel */}
      <View
        style={
          styles.headerPanel
        }
      >
        <Ionicons
          name={icon}
          size={26}
          color={colors.headerContent}
        />

        <AppText
          variant="heading"
          style={
            styles.headerTitle
          }
        >
          {title}
        </AppText>
      </View>

      {/* Body */}
      <View
        style={
          styles.body
        }
      >
        <AppText
          variant="caption"
          style={
            styles.subtitle
          }
        >
          {subtitle}
        </AppText>

        {/* Frequency (optional — omitted for range-total charts
            like Battery Activity where grouping is invariant) */}
        {frequency && onFrequencyChange ? (
          <SlidingToggle<ChartFrequency>
            value={frequency}
            onChange={onFrequencyChange}
            style={styles.frequencyToggleColors}
            options={FREQUENCIES.map(
              (option) => ({
                value: option,
                label: option,
                activeColor: colors.primary,
                accessibilityLabel:
                  `${title} ${option} view`,
              }),
            )}
          />
        ) : null}

        {/* Chart Area */}
        <View
          style={
            styles.chartArea
          }
        >
          {children}
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      width: "100%",
      backgroundColor:
        colors.glass.white,
      borderWidth: 3,
      borderColor:
        colors.cardBorder,
      borderRadius: 15,
      flexDirection: "column",
      alignItems: "stretch",
      overflow: "hidden",
      marginBottom: 18,
    },

    headerPanel: {
      width: "100%",
      backgroundColor:
        colors.headerBackground,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 9,
    },

    headerTitle: {
      color: colors.headerContent,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
      flexShrink: 1,
    },

    body: {
      padding: 16,
    },

    subtitle: {
      color:
        colors.textSecondary,
      lineHeight: 19,
      marginBottom: 12,
    },

    frequencyToggleColors: {
      width: "100%",
      backgroundColor:
        colors.scrimFaint,
      borderColor:
        colors.border,
      borderRadius: 12,
      marginBottom: 14,
    },

    chartArea: {
      width: "100%",
      alignItems: "stretch",
    },

    pressed: {
      opacity: 0.7,
    },
  });