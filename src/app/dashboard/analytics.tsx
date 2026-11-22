import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ScrollViewInstance,
} from "react-native";
import { useTranslation } from "react-i18next";

import AnalyticsCards, {
  type ReportExportResult,
  type ReportExportStatus,
} from "@/components/AnalyticsCard";
import AnalyticsChartCard, {
  type AnalyticsChartCardProps,
} from "@/components/AnalyticsChartCard";
import BatteryActivityChart from "@/components/charts/BatteryActivityChart";
import LoadEnergyChart from "@/components/charts/LoadEnergyChart";
import SolarEnergyChart from "@/components/charts/SolarEnergyChart";
import LazyMount, {
  ScrollVisibilityProvider,
  createScrollVisibility,
} from "@/components/LazyMount";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import PullRefreshScroll from "@/components/PullRefreshScroll";
import AppText from "@/components/ui/AppText";
import Copyright from "@/components/ui/Copyright";
import { Control, useScreenPadding } from "@/constants/sizing";
import { Radius } from "@/constants/theme";
import { useAppColors, type AppColors } from "@/hooks/useAppColors";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useScrollToTopController } from "@/hooks/useScrollToTopController";
import {
  buildAnalyticsCardData,
  createFrequencyRange,
  downloadCsvOnWeb,
  downloadPdfOnWeb,
  generateAdlaWattCsv,
  generateAdlaWattPdf,
  loadAnalyticsData,
  prepareReportData,
  type ChartFrequency,
  type MonitoringHistoryRow,
  type ReportType,
} from "@/services/analyticsService";
import type { ReportFile } from "@/services/reportPrint";

const QUICK_NAV_SCROLL_BOTTOM_MS = 400;
const QUICK_NAV_CATCH_UP_MS = 200;
const QUICK_NAV_BOTTOM_PIN_MS = 2000;

