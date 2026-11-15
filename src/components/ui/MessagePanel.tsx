import { Ionicons } from "@expo/vector-icons";

import React, {
  useEffect,
  useMemo,
} from "react";

import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

import {
  Control,
  Touch,
} from "@/constants/sizing";

import { Radius } from "@/constants/theme";

const MODAL_RADIUS = 18;

interface MessagePanelProps {
  visible: boolean;
  title: string;
  body: string;
  hint: string;
  actionLabel: string;
  checkboxLabel: string;
  closeAccessibilityLabel: string;
  onAction: () => void;
  onDontShowAgain: () => void;
  onClose: () => void;
}

export default function MessagePanel({
  visible,
  title,
  body,
  hint,
  actionLabel,
  checkboxLabel,
  closeAccessibilityLabel,
  onAction,
  onDontShowAgain,
  onClose,
}: MessagePanelProps) {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${title}. ${body}`,
    );
  }, [visible, title, body]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.card}
          accessibilityViewIsModal
          onPress={(event) => {
            (
              event as unknown as {
                stopPropagation?: () => void;
              }
            )?.stopPropagation?.();
          }}
        >
          <View style={styles.header}>
            <AppText
              variant="body"
              style={styles.title}
              accessibilityRole="header"
            >
              {title}
            </AppText>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={
                closeAccessibilityLabel
              }
            >
              <Ionicons
                name="close-outline"
                size={22}
                color={colors.text}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={
              styles.bodyContent
            }
            showsVerticalScrollIndicator={false}
          >
            <AppText
              variant="body"
              style={styles.message}
            >
              {body}
            </AppText>

            <AppText
              variant="caption"
              style={styles.hint}
            >
              {hint}
            </AppText>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onAction}
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
            >
              <Ionicons
                name="settings-outline"
                size={17}
                color={colors.onPrimary}
              />

              <AppText
                variant="body"
                style={styles.actionButtonText}
              >
                {actionLabel}
              </AppText>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.checkboxRow}
              onPress={onDontShowAgain}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: false }}
              accessibilityLabel={checkboxLabel}
              hitSlop={8}
            >
              <View style={styles.checkbox} />

              <AppText
                variant="caption"
                style={styles.checkboxLabel}
              >
                {checkboxLabel}
              </AppText>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },

    card: {
      width: "100%",
      maxWidth: 420,
      maxHeight: "100%",
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: MODAL_RADIUS,
      padding: 17,
    },

    header: {
      width: "100%",
      minHeight: Touch.target,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },

    title: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 17,
      flexShrink: 1,
      paddingRight: 8,
    },

    closeButton: {
      width: Touch.target,
      height: Touch.target,
      alignItems: "center",
      justifyContent: "center",
    },

    body: {
      flexShrink: 1,
    },

    bodyContent: {
      paddingBottom: 2,
    },

    message: {
      color: colors.text,
      lineHeight: 22,
    },

    hint: {
      color: colors.textSecondary,
      lineHeight: 18,
      marginTop: 6,
    },

    actionButton: {
      width: "100%",
      minHeight: Control.button,
      marginTop: 18,
      borderRadius: Radius.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
      paddingHorizontal: 10,
      backgroundColor: colors.primary,
    },

    actionButtonText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    buttonPressed: {
      opacity: 0.72,
    },

    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 16,
    },

    checkboxRow: {
      minHeight: Touch.target,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 6,
      paddingVertical: 6,
    },

    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 6,
      backgroundColor: colors.surface,
    },

    checkboxLabel: {
      color: colors.text,
      flexShrink: 1,
      lineHeight: 18,
    },
  });
