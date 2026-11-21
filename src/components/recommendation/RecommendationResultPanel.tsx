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
import type { SelectionEvaluation } from "@/services/recommendationSelection";

import RecommendationAlternativeRow from "./RecommendationAlternativeRow";
import RecommendationBadge from "./RecommendationBadge";

type RecommendationResultPanelProps = {
  result: SelectionEvaluation;
  style?: StyleProp<ViewStyle>;
};

export default function RecommendationResultPanel({
  result,
  style,
}: RecommendationResultPanelProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  const statusTitle = t(
    `recommendationResult.status.${result.status}`,
  );
  const reasonText = t(
    `recommendationResult.reason.${result.reasonKey}`,
  );

  const metrics =
    result.status === "ready"
      ? [
          {
            key: "remaining",
            label: t(
              "recommendationResult.remainingBattery",
            ),
            value: `${result.remainingPercent ?? 0}%`,
          },
          {
            key: "runtime",
            label: t(
              "recommendationResult.estimatedRuntime",
            ),
            value: result.runtimeLabel,
          },
          {
            key: "peak",
            label: t(
              "recommendationResult.combinedPeak",
            ),
            value: `${Math.round(result.combinedPeakWatts)}W`,
          },
          {
            key: "load",
            label: t(
              "recommendationResult.currentLoad",
            ),
            value: `${Math.round(result.currentLoadW)}W`,
          },
        ]
      : [];

  return (
    <View
      style={[styles.card, style]}
      accessibilityRole="text"
      accessibilityLabel={`${statusTitle}. ${reasonText}`}
    >
      <View style={styles.header}>
        <AppText
          variant="heading"
          style={styles.title}
        >
          {t("recommendationResult.title")}
        </AppText>

        <RecommendationBadge
          verdict={result.verdict}
          compact
        />
      </View>

      <AppText
        variant="body"
        style={styles.statusTitle}
      >
        {statusTitle}
      </AppText>

      <AppText
        variant="body"
        style={styles.reason}
      >
        {reasonText}
      </AppText>

      {metrics.length > 0 ? (
        <View style={styles.metrics}>
          {metrics.map((metric) => (
            <View
              key={metric.key}
              style={styles.metric}
            >
              <AppText
                variant="caption"
                style={styles.metricLabel}
              >
                {metric.label}
              </AppText>

              <AppText
                variant="body"
                style={styles.metricValue}
              >
                {metric.value}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {result.alternatives.length > 0 ? (
        <View style={styles.alternatives}>
          <AppText
            variant="body"
            style={styles.alternativesTitle}
          >
            {t(
              "recommendationResult.alternativesTitle",
            )}
          </AppText>

          {result.alternatives.map((alternative) => (
            <RecommendationAlternativeRow
              key={alternative.id}
              alternative={alternative}
            />
          ))}
        </View>
      ) : null}

      {result.status === "ready" &&
      result.verdict !== "recommended" &&
      result.alternatives.length === 0 ? (
        <AppText
          variant="caption"
          style={styles.reason}
        >
          {t(
            "recommendationResult.noAlternatives",
          )}
        </AppText>
      ) : null}

      <AppText
        variant="caption"
        style={styles.note}
      >
        {t("recommendationResult.estimateNote")}
      </AppText>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 12,
      padding: 16,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    title: {
      color: colors.onSurface,
      flexShrink: 1,
      fontSize: 18,
    },
    statusTitle: {
      color: colors.onSurface,
      fontWeight: "600",
    },
    reason: {
      color: colors.onSurfaceMuted,
    },
    metrics: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    metric: {
      backgroundColor: colors.primaryWash,
      borderRadius: 12,
      flexGrow: 1,
      minWidth: 140,
      padding: 12,
    },
    metricLabel: {
      color: colors.onSurfaceMuted,
    },
    metricValue: {
      color: colors.onSurface,
      fontSize: 16,
      fontWeight: "700",
      marginTop: 4,
    },
    alternatives: {
      gap: 8,
    },
    alternativesTitle: {
      color: colors.onSurface,
      fontWeight: "600",
    },
    note: {
      color: colors.onSurfaceMuted,
      lineHeight: 16,
    },
  });
