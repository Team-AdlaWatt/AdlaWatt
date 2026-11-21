import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";

import AppText from "@/components/ui/AppText";
import { DropdownModal } from "@/components/ui/DropdownModal";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Control } from "@/constants/sizing";
import { Radius } from "@/constants/theme";

interface PinChangeWarningModalProps {
  visible: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

export default function PinChangeWarningModal({
  visible,
  onCancel,
  onContinue,
}: PinChangeWarningModalProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const title = t("pin.changeTitle");
  const body = t("pin.changeBody");

  useEffect(() => {
    if (!visible) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${title}. ${body}`,
    );
  }, [visible, title, body]);

  return (
    <DropdownModal
      visible={visible}
      title={title}
      onClose={onCancel}
      showCloseButton={false}
      dismissOnOverlayPress={false}
      footer={
        <View style={styles.actionRow}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("pin.changeCancelA11y")}
          >
            <AppText
              variant="body"
              style={styles.cancelButtonText}
            >
              {t("pin.changeCancel")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [
              styles.button,
              styles.continueButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("pin.changeContinueA11y")}
          >
            <AppText
              variant="body"
              style={styles.continueButtonText}
            >
              {t("pin.changeContinue")}
            </AppText>
          </Pressable>
        </View>
      }
    >
      <View
        style={styles.body}
        accessibilityViewIsModal
      >
        <View
          style={styles.warningRow}
          accessibilityRole="alert"
        >
          <Ionicons
            name="warning-outline"
            size={22}
            color={colors.error}
            style={styles.warningIcon}
          />

          <AppText
            variant="caption"
            style={styles.warningText}
          >
            {body}
          </AppText>
        </View>

        <AppText
          variant="caption"
          style={styles.privateHint}
        >
          {t("pin.privateHint")}
        </AppText>
      </View>
    </DropdownModal>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    body: {
      width: "100%",
    },

    warningRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },

    warningIcon: {
      marginTop: 1,
    },

    warningText: {
      flex: 1,
      color: colors.errorDeep,
      lineHeight: 20,
      fontWeight: "600",
    },

    privateHint: {
      marginTop: 12,
      color: colors.textSecondary,
      lineHeight: 20,
    },

    actionRow: {
      width: "100%",
      flexDirection: "row",
      gap: Control.buttonGap,
    },

    button: {
      flex: 1,
      minHeight: Control.button,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Radius.md,
      borderWidth: 1,
      paddingHorizontal: Control.buttonPadding,
    },

    cancelButton: {
      backgroundColor: colors.selectedWash,
      borderColor: colors.border,
    },

    cancelButtonText: {
      color: colors.text,
      fontWeight: "700",
    },

    continueButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    continueButtonText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    pressed: {
      opacity: 0.72,
    },
  });
