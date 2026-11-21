import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "@/components/ui/AppText";
import { BATTERY_MAX_ELECTRONICS_W } from "@/constants/battery";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import type { BatteryEnergySnapshot } from "@/services/batteryEnergy";
import type { SelectionEvaluation } from "@/services/recommendationSelection";

type BatteryEnergyBarProps = {
  energy: BatteryEnergySnapshot;
  evaluation: SelectionEvaluation;
  style?: StyleProp<ViewStyle>;
};

export default function BatteryEnergyBar({
  energy,
  evaluation,
  style,
}: BatteryEnergyBarProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  const ready =
    evaluation.status === "ready";

  const selectedBatterySideW = ready
    ? evaluation.selectedBatterySideW
    : 0;

  const loadPercent = Math.min(
    100,
    Math.max(
      0,
      (selectedBatterySideW /
        BATTERY_MAX_ELECTRONICS_W) *
        100,
    ),
  );

  const tone =
    evaluation.verdict === "notRecommended"
      ? colors.error
      : evaluation.verdict === "care"
        ? colors.warning
        : colors.primary;

  return (
    <View
      style={[styles.card, style]}
      accessibilityRole="text"
      accessibilityLabel={`${t("batteryEnergy.title")}: ${Math.round(energy.usableWh)} Wh. ${t("recommendationResult.estimatedRuntime")}: ${evaluation.runtimeLabel}.`}
    >
      <View style={styles.header}>
        <Ionicons
          name="battery-charging-outline"
          size={20}
          color={colors.primary}
        />

        <AppText
          variant="caption"
          style={styles.title}
        >
          {t("batteryEnergy.title")}
        </AppText>

        <AppText
          variant="body"
          style={styles.runtime}
        >
          {evaluation.runtimeLabel}
        </AppText>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: BATTERY_MAX_ELECTRONICS_W,
          now: Math.round(selectedBatterySideW),
        }}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: tone,
              width: `${loadPercent}%`,
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <AppText
          variant="caption"
          style={styles.footerText}
        >
          {t(
            "batteryEnergy.selectedLoad",
            {
              ac: Math.round(
                evaluation.selectedAcW,
              ),
              battery: Math.round(
                selectedBatterySideW,
              ),
            },
          )}
        </AppText>

        <AppText
          variant="caption"
          style={styles.footerText}
        >
          {t("batteryEnergy.ofUsable", {
            capacity: Math.round(energy.usableWh),
          })}
        </AppText>
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: 10,
      padding: 14,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    title: {
      color: colors.onSurface,
      flex: 1,
      fontWeight: "600",
    },
    runtime: {
      color: colors.onSurface,
      fontWeight: "700",
    },
    track: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 10,
      overflow: "hidden",
    },
    fill: {
      borderRadius: 999,
      height: "100%",
    },
    footer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between",
    },
    footerText: {
      color: colors.onSurfaceMuted,
    },
  });