function LazyCard(props: AnalyticsChartCardProps) {
  return (
    <LazyMount>
      <AnalyticsChartCard {...props} />
    </LazyMount>
  );
}

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const colors = useAppColors();
  const screenPadding = useScreenPadding();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollToTop = useScrollToTopController(scrollRef);
  const [scrollVisibility] = useState(() => createScrollVisibility());
  const scrollYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const bottomPinUntilRef = useRef(0);
  const [scrollOffset] = useState(() => new Animated.Value(0));

  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const focusParam = Array.isArray(params.focus)
    ? params.focus[0]
    : params.focus;
  const focusParamHandledRef = useRef(false);

  const [monitoringHistory, setMonitoringHistory] = useState<
    MonitoringHistoryRow[]
  >([]);
  const [frequency, setFrequency] = useState<ChartFrequency>("Daily");
  const [range, setRange] = useState(() => createFrequencyRange("Daily"));

  const [exportingReport, setExportingReport] =
    useState<ReportType | null>(null);
  const [exportStatus, setExportStatus] =
    useState<ReportExportStatus>(null);
  const [savedReport, setSavedReport] = useState<
    (ReportFile & { folderLabel: string }) | null
  >(null);
  const [exportSheetVisible, setExportSheetVisible] = useState(false);

  const cardData = useMemo(
    () => buildAnalyticsCardData(monitoringHistory, frequency, range),
    [monitoringHistory, frequency, range],
  );

  const activitySlices = cardData.activity;

  const loadAnalytics = useCallback(async () => {
    const { monitoringHistory: monitoringRows } =
      await loadAnalyticsData(range);
    setMonitoringHistory(monitoringRows);
  }, [range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- range-driven history fetch is the effect's purpose
    loadAnalytics();
  }, [loadAnalytics]);

  const { refreshing, onRefresh } = usePullToRefresh(loadAnalytics);

  useEffect(() => {
    const scrollListenerId = scrollOffset.addListener(({ value }) => {
      scrollRef.current?.scrollTo({ y: value, animated: false });
    });

    return () => {
      scrollOffset.removeListener(scrollListenerId);
    };
  }, [scrollOffset]);

  const maxScrollOffset = () =>
    Math.max(0, contentHeightRef.current - viewportHeightRef.current);

  const scrollToBottom = ({
    animated = true,
  }: { animated?: boolean } = {}) => {
    if (!scrollRef.current) {
      return;
    }

    bottomPinUntilRef.current = Date.now() + QUICK_NAV_BOTTOM_PIN_MS;

    if (!animated) {
      scrollOffset.setValue(maxScrollOffset());
      return;
    }

    Animated.timing(scrollOffset, {
      toValue: maxScrollOffset(),
      duration: QUICK_NAV_SCROLL_BOTTOM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      scrollOffset.setValue(maxScrollOffset());
    });
  };

  const applyFocusParam = () => {
    if (
      focusParam !== "report" ||
      focusParamHandledRef.current ||
      contentHeightRef.current <= 0 ||
      viewportHeightRef.current <= 0
    ) {
      return;
    }

    focusParamHandledRef.current = true;
    scrollToBottom({ animated: false });
  };

  const handleContentSizeChange = (_width: number, height: number) => {
    contentHeightRef.current = height;
    applyFocusParam();

    if (Date.now() >= bottomPinUntilRef.current) {
      return;
    }

    const target = maxScrollOffset();
    if (target <= scrollYRef.current + 1) {
      return;
    }

    Animated.timing(scrollOffset, {
      toValue: target,
      duration: QUICK_NAV_CATCH_UP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
    applyFocusParam();
  };

  const handleScrollBeginDrag = () => {
    bottomPinUntilRef.current = 0;
  };

  const openReportDirectly = useCallback(async (file: ReportFile) => {
    if (Platform.OS === "android") {
      const { openReportWithSystemApp } = await import(
        "@/services/reportOpen"
      );
      await openReportWithSystemApp(file);
      return;
    }

    const { openReportPdfFile } = await import("@/services/reportPrint");
    await openReportPdfFile(file);
  }, []);

  const generateReport = useCallback(
    async (reportType: ReportType) => {
      if (exportingReport !== null) {
        return;
      }

      if (monitoringHistory.length === 0) {
        setExportStatus({
          kind: "info",
          message:
            "No historical analytics data is available for the selected date range.",
        });
        return;
      }

      setExportStatus({
        kind: "info",
        message: `Preparing ${reportType} report…`,
      });

      if (Platform.OS === "web") {
        try {
          const reportData = prepareReportData(
            monitoringHistory,
            frequency,
            range,
          );

          if (reportType === "CSV") {
            const csv = generateAdlaWattCsv(reportData);
            const filename = `adlawatt_${frequency.toLowerCase()}_report_${new Date()
              .toISOString()
              .slice(0, 10)}.csv`;

            downloadCsvOnWeb(csv, filename);
            setExportStatus({
              kind: "success",
              message: "CSV report downloaded.",
            });
            return;
          }

          const pdf = await generateAdlaWattPdf(reportData);
          const filename = `adlawatt_${frequency.toLowerCase()}_report_${new Date()
            .toISOString()
            .slice(0, 10)}.pdf`;

          downloadPdfOnWeb(pdf, filename);
          setExportStatus({
            kind: "success",
            message: "PDF report downloaded.",
          });
          return;
        } catch {
          setExportStatus({
            kind: "error",
            message:
              "The report could not be generated. Please try again.",
          });
          return;
        }
      }

      setExportingReport(reportType);

      try {
        const reportData = prepareReportData(
          monitoringHistory,
          frequency,
          range,
        );
        const { buildReportCsvFile, buildReportPdfFile } = await import(
          "@/services/reportPrint"
        );
        const reportFile =
          reportType === "CSV"
            ? await buildReportCsvFile(reportData)
            : await buildReportPdfFile(reportData);

        const { saveReportFileToDownloads } = await import(
          "@/services/reportStorage"
        );
        const saved = await saveReportFileToDownloads(
          reportFile.uri,
          reportFile.filename,
          reportFile.mimeType,
        );

        if (saved) {
          setSavedReport({ ...reportFile, folderLabel: saved.folderLabel });
          setExportSheetVisible(true);
          setExportStatus({
            kind: "success",
            message: `${reportType} report saved to ${saved.folderLabel}.`,
          });
          return;
        }

        await openReportDirectly(reportFile);
        setExportStatus({
          kind: "success",
          message: `${reportType} report opened — allow folder access to save a copy.`,
        });
      } catch {
        setExportStatus({
          kind: "error",
          message: "The report could not be generated. Please try again.",
        });
      } finally {
        setExportingReport(null);
      }
    },
    [exportingReport, frequency, monitoringHistory, openReportDirectly, range],
  );

  const exportResult: ReportExportResult = savedReport
    ? {
        filename: savedReport.filename,
        folderLabel: savedReport.folderLabel,
      }
    : null;

  const openExportedReport = useCallback(async () => {
    const saved = savedReport;
    if (!saved) {
      return;
    }

    setExportSheetVisible(false);

    try {
      await openReportDirectly(saved);
    } catch {
      setExportStatus({
        kind: "error",
        message: "The report could not be opened. Please try again.",
      });
    }
  }, [savedReport, openReportDirectly]);

  const handleFrequencyChange = useCallback((next: ChartFrequency) => {
    setFrequency(next);
    setRange(createFrequencyRange(next));
  }, []);

  const setFromDate = useCallback((date: Date) => {
    setRange((currentRange) => {
      const today = new Date();
      const from = new Date(
        Math.min(date.getTime(), today.getTime()),
      );
      const end =
        from.getTime() > currentRange.end.getTime()
          ? from
          : currentRange.end;

      return { start: from, end };
    });
  }, []);

  const setToDate = useCallback((date: Date) => {
    setRange((currentRange) => {
      const today = new Date();
      const to = new Date(Math.min(date.getTime(), today.getTime()));
      const end =
        to.getTime() < currentRange.start.getTime()
          ? currentRange.start
          : to;

      return { start: currentRange.start, end };
    });
  }, []);

  return (
    <ScreenContainer2 scrollToTop={scrollToTop}>
      <NavBar />

      <ScrollVisibilityProvider visibility={scrollVisibility}>
        <PullRefreshScroll
          scrollRef={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: screenPadding },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            scrollYRef.current = offsetY;
            scrollVisibility.notify(offsetY);
            scrollToTop.reportScroll(event);
          }}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleViewportLayout}
          onScrollBeginDrag={handleScrollBeginDrag}
          scrollEventThrottle={16}
          refreshing={refreshing}
          onRefresh={onRefresh}
          refreshLabel={t("dashboard.common.pullToRefresh")}
          refreshTint={colors.primary}
          testID="pull-scroll"
        >
          <View style={styles.headerCard}>
            <AppText variant="heading" style={styles.headerTitle}>
              {t("dashboard.analytics.title")}
            </AppText>
            <AppText variant="caption" style={styles.headerSubtitle}>
              {t("dashboard.analytics.subtitle")}
            </AppText>
          </View>

          <View style={styles.quickNavRow}>
            <Pressable
              onPress={() => scrollToBottom()}
              accessibilityRole="button"
              accessibilityLabel={t(
                "dashboard.analytics.goToGenerateReport",
              )}
              style={({ pressed }) => [
                styles.quickNavButton,
                pressed && styles.quickNavButtonPressed,
              ]}
            >
              <AppText variant="caption" style={styles.quickNavButtonText}>
                {t("dashboard.analytics.generateReport")}
              </AppText>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={colors.onPrimary}
              />
            </Pressable>
          </View>

          <LazyCard
            title="Solar Energy"
            subtitle="Energy collected per period, with peak output, peak sun, and charge start."
            icon="sunny-outline"
          >
            <SolarEnergyChart points={cardData.solar} />
          </LazyCard>

          <LazyCard
            title="Load Energy"
            subtitle="Energy used per period, with average and peak load."
            icon="bulb-outline"
          >
            <LoadEnergyChart points={cardData.load} />
          </LazyCard>

          <LazyCard
            title="Battery Activity"
            subtitle="How often the battery charges, discharges, and idles in this range."
            icon="battery-half-outline"
          >
            <BatteryActivityChart slices={activitySlices} />
          </LazyCard>

          <View style={styles.section}>
            <AnalyticsCards
              frequency={frequency}
              onFrequencyChange={handleFrequencyChange}
              range={range}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              generateReport={generateReport}
              exporting={exportingReport !== null}
              exportingType={exportingReport}
              status={exportStatus}
              exportResult={exportResult}
              exportSheetVisible={exportSheetVisible}
              onOpenExportedReport={openExportedReport}
              onDismissExportResult={() => setExportSheetVisible(false)}
            />
          </View>

          <Copyright />
        </PullRefreshScroll>
      </ScrollVisibilityProvider>
    </ScreenContainer2>
  );
}

const analyticsDimensions = {
  horizontalPadding: 16,
  sectionSpacing: 18,
  headerRadius: 16,
  headerBorderWidth: 3,
  contentBottomPadding: 24,
};

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: analyticsDimensions.horizontalPadding,
      paddingTop: analyticsDimensions.sectionSpacing,
      paddingBottom: analyticsDimensions.contentBottomPadding,
    },
    headerCard: {
      backgroundColor: colors.glass.white,
      borderWidth: analyticsDimensions.headerBorderWidth,
      borderColor: colors.cardBorder,
      borderRadius: analyticsDimensions.headerRadius,
      padding: 18,
      marginBottom: 20,
    },
    headerTitle: {
      color: colors.text,
      fontWeight: "700",
    },
    headerSubtitle: {
      color: colors.textSecondary,
      marginTop: 6,
      lineHeight: 20,
    },
    quickNavRow: {
      width: "100%",
      alignItems: "center",
      gap: 10,
      marginBottom: 18,
    },
    quickNavButton: {
      width: "100%",
      maxWidth: 360,
      minHeight: Control.button,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
    },
    quickNavButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    quickNavButtonPressed: {
      backgroundColor: colors.primaryPressed,
    },
    section: {
      width: "100%",
      marginBottom: analyticsDimensions.sectionSpacing,
    },
  });
