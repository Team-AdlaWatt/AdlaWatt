import { Ionicons } from "@expo/vector-icons";

import React, {
  useMemo,
  useState,
} from "react";

import { StyleSheet, View } from "react-native";

import AppText from "@/components/ui/AppText";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { useTranslation } from "react-i18next";

export type NotificationType =
  "normal" | "alert";

export interface NotificationCardData {
  id: string;
  title: string;
  message: string;
  date: string;
  time: string;
  type: NotificationType;
  isRead: boolean;
}

interface NotificationCardProps {
  notification?: NotificationCardData | null;
}

export default function NotificationCard({
  notification,
}: NotificationCardProps) {
  const { t } = useTranslation();
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const safeNotification: NotificationCardData =
    notification ?? {
      id: "unknown",
      title: t("notificationCard.fallbackTitle"),
      message: t("notificationCard.fallbackDetails"),
      date: "",
      time: "",
      type: "normal",
      isRead: true,
    };

  const isAlert =
    safeNotification.type === "alert";

  const iconName: keyof typeof Ionicons.glyphMap =
    isAlert
      ? "alert-circle-outline"
      : "notifications-outline";

  // Themed inks: alert rides error, normal rides the
  // monochrome/green accent so it stays legible on the
  // themed card surface in both modes.
  const iconColor = isAlert
    ? colors.error
    : colors.accentContent;

  const isNew = !safeNotification.isRead;

  const typeLabel = isAlert ? "Alert" : "Normal";

  const hasTimestamp =
    safeNotification.date !== "" ||
    safeNotification.time !== "";

  // Measured width of the date/time line so the footer
  // divider matches it exactly instead of spanning the
  // full content width.
  const [stampWidth, setStampWidth] =
    useState<number | null>(null);

  return (
    <View style={styles.stackContainer}>
      {/* Back layer: solid type color peeked on the left.
          Type signal only — never a newness signal. */}
      <View
        accessible={false}
        style={[
          styles.backLayer,
          {
            backgroundColor: isAlert
              ? colors.error
              : colors.accentContent,
          },
          { pointerEvents: "none" },
        ]}
      />

      {/* Single fill for both states: unread and read cards
          are pixel-identical (surface) and never echo the
          lower back-layer color. Newness is carried by the
          section header + NEW dot + type pill instead. */}
      <View
        style={[
          styles.notificationCard,
          {
            borderColor: isAlert
              ? colors.error
              : colors.accentContent,
          },
        ]}
      >
      <View style={styles.notificationWrapper}>
        {/* Newness dot: unread only, type-colored to match
            the back-layer peek of this card. */}
        {isNew && (
          <View
            style={[
              styles.newDot,
              {
                backgroundColor: isAlert
                  ? colors.error
                  : colors.accentContent,
              },
            ]}
            accessible={false}
          />
        )}

        {/* Notification Icon: carries the type signal
            now that the pill badge is gone. */}
        <Ionicons
          name={iconName}
          size={24}
          color={iconColor}
          accessibilityRole="text"
          accessibilityLabel={
            isNew
              ? `New, Type ${typeLabel}`
              : `Type ${typeLabel}`
          }
        />

        {/* Notification Content: single full-width text
            column — title, message, and footer. No pill,
            no columns, nothing to overlap. */}
        <View style={styles.notificationContent}>
          <AppText
            variant="body"
            style={styles.notificationTitle}
            numberOfLines={2}
          >
            {safeNotification.title}
          </AppText>

          <AppText
            variant="caption"
            style={styles.notificationMessage}
            numberOfLines={3}
          >
            {safeNotification.message}
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
                  style={
                    styles.notificationTimestamp
                  }
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
                  {safeNotification.date}
                  {safeNotification.date &&
                  safeNotification.time
                    ? " • "
                    : ""}
                  {safeNotification.time}
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

  notificationCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
  },

  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  notificationWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  notificationContent: {
    flex: 1,
  },

  notificationTitle: {
    color: colors.text,
    fontWeight: "700",
  },

  notificationMessage: {
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

  notificationTimestamp: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});