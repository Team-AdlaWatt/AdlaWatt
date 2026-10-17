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

import { useTranslation } from "react-i18next";

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

// ============================================================
// REPORT SAVED MODAL
//
// Post-export confirmation: the report is already written into
// a folder the user can open, so the panel only has to say
// where it landed and offer one tap to open it.
//
// Centered card, matching DropdownModal exactly (same overlay,
// same card geometry, same fade), so every modal in the app is
// the same box rather than a mix of box and bottom sheet.
// ============================================================

const MODAL_RADIUS = 18;

export type SavedReport = {
  filename: string;
  folderLabel: string;
};

interface ReportSavedModalProps {
  /** Whether the modal is on screen. */
  visible: boolean;
  /** Saved file summary. Kept by the caller after closing so
   * the modal still has content while it fades away. */
  result: SavedReport | null;
  onOpen: () => void;
  onClose: () => void;
}

export default function ReportSavedModal({
  visible,
  result,
  onOpen,
  onClose,
}: ReportSavedModalProps) {
  const { t } = useTranslation();
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const title = t(
    "dashboard.analytics.reportSavedTitle",
  );

  // The modal appears without focus moving into it, so a
  // screen reader would otherwise miss the confirmation.
  useEffect(() => {
    if (!visible || !result) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${title}. ${result.filename}`,
    );
  }, [visible, result, title]);

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
          // Swallow card taps so the overlay close doesn't
          // fire. stopPropagation keeps web from delivering the
          // same touch to both responders.
          onPress={(event) => {
            (
              event as unknown as {
                stopPropagation?: () => void;
              }
            )?.stopPropagation?.();
          }}
        >
          <View style={styles.titleRow}>
            <Ionicons
              name="checkmark-circle"
              size={26}
              color={colors.primary}
            />

            <AppText
              variant="heading"
              style={styles.title}
              accessibilityRole="header"
            >
              {title}
            </AppText>
          </View>

          {/*
            Scrollable body so a large font scale or a long
            file name cannot push the actions off the card —
            same shrink-and-scroll behavior as DropdownModal.
          */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailRow}>
              <Ionicons
                name="document-outline"
                size={Touch.iconCompact}
                color={colors.textSecondary}
                style={styles.detailIcon}
              />

              <AppText
                variant="caption"
                style={styles.filename}
                numberOfLines={2}
              >
                {result?.filename}
              </AppText>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="folder-outline"
                size={Touch.iconCompact}
                color={colors.textSecondary}
                style={styles.detailIcon}
              />

              <AppText
                variant="caption"
                style={styles.location}
                numberOfLines={2}
              >
                {t(
                  "dashboard.analytics.reportSavedTo",
                )}{" "}
                <AppText
                  variant="caption"
                  style={styles.locationValue}
                >
                  {result?.folderLabel}
                </AppText>
              </AppText>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.openButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={onOpen}
              accessibilityRole="button"
              accessibilityLabel={t(
                "dashboard.analytics.reportOpenFile",
              )}
            >
              <Ionicons
                name="open-outline"
                size={17}
                color={colors.onPrimary}
              />

              <AppText
                variant="caption"
                style={styles.openButtonText}
              >
                {t(
                  "dashboard.analytics.reportOpenFile",
                )}
              </AppText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.doneButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t(
                "dashboard.analytics.reportDone",
              )}
            >
              <AppText
                variant="caption"
                style={styles.doneButtonText}
              >
                {t(
                  "dashboard.analytics.reportDone",
                )}
              </AppText>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    buttonPressed: {
      opacity: 0.72,
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
      // max height, so the actions stay on screen.
      flexShrink: 1,
    },

    bodyContent: {
      paddingBottom: 2,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    title: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 17,
      flexShrink: 1,
    },

    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginTop: 10,
    },

    detailIcon: {
      marginTop: 1,
    },

    filename: {
      color: colors.text,
      fontWeight: "600",
      flexShrink: 1,
      lineHeight: 18,
    },

    location: {
      color: colors.textSecondary,
      flexShrink: 1,
      lineHeight: 18,
    },

    locationValue: {
      color: colors.primary,
      fontWeight: "700",
    },

    actionButton: {
      width: "100%",
      minHeight: Control.button,
      borderRadius: Radius.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
      paddingHorizontal: 10,
    },

    openButton: {
      marginTop: 18,
      backgroundColor: colors.primary,
    },

    openButtonText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    doneButton: {
      marginTop: 9,
      backgroundColor:
        colors.selectedWash,
      borderWidth: 1,
      borderColor: colors.border,
    },

    doneButtonText: {
      color: colors.text,
      fontWeight: "700",
    },
  });
