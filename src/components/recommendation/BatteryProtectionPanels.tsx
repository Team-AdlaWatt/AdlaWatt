import { Ionicons } from "@expo/vector-icons";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "@/components/ui/AppText";
import {
  useCriticalWarning,
} from "@/context/CriticalWarningContext";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Touch } from "@/constants/sizing";
import type { ProtectionState } from "@/services/batteryProtection";

type BatteryProtectionPanelsProps = {
  protection: ProtectionState;
  usableWh: number;
  usablePercent: number;
  onReview?: () => void;
  onCriticalReview?: () => void;
};

type BannerProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction?: () => void;
  onDismiss: () => void;
  styles: ReturnType<typeof createStyles>;
};

function ProtectionBanner({
  icon,
  tone,
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
  styles,
}: BannerProps) {
  return (
    <View
      style={[
        styles.banner,
        { borderLeftColor: tone },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons
        name={icon}
        size={22}
        color={tone}
      />

      <View style={styles.bannerText}>
        <AppText
          variant="body"
          style={styles.bannerTitle}
        >
          {title}
        </AppText>

        <AppText
          variant="caption"
          style={styles.bannerBody}
        >
          {body}
        </AppText>
      </View>

      {onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.bannerButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={6}
        >
          <Ionicons
            name="arrow-forward-circle-outline"
            size={24}
            color={tone}
          />
        </Pressable>
      ) : null}

      <Pressable
        onPress={onDismiss}
        style={styles.dismissButton}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={6}
      >
        <Ionicons
          name="close-outline"
          size={22}
          color={tone}
        />
      </Pressable>
    </View>
  );
}

export default function BatteryProtectionPanels({
  protection,
  usableWh,
  usablePercent,
  onReview,
  onCriticalReview,
}: BatteryProtectionPanelsProps) {
  const { t } = useTranslation();
  const { active: criticalActive, recovering } =
    useCriticalWarning();
  const colors = useAppColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );
  const [dismissedKey, setDismissedKey] =
    useState<string | null>(null);

  const critical =
    protection.level === "critical";

  const warning =
    protection.level === "warning";

  const newLoadDeltaW =
    protection.newLoadDeltaW;

  const warningKey = warning
    ? `warning:${Math.round(usableWh)}:${protection.reasons.join(",")}`
    : null;

  const newLoadKey =
    newLoadDeltaW > 0
      ? `newLoad:${Math.round(newLoadDeltaW)}`
      : null;

  useEffect(() => {
    if (critical) {
      AccessibilityInfo.announceForAccessibility(
        `${t(
          "batteryProtection.criticalTitle",
        )}. ${t(
          "batteryProtection.criticalBody",
          {
            percent: Math.round(usablePercent),
          },
        )}`,
      );
    }
  }, [critical, t, usablePercent]);

  const warningBody = t(
    "batteryProtection.warningBody",
    {
      wh: Math.round(usableWh),
    },
  );

  const criticalBody = t(
    "batteryProtection.criticalBody",
    {
      percent: Math.round(usablePercent),
    },
  );

  const newLoadBody = t(
    "batteryProtection.newLoadBody",
    {
      watts: Math.round(newLoadDeltaW),
    },
  );

  const reviewLabel = t(
    "batteryProtection.review",
  );

  return (
    <>
      {warning &&
      dismissedKey !== warningKey &&
      !critical ? (
        <ProtectionBanner
          icon="warning"
          tone={colors.warning}
          title={t(
            "batteryProtection.warningTitle",
          )}
          body={warningBody}
          actionLabel={reviewLabel}
          onAction={onReview}
          onDismiss={() =>
            setDismissedKey(warningKey)
          }
          styles={styles}
        />
      ) : null}

      {newLoadDeltaW > 0 &&
      dismissedKey !== newLoadKey ? (
        <ProtectionBanner
          icon="pulse-outline"
          tone={colors.primary}
          title={t(
            "batteryProtection.newLoadTitle",
          )}
          body={newLoadBody}
          actionLabel={reviewLabel}
          onAction={onReview}
          onDismiss={() =>
            setDismissedKey(newLoadKey)
          }
          styles={styles}
        />
      ) : null}

      <Modal
        visible={criticalActive}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View
            style={styles.alertCard}
            accessibilityViewIsModal
          >
            <View style={styles.alertHeader}>
              <Ionicons
                name="alert-circle"
                size={30}
                color={colors.error}
              />

              <AppText
                variant="heading"
                style={styles.alertTitle}
              >
                {t(
                  "batteryProtection.criticalTitle",
                )}
              </AppText>
            </View>

            <AppText
              variant="body"
              style={styles.alertBody}
            >
              {criticalBody}
            </AppText>

            <AppText
              variant="caption"
              style={styles.alertBody}
            >
              {t(
                "batteryProtection.criticalInstructions",
              )}
            </AppText>

            {recovering ? (
              <AppText
                variant="caption"
                style={styles.alertBody}
              >
                {t(
                  "batteryProtection.recovering",
                )}
              </AppText>
            ) : null}

            {onCriticalReview ? (
              <Pressable
                onPress={onCriticalReview}
                style={({ pressed }) => [
                  styles.alertButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={reviewLabel}
              >
                <AppText
                  variant="body"
                  style={styles.alertButtonText}
                >
                  {reviewLabel}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    banner: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderLeftWidth: 5,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
      padding: 12,
    },
    bannerText: {
      flex: 1,
      gap: 3,
    },
    bannerTitle: {
      color: colors.onSurface,
      fontWeight: "700",
    },
    bannerBody: {
      color: colors.onSurfaceMuted,
      lineHeight: 17,
    },
    bannerButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: Touch.target,
      minWidth: Touch.target,
    },
    dismissButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: Touch.target,
      minWidth: 32,
    },
    pressed: {
      opacity: 0.7,
    },
    overlay: {
      alignItems: "center",
      backgroundColor: colors.overlay,
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    alertCard: {
      backgroundColor: colors.elevated,
      borderColor: colors.error,
      borderRadius: 18,
      borderWidth: 2,
      gap: 14,
      padding: 20,
      width: "100%",
    },
    alertHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    alertTitle: {
      color: colors.onSurface,
      flex: 1,
      fontSize: 20,
    },
    alertBody: {
      color: colors.onSurface,
      lineHeight: 20,
    },
    alertButton: {
      alignItems: "center",
      backgroundColor: colors.error,
      borderRadius: 12,
      justifyContent: "center",
      minHeight: Touch.target,
      paddingHorizontal: 18,
    },
    alertButtonText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },
    alertDismiss: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: Touch.target,
    },
    alertDismissText: {
      color: colors.onSurfaceMuted,
    },
  });
