import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "@/components/ui/AppText";
import { Colors } from "@/constants/colors";
import { useAppColors } from "@/hooks/useAppColors";
import type { Verdict } from "@/services/recommendation";

type BadgeKey = Verdict | "unknown";

type BadgeProps = {
  verdict: Verdict | null;
  compact?: boolean;
};

const ICONS: Record<
  BadgeKey,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  recommended: "checkmark-circle-outline",
  care: "warning-outline",
  notRecommended: "alert-circle-outline",
  unknown: "time-outline",
};

export default function RecommendationBadge({
  verdict,
  compact = false,
}: BadgeProps) {
  const { t } = useTranslation();
  const colors = useAppColors();

  const key: BadgeKey = verdict ?? "unknown";
  const label = t(
    `recommendationResult.verdict.${key}`,
  );

  const palette =
    key === "recommended"
      ? {
          background: colors.primary,
          ink: colors.onPrimary,
          border: colors.primary,
        }
      : key === "care"
        ? {
            background: colors.warning,
            ink: Colors.dark.background,
            border: colors.warning,
          }
        : key === "notRecommended"
          ? {
              background: colors.error,
              ink: colors.onPrimary,
              border: colors.error,
            }
          : {
              background: colors.elevated,
              ink: colors.onSurfaceMuted,
              border: colors.border,
            };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        compact && styles.compact,
      ]}
      accessibilityRole="text"
      accessibilityLabel={t(
        "recommendationResult.badgeA11y",
        { label },
      )}
    >
      <Ionicons
        name={ICONS[key]}
        size={compact ? 14 : 16}
        color={palette.ink}
      />

      <AppText
        variant="caption"
        style={[styles.text, { color: palette.ink }]}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compact: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontWeight: "600",
  },
});
