import { Ionicons } from "@expo/vector-icons";

import React, {
  useEffect,
  useMemo,
} from "react";

import {
  AccessibilityInfo,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";

import AppText from "@/components/ui/AppText";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

import {
  Control,
  Sheet,
  Touch,
} from "@/constants/sizing";

import { Radius } from "@/constants/theme";

// ============================================================
// REPORT VIEWER
//
// In-app reading surface for exported reports. The export flow
// never launches a share chooser, so a CSV opens here instead:
// the file's text is shown line by line in a monospaced list.
//
// Full-screen (rather than a bottom sheet like ReportSavedModal)
// because the report itself is the content and can run to
// thousands of rows. FlatList keeps long exports cheap to scroll.
// ============================================================

export type ViewedReport = {
  filename: string;
  content: string;
};

interface ReportViewerModalProps {
  /** Whether the viewer is on screen. */
  visible: boolean;
  /** File text to read. Kept by the caller after closing so
   * the viewer still has content while it slides away. */
  result: ViewedReport | null;
  onClose: () => void;
}

export default function ReportViewerModal({
  visible,
  result,
  onClose,
}: ReportViewerModalProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  // One row per line: importing a single mega-string would make
  // the on-screen text unvirtualized on large exports.
  const lines = useMemo(
    () =>
      (result?.content ?? "").split(/\r?\n/),
    [result],
  );

  // The viewer opens without focus moving into it, so a screen
  // reader would otherwise miss which file is being shown.
  useEffect(() => {
    if (!visible || !result) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${t("dashboard.analytics.reportPreviewTitle")}. ${result.filename}`,
    );
  }, [visible, result, t]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
          },
        ]}
        accessibilityViewIsModal
      >
        <View style={styles.header}>
          <Ionicons
            name="document-text-outline"
            size={Touch.iconCompact}
            color={colors.primary}
          />

          <View style={styles.headerText}>
            <AppText
              variant="heading"
              style={styles.title}
              accessibilityRole="header"
            >
              {t(
                "dashboard.analytics.reportPreviewTitle",
              )}
            </AppText>

            <AppText
              variant="caption"
              style={styles.filename}
              numberOfLines={1}
            >
              {result?.filename}
            </AppText>
          </View>
        </View>

        <FlatList
          data={lines}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyExtractor={(_, index) =>
            String(index)
          }
          initialNumToRender={40}
          renderItem={({ item }) => (
            <AppText
              variant="caption"
              allowCustomFamily
              style={styles.line}
            >
              {item}
            </AppText>
          )}
        />

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.buttonPressed,
            {
              marginBottom:
                insets.bottom + Sheet.padding,
            },
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
            {t("dashboard.analytics.reportDone")}
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: Sheet.padding,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    headerText: {
      flexShrink: 1,
    },

    title: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 17,
    },

    filename: {
      color: colors.primary,
      fontWeight: "600",
      marginTop: 2,
    },

    list: {
      flex: 1,
    },

    listContent: {
      paddingHorizontal: Sheet.padding,
      paddingVertical: 12,
    },

    // Monospace so the CSV columns line up under each other.
    line: {
      color: colors.text,
      fontFamily: Platform.select({
        ios: "Menlo",
        android: "monospace",
        default: "monospace",
      }),
      fontSize: 12,
      lineHeight: 18,
    },

    actionButton: {
      minHeight: Control.button,
      marginHorizontal: Sheet.padding,
      marginTop: 9,
      borderRadius: Radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },

    doneButtonText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    buttonPressed: {
      opacity: 0.72,
    },
  });
