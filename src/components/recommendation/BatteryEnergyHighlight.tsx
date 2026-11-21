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
import { BATTERY_USABLE_WH } from "@/constants/battery";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import type { BatteryEnergySnapshot } from "@/services/batteryEnergy";
import type { SelectionEvaluation } from "@/services/recommendationSelection";

type BatteryEnergyHighlightProps = {
  snapshot: BatteryEnergySnapshot;
  evaluation?: SelectionEvaluation | null;
  style?: StyleProp<ViewStyle>;
};

const formatWh = (value: number) =>
  Number.isInteger(value)
    ? value.toString()
    : value.toFixed(1);

const statusIcon = (
  status: BatteryEnergySnapshot["status"],
) =>
  status === "critical"
    ? "alert-circle"
    : status === "warning"
      ? "warning"
      : status === "waiting"
        ? "help-circle-outline"
        : "checkmark-circle";

export default function BatteryEnergyHighlight({
  snapshot,
  evaluation,
  style,
}: BatteryEnergyHighlightProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  const tone =
    snapshot.status === "critical"
      ? colors.error
      : snapshot.status === "warning"
        ? colors.warning
        : snapshot.status === "waiting"
          ? colors.onSurfaceMuted
          : colors.primary;

  const selectedLoad =
    evaluation?.status === "ready"
      ? t("batteryEnergy.selectedLoad", {
          ac: Math.round(evaluation.selectedAcW),
          battery: Math.round(
            evaluation.selectedBatterySideW,
          ),
        })
      : null;

  return (
    <View
      style={[styles.card, style]}
      accessibilityRole="text"
      accessibilityLabel={[
        t("batteryEnergy.title"),
        t("batteryEnergy.value", {
          wh: formatWh(snapshot.usableWh),
        }),
        t(
          `batteryEnergy.status.${snapshot.status}`,
        ),
        t("batteryEnergy.reserve", {
          wh: formatWh(snapshot.reserveWh),
        }),
        selectedLoad,
      ]
        .filter(Boolean)
        .join(". ")}
    >
      <View style={styles.header}>
        <Ionicons
          name={statusIcon(snapshot.status)}
          size={20}
          color={tone}
        />

        <AppText
          variant="caption"
          style={styles.title}
        >
          {t("batteryEnergy.title")}
        </AppText>

        <View
          style={[
            styles.statusChip,
            { backgroundColor: tone },
          ]}
        >
          <AppText
            variant="caption"
            style={styles.statusText}
          >
            {t(
              `batteryEnergy.status.${snapshot.status}`,
            )}
          </AppText>
        </View>
      </View>

      <View style={styles.valueRow}>
        <AppText
          variant="heading"
          style={[styles.value, { color: tone }]}
        >
          {t("batteryEnergy.value", {
            wh: formatWh(snapshot.usableWh),
          })}
        </AppText>

        <AppText
          variant="caption"
          style={styles.ofUsable}
        >
          {t("batteryEnergy.ofUsable", {
            capacity: formatWh(BATTERY_USABLE_WH),
          })}
        </AppText>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(snapshot.usablePercent),
        }}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: tone,
              width: `${Math.min(
                100,
                Math.max(0, snapshot.usablePercent),
              )}%`,
            },
          ]}
        />
      </View>

      <AppText
        variant="caption"
        style={styles.reserve}
      >
        {t("batteryEnergy.reserve", {
          wh: formatWh(snapshot.reserveWh),
        })}
      </AppText>

      {selectedLoad ? (
        <AppText
          variant="caption"
          style={styles.selectedLoad}
        >
          {selectedLoad}
        </AppText>
      ) : null}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.primaryWash,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: 8,
      marginBottom: 14,
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
    statusChip: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },
    valueRow: {
      alignItems: "baseline",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    value: {
      fontSize: 26,
      fontWeight: "800",
    },
    ofUsable: {
      color: colors.onSurfaceMuted,
    },
    track: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 8,
      overflow: "hidden",
      width: "100%",
    },
    fill: {
      borderRadius: 999,
      height: "100%",
    },
    reserve: {
      color: colors.onSurfaceMuted,
    },
    selectedLoad: {
      color: colors.onSurface,
      fontWeight: "600",
    },
  });
