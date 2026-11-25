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
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import type { BatteryEnergySnapshot } from "@/services/batteryEnergy";
import type { SelectionEvaluation } from "@/services/recommendationSelection";

type BatteryEnergyHighlightProps = {
  snapshot: BatteryEnergySnapshot;
  evaluation?: SelectionEvaluation | null;
  liveNetLoadW?: number | null;
  projectedDrainWh?: number;
  remainingAfterLoadWh?: number | null;
  timeRemainingLabel?: string | null;
  style?: StyleProp<ViewStyle>;
  variant?: "standalone" | "body";
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
  liveNetLoadW = null,
  projectedDrainWh = 0,
  remainingAfterLoadWh = null,
  timeRemainingLabel = null,
  style,
  variant = "standalone",
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

  const fillColor =
    snapshot.status === "waiting"
      ? colors.onSurfaceMuted
      : colors.primary;

  const usableCapacity = Math.max(
    snapshot.usableCapacityWh,
    1,
  );

  const projectedDrain = Math.max(
    0,
    Math.min(projectedDrainWh, snapshot.usableWh),
  );
  const remainingAfterLoad = Math.max(
    0,
    Math.min(
      remainingAfterLoadWh ?? snapshot.usableWh,
      snapshot.usableWh,
    ),
  );
  const projectedDrainPercent = Math.min(
    100,
    Math.max(
      0,
      (projectedDrain / usableCapacity) * 100,
    ),
  );
  const remainingPercent = Math.min(
    100,
    Math.max(
      0,
      (remainingAfterLoad / usableCapacity) * 100,
    ),
  );

  const liveDrawLabel =
    liveNetLoadW !== null
      ? t("batteryEnergy.liveDraw", {
          watts: Math.round(liveNetLoadW),
        })
      : null;
  const timeRemainingText = timeRemainingLabel
    ? t("batteryEnergy.timeRemaining", {
        time: timeRemainingLabel,
      })
    : null;

  const isBody = variant === "body";

  return (
    <View
      style={[
        isBody ? styles.body : styles.card,
        style,
      ]}
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
        liveDrawLabel,
        timeRemainingText,
      ]
        .filter(Boolean)
        .join(". ")}
    >
      {isBody ? (
        <View style={styles.statusRow}>
          <Ionicons
            name={statusIcon(snapshot.status)}
            size={18}
            color={tone}
          />

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
      ) : (
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
      )}

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
            capacity: formatWh(snapshot.usableCapacityWh),
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
              backgroundColor: fillColor,
              width: `${remainingPercent}%`,
            },
          ]}
        />

        {projectedDrainPercent > 0 ? (
          <View
            style={[
              styles.fill,
              styles.loadFill,
              {
                backgroundColor: colors.error,
                width: `${projectedDrainPercent}%`,
              },
            ]}
          />
        ) : null}
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

      {liveDrawLabel ? (
        <AppText
          variant="caption"
          style={styles.loadDetail}
        >
          {liveDrawLabel}
        </AppText>
      ) : null}

      {timeRemainingText ? (
        <AppText
          variant="caption"
          style={styles.loadDetail}
        >
          {timeRemainingText}
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
    body: {
      gap: 8,
      padding: 14,
    },
    statusRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
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
    loadFill: {
      left: 0,
      position: "absolute",
      top: 0,
    },
    loadDetail: {
      color: colors.onSurface,
      fontWeight: "600",
    },
    reserve: {
      color: colors.onSurfaceMuted,
    },
    selectedLoad: {
      color: colors.onSurface,
      fontWeight: "600",
    },
  });
