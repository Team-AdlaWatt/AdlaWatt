import { Ionicons } from "@expo/vector-icons";

import React, {
  useMemo,
  useState,
} from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { useTranslation } from "react-i18next";

// ============================================================
// ACTIVITY LOG CARD
//
// Single shared log card used by both the dashboard "Recent
// Activity" block and the dedicated activity logs screen so
// every log entry looks and arranges the same way.
//
// Layout mirrors NotificationCard: a stacked composition with
// a solid type-color back layer peeking on the left and a
// surface front card with a type-colored border. All four
// activity severities keep their own color (info green,
// warning yellow, error/critical red) for the back layer,
// border, and icon.
// ============================================================

export type ActivityLogType =
  | "info"
  | "warning"
  | "error"
  | "critical";

export type ActivityLogItem = {
  id: string;
  type: ActivityLogType;
  title: string;
  details: string;
  date: string;
  time: string;
};

export const ACTIVITY_LOG_GAP = 12;

function getActivityIcon(
  type: ActivityLogType,
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "info":
      return "information-circle-outline";

    case "warning":
      return "warning-outline";

    case "error":
    case "critical":
      return "alert-circle-outline";

    default:
      return "information-circle-outline";
  }
}

function getActivityColor(
  type: ActivityLogType,
  colors: AppColors,
): string {
  switch (type) {
    case "info":
      return colors.accentContent;

    case "warning":
      return colors.secondary;

    case "error":
    case "critical":
      return colors.error;

    default:
      return colors.accentContent;
  }
}

function getActivityLabel(
  type: ActivityLogType,
): string {
  switch (type) {
    case "info":
      return "Info";

    case "warning":
      return "Warning";

    case "error":
      return "Error";

    case "critical":
      return "Critical";

    default:
      return "Info";
  }
}

export default function ActivityLogCard({
  item,
}: {
  item?: ActivityLogItem | null;
}) {
  const { t } = useTranslation();
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const safeItem: ActivityLogItem =
    item ?? {
      id: "unknown",
      type: "info",
      title: t("activityCard.fallbackTitle"),
      details: t("activityCard.fallbackDetails"),
      date: "",
      time: "",
    };

  const color = getActivityColor(
    safeItem.type,
    colors,
  );

  const typeLabel = getActivityLabel(
    safeItem.type,
  );

  const hasTimestamp =
    safeItem.date !== "" ||
    safeItem.time !== "";

  // Measured width of the date/time line so the footer
  // divider matches it exactly instead of spanning the
  // full content width.
  const [stampWidth, setStampWidth] =
    useState<number | null>(null);

  return (
    <View style={styles.stackContainer}>
      {/* Back layer: solid type color peeked on the left. */}
      <View
        accessible={false}
        style={[
          styles.backLayer,
          { backgroundColor: color },
          { pointerEvents: "none" },
        ]}
      />

      <View
        style={[
          styles.activityCard,
          { borderColor: color },
        ]}
      >
        <View style={styles.wrapper}>
          {/* Activity Icon: carries the type signal. */}
          <Ionicons
            name={getActivityIcon(
              safeItem.type,
            )}
            size={24}
            color={color}
            accessibilityRole="text"
            accessibilityLabel={t("activityCard.typeA11y", {
              label: typeLabel,
            })}
          />

          {/* Activity Content: single full-width text
              column — title, details, and footer. */}
          <View style={styles.content}>
            <AppText
              variant="body"
              style={styles.title}
              numberOfLines={2}
            >
              {safeItem.title}
            </AppText>

            <AppText
              variant="caption"
              style={styles.details}
              numberOfLines={3}
            >
              {safeItem.details}
            </AppText>

            {hasTimestamp && (
              <View style={styles.footer}>
                <View
                  style={[
                    styles.divider,
                    stampWidth
                      ? { width: stampWidth }
                      : null,
                  ]}
                  accessible={false}
                />

                <AppText
                  variant="caption"
                  style={styles.timestamp}
                  numberOfLines={1}
                  onLayout={(event) => {
                    const measured = Math.round(
                      event.nativeEvent.layout
                        .width,
                    );

                    setStampWidth((current) =>
                      current === measured
                        ? current
                        : measured,
                    );
                  }}
                >
                  {safeItem.date}
                  {safeItem.date &&
                  safeItem.time
                    ? " • "
                    : ""}
                  {safeItem.time}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
  stackContainer: {
    width: "100%",
    position: "relative",
    paddingLeft: 6,
  },

  backLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    borderRadius: 16,
  },

  activityCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
  },

  wrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  content: {
    flex: 1,
  },

  title: {
    color: colors.text,
    fontWeight: "700",
  },

  details: {
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },

  footer: {
    alignItems: "flex-start",
  },

  timestamp: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
