import React, {
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/components/ui/AppText";
import {
  CalendarModal,
} from "@/components/ui/CalendarModal";
import ReportSavedModal, {
  type SavedReport,
} from "@/components/ui/ReportSavedModal";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  ANALYTICS_PRESETS,
  AnalyticsRange,
  ReportFrequency,
  ReportType,
  formatReportDate,
} from "@/services/analyticsService";
import { Control, OptionRow } from "@/constants/sizing";

/* ============================================================
   DATE PICKER
   ============================================================ */

interface DatePickerFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}

function DatePickerField({
  label,
  value,
  onChange,
}: DatePickerFieldProps) {
  const [
    calendarVisible,
    setCalendarVisible,
  ] = useState(false);

  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <View
      style={
        styles.reportControl
      }
    >
      <AppText
        variant="caption"
        style={
          styles.reportControlLabel
        }
      >
        {label}
      </AppText>

      <Pressable
        style={({ pressed }) => [
          styles.dateFieldButton,
          pressed &&
            styles.buttonPressed,
        ]}
        onPress={() =>
          setCalendarVisible(true)
        }
      >
        <AppText
          variant="caption"
          style={
            styles.dateFieldText
          }
        >
          {formatReportDate(value)}
        </AppText>

        <Ionicons
          name="calendar-outline"
          size={16}
          color={colors.accentContent}
        />
      </Pressable>

      <CalendarModal
        visible={calendarVisible}
        title={label}
        value={value}
        maximumDate={new Date()}
        onChange={onChange}
        onClose={() =>
          setCalendarVisible(false)
        }
      />
    </View>
  );
}

/* ============================================================
   PROPS
   ============================================================ */

export interface AnalyticsCardsProps {
  reportFrequency: ReportFrequency;
  setReportModalVisible: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  range: AnalyticsRange;
  onFromDateChange: (date: Date) => void;
  onToDateChange: (date: Date) => void;
  onPresetSelect?: (days: number) => void;
  generateReport: (
    reportType: ReportType,
  ) => Promise<void>;
  exporting?: boolean;
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
  reportFrequency,
  setReportModalVisible,
  range,
  onFromDateChange,
  onToDateChange,
  onPresetSelect,
  generateReport,
  exporting = false,
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
            Choose a frequency and pick a custom from/to date range
            for the report export.
          </AppText>

          {onPresetSelect ? (
            <View style={styles.presetRow}>
              {ANALYTICS_PRESETS.map(
                (preset) => (
                  <Pressable
                    key={preset.days}
                    style={({ pressed }) => [
                      styles.presetChip,
                      pressed &&
                        styles.buttonPressed,
                    ]}
                    onPress={() =>
                      onPresetSelect(
                        preset.days,
                      )
                    }
                  >
                    <AppText
                      variant="caption"
                      style={
                        styles.presetChipText
                      }
                    >
                      {preset.label}
                    </AppText>
                  </Pressable>
                ),
              )}
            </View>
          ) : null}

          <View
            style={
              styles.reportControls
            }
          >
            <View
              style={
                styles.reportControl
              }
            >
              <AppText
                variant="caption"
                style={
                  styles.reportControlLabel
                }
              >
                Frequency
              </AppText>

              <Pressable
                style={({ pressed }) => [
                  styles.reportSelect,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={() =>
                  setReportModalVisible(
                    true,
                  )
                }
              >
                <AppText
                  variant="caption"
                  style={
                    styles.reportSelectText
                  }
                >
                  {reportFrequency}
                </AppText>

                <Ionicons
                  name="chevron-down-outline"
                  size={15}
                  color={
                    colors.accentContent
                  }
                />
              </Pressable>
            </View>

            <DatePickerField
              label="From Date"
              value={range.start}
              onChange={
                onFromDateChange
              }
            />

            <DatePickerField
              label="To Date"
              value={range.end}
              onChange={
                onToDateChange
              }
            />
          </View>

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
                {exporting
                  ? "Exporting..."
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
                {exporting
                  ? "Exporting..."
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

    reportControls: {
      width: "100%",
      marginTop: 14,
      gap: 10,
    },

    presetRow: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },

    presetChip: {
      minHeight: 34,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    presetChipText: {
      color: colors.primary,
      fontWeight: "700",
    },

    reportControl: {
      width: "100%",
    },

    reportControlLabel: {
      color:
        colors.textSecondary,
      fontWeight: "600",
      marginBottom: 5,
    },

    reportSelect: {
      width: "100%",
      minHeight: OptionRow.minHeight,
      borderWidth: 2,
      borderColor:
        colors.primary,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    reportSelectText: {
      color: colors.text,
      fontWeight: "600",
    },

    dateFieldButton: {
      width: "100%",
      minHeight: OptionRow.minHeight,
      backgroundColor:
        colors.selectedWash,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    dateFieldText: {
      color: colors.text,
      fontWeight: "600",
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