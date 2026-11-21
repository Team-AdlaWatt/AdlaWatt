import React, {
  useMemo,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/components/ui/AppText";
import ReportSavedModal, {
  type SavedReport,
} from "@/components/ui/ReportSavedModal";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  ReportType,
} from "@/services/analyticsService";
import { Control } from "@/constants/sizing";

/* ============================================================
   PROPS
   ============================================================ */

export interface AnalyticsCardsProps {
  generateReport: (
    reportType: ReportType,
  ) => Promise<void>;
  exporting?: boolean;
  /** Which format is mid-export: drives the per-button
   * "Preparing..." label. Null when nothing is exporting. */
  exportingType?: ReportType | null;
  status?: ReportExportStatus;
  /** Saved-report summary: opens the post-export sheet. */
  exportResult?: ReportExportResult;
  exportSheetVisible?: boolean;
  onOpenExportedReport?: () => void;
  onDismissExportResult?: () => void;
}

/*
 * Cross-platform export feedback. Replaces Alert.alert, which is
 * a no-op on react-native-web, so web users previously got no
 * response at all when a report had no data or failed.
 */
export type ReportExportStatus = {
  kind: "info" | "error" | "success";
  message: string;
} | null;

/*
 * Native export outcome. The status row above reports whether
 * the export ran; this carries the extra detail the success
 * sheet needs — the file name and the folder it landed in.
 */
export type ReportExportResult =
  | SavedReport
  | null;

const noop = () => {};

/* ============================================================
   ANALYTICS PANEL
   ============================================================ */

export default function AnalyticsCards({
  generateReport,
  exporting = false,
  exportingType = null,
  status,
  exportResult = null,
  exportSheetVisible = false,
  onOpenExportedReport,
  onDismissExportResult,
}: AnalyticsCardsProps) {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <>
      {/* ======================================================
          GENERATE REPORT
          Follows the ChartCard grouped-card layout: a solid
          primary header accent panel over the body content.
      ====================================================== */}

      <View
        style={
          styles.reportCard
        }
      >
        {/* Header / Accent Panel */}
        <View
          style={
            styles.reportHeaderPanel
          }
        >
          <Ionicons
            name="document-text-outline"
            size={30}
            color={colors.headerContent}
          />

          <AppText
            variant="heading"
            style={
              styles.reportHeaderTitle
            }
          >
            Generate Report
          </AppText>
        </View>

        {/* Body */}
        <View
          style={
            styles.reportBody
          }
        >
          <AppText
            variant="caption"
            style={
              styles.reportSubtitle
            }
          >
            Exports the Solar, Load, and Battery sections for the
            selected analytics range.
          </AppText>

          <View
            style={
              styles.exportRow
            }
          >
            <Pressable
              style={({ pressed }) => [
                styles.exportPrimaryButton,
                pressed &&
                  styles.buttonPressed,
                exporting &&
                  styles.buttonDisabled,
              ]}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityState={{
                disabled: exporting,
                busy: exportingType === "CSV",
              }}
              accessibilityLabel={
                exportingType === "CSV"
                  ? "Preparing CSV report"
                  : "Export CSV"
              }
              onPress={() =>
                generateReport(
                  "CSV",
                )
              }
            >
              <Ionicons
                name="download-outline"
                size={17}
                color={colors.onPrimary}
              />

              <AppText
                variant="caption"
                style={
                  styles.exportPrimaryText
                }
              >
                {exportingType === "CSV"
                  ? "Preparing..."
                  : "Export CSV"}
              </AppText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.exportPrimaryButton,
                pressed &&
                  styles.buttonPressed,
                exporting &&
                  styles.buttonDisabled,
              ]}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityState={{
                disabled: exporting,
                busy: exportingType === "PDF",
              }}
              accessibilityLabel={
                exportingType === "PDF"
                  ? "Preparing PDF report"
                  : "Export PDF"
              }
              onPress={() =>
                generateReport(
                  "PDF",
                )
              }
            >
              <Ionicons
                name="document-outline"
                size={17}
                color={colors.onPrimary}
              />

              <AppText
                variant="caption"
                style={
                  styles.exportPrimaryText
                }
              >
                {exportingType === "PDF"
                  ? "Preparing..."
                  : "Export PDF"}
              </AppText>
            </Pressable>
          </View>

          {status ? (
            <View
              style={[
                styles.statusRow,
                status.kind ===
                "error"
                  ? styles.statusError
                  : status.kind ===
                      "success"
                    ? styles.statusSuccess
                    : styles.statusInfo,
              ]}
            >
              <AppText
                variant="caption"
                style={[
                  styles.statusText,
                  status.kind ===
                  "error"
                    ? styles.statusTextError
                    : status.kind ===
                        "success"
                      ? styles.statusTextSuccess
                      : styles.statusTextInfo,
                ]}
              >
                {status.message}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {/* ======================================================
          POST-EXPORT SHEET
          Native only: reports land in a real Download folder,
          so the sheet confirms where and offers one tap to
          open the file. Web downloads need no equivalent.
      ====================================================== */}

      <ReportSavedModal
        visible={exportSheetVisible}
        result={exportResult}
        onOpen={onOpenExportedReport ?? noop}
        onClose={onDismissExportResult ?? noop}
      />
    </>
  );
}

/* ============================================================
   DIMENSIONS
   ============================================================ */

export const analyticsDimensions = {
  sectionSpacing: 18,
  cardRadius: 16,
  cardBorderWidth: 2,
};

/* ============================================================
   STYLES
   ============================================================ */

  const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    buttonPressed: {
      opacity: 0.72,
    },

    buttonDisabled: {
      opacity: 0.55,
    },

    /* ========================================================
       REPORT CARD
    ======================================================== */

    reportCard: {
      width: "100%",
      backgroundColor:
        colors.glass.white,
      borderWidth: 3,
      borderColor:
        colors.cardBorder,
      borderRadius: 15,
      flexDirection: "column",
      alignItems: "stretch",
      overflow: "hidden",
      marginBottom:
        analyticsDimensions.sectionSpacing,
    },

    reportHeaderPanel: {
      width: "100%",
      backgroundColor:
        colors.headerBackground,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 9,
    },

    reportHeaderTitle: {
      color: colors.headerContent,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
      flexShrink: 1,
    },

    reportBody: {
      padding: 16,
    },

    reportSubtitle: {
      color:
        colors.textSecondary,
      lineHeight: 19,
    },

    exportRow: {
      width: "100%",
      flexDirection: "row",
      gap: 9,
      marginTop: 13,
    },

    exportPrimaryButton: {
      flex: 1,
      minHeight: Control.button,
      backgroundColor:
        colors.primary,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
      paddingHorizontal: 10,
    },

    exportPrimaryText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    statusRow: {
      width: "100%",
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },

    statusInfo: {
      backgroundColor:
        colors.selectedWash,
      borderColor: colors.border,
    },

    statusSuccess: {
      backgroundColor:
        colors.selectedWash,
      borderColor: colors.primary,
    },

    statusError: {
      backgroundColor:
        colors.selectedWash,
      borderColor: colors.error,
    },

    statusText: {
      lineHeight: 18,
    },

    statusTextInfo: {
      color: colors.textSecondary,
    },

    statusTextSuccess: {
      color: colors.primary,
      fontWeight: "600",
    },

    statusTextError: {
      color: colors.error,
      fontWeight: "600",
    },
  });