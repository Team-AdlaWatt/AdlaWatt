import { Ionicons } from "@expo/vector-icons";

import React, { ReactNode, useMemo } from "react";

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { Touch } from "@/constants/sizing";
import { useTranslation } from "react-i18next";

// ============================================================
// STANDARD DROPDOWN MODAL
//
// The shared dropdown-picker used across the dashboard screens.
// "Opened" state is always this centered bottom-sheet-style
// modal so every dropdown looks and behaves the same.
// ============================================================

const MODAL_RADIUS = 18;

interface DropdownModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  showCloseButton?: boolean;
  dismissOnOverlayPress?: boolean;
}

export function DropdownModal({
  visible,
  title,
  onClose,
  children,
  showCloseButton = true,
  dismissOnOverlayPress = true,
}: DropdownModalProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const dropdownModalStyles = useMemo(
    () => getDropdownModalStyles(colors),
    [colors],
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        showCloseButton ? onClose : () => {}
      }
    >
      <KeyboardAvoidingView
        style={dropdownModalStyles.keyboardWrap}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <Pressable
          style={dropdownModalStyles.overlay}
          onPress={
            dismissOnOverlayPress
              ? onClose
              : undefined
          }
        >
          <Pressable
            style={dropdownModalStyles.card}
            // Swallow card taps so the overlay close doesn't fire.
            // stopPropagation keeps web from delivering the same
            // touch to both responders (orphan touchend noise).
            onPress={(event) => {
              (
                event as unknown as {
                  stopPropagation?: () => void;
                }
              )?.stopPropagation?.();
            }}
          >
            <View
              style={dropdownModalStyles.header}
            >
              <AppText
                variant="body"
                style={dropdownModalStyles.title}
              >
                {title}
              </AppText>

              {showCloseButton && (
                <Pressable
                  onPress={onClose}
                  style={dropdownModalStyles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel={t("shared.close")}
                >
                  <Ionicons
                    name="close-outline"
                    size={22}
                    color={colors.text}
                  />
                </Pressable>
              )}
            </View>

            {/*
              Scrollable body so modals with text fields (e.g.
              the custom appliance form) can keep the focused
              input above the keyboard instead of hidden behind
              it. keyboardShouldPersistTaps lets the confirm
              button fire on the first tap while the keyboard is
              still open.
            */}
            <ScrollView
              style={dropdownModalStyles.body}
              contentContainerStyle={
                dropdownModalStyles.bodyContent
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// RADIO OPTION ROW
// Used by dropdowns whose options carry no colored icon.
// ============================================================

interface RadioOptionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Disabled rows render muted with an optional note: not pressable.
  disabled?: boolean;
  note?: string;
}

export function RadioOptionRow({
  label,
  selected,
  onPress,
  disabled = false,
  note,
}: RadioOptionRowProps) {
  const colors = useAppColors();
  const dropdownModalStyles = useMemo(
    () => getDropdownModalStyles(colors),
    [colors],
  );
  return (
    <Pressable
      style={[
        dropdownModalStyles.option,
        selected &&
          dropdownModalStyles.optionSelected,
        disabled && dropdownModalStyles.optionDisabled,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{
        selected,
        disabled,
      }}
      accessibilityLabel={
        note ? `${label}, ${note}` : label
      }
    >
      <Ionicons
        name={
          selected
            ? "radio-button-on-outline"
            : "radio-button-off-outline"
        }
        size={18}
        color={
          disabled
            ? colors.textSecondary
            : colors.accentContent
        }
      />

      <AppText
        variant="caption"
        style={[
          dropdownModalStyles.optionText,
          selected &&
            dropdownModalStyles.optionTextSelected,
          disabled &&
            dropdownModalStyles.optionTextDisabled,
        ]}
      >
        {label}
      </AppText>

      {note ? (
        <AppText
          variant="caption"
          style={dropdownModalStyles.optionNote}
        >
          {note}
        </AppText>
      ) : null}
    </Pressable>
  );
}

// ============================================================
// TINTED OPTION ROW
// Used by dropdowns whose options carry a colored icon. No
// radio dot - the pale background is tinted by the icon color.
// ============================================================

interface TintedOptionRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  selected: boolean;
  onPress: () => void;
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TintedOptionRow({
  label,
  icon,
  color,
  selected,
  onPress,
}: TintedOptionRowProps) {
  const colors = useAppColors();
  const dropdownModalStyles = useMemo(
    () => getDropdownModalStyles(colors),
    [colors],
  );
  return (
    <Pressable
      style={[
        dropdownModalStyles.option,
        {
          backgroundColor: withAlpha(
            color,
            selected ? 0.16 : 0.06,
          ),
        },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={color}
      />

      <AppText
        variant="caption"
        style={[
          dropdownModalStyles.optionText,
          selected &&
            dropdownModalStyles.optionTextSelected,
        ]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const getDropdownModalStyles = (colors: AppColors) =>
  StyleSheet.create({
    keyboardWrap: {
      flex: 1,
    },

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

    body: {
      // Shrink (instead of overflowing) once the card hits its
      // max height, so the body scrolls and the keyboard-aware
      // layout can keep the focused field visible.
      flexShrink: 1,
    },

    bodyContent: {
      paddingBottom: 2,
    },

    header: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },

    title: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 17,
    },

    closeButton: {
      width: Touch.target,
      height: Touch.target,
      alignItems: "center",
      justifyContent: "center",
    },

    option: {
      width: "100%",
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginVertical: 2,
    },

    optionSelected: {
      backgroundColor: colors.selectedWash,
    },

    optionDisabled: {
      opacity: 0.55,
    },

    optionText: {
      color: colors.text,
      flexShrink: 1,
    },

    optionTextSelected: {
      fontWeight: "700",
    },

    optionTextDisabled: {
      color: colors.textSecondary,
    },

    optionNote: {
      color: colors.textSecondary,
      marginLeft: "auto",
    },
  });