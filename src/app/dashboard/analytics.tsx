import { Ionicons } from "@expo/vector-icons";
import AnalyticsCards, {
  type ReportExportResult,
  type ReportExportStatus,
} from "@/components/AnalyticsCard";
import Copyright from "@/components/ui/Copyright";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import AppText from "@/components/ui/AppText";
import AnalyticsChartCard from "@/components/AnalyticsChartCard";
import type { AnalyticsChartCardProps } from "@/components/AnalyticsChartCard";
import LazyMount, {
  ScrollVisibilityProvider,
  createScrollVisibility,
} from "@/components/LazyMount";
import BatteryLevelChart, {
  BatteryLevelPoint,
} from "@/components/charts/BatteryLevelChart";
import UnsafeDischargeChart from "@/components/charts/UnsafeDischargeChart";
import BatteryActivityChart from "@/components/charts/BatteryActivityChart";
import SolarVsLoadChart from "@/components/charts/SolarVsLoadChart";
import BestSunDaysChart from "@/components/charts/BestSunDaysChart";
import SunHoursChart from "@/components/charts/SunHoursChart";
import SolarCurveByHourChart from "@/components/charts/SolarCurveByHourChart";
import EnergyInOutChart from "@/components/charts/EnergyInOutChart";
import NetEnergyChart from "@/components/charts/NetEnergyChart";
import RunningBalanceChart from "@/components/charts/RunningBalanceChart";
import SolarCoverageChart from "@/components/charts/SolarCoverageChart";
import TemperaturesChart from "@/components/charts/TemperaturesChart";
import TemperatureAlertsChart from "@/components/charts/TemperatureAlertsChart";
import UptimeChart from "@/components/charts/UptimeChart";
import OnlineOfflineChart from "@/components/charts/OnlineOfflineChart";
import AvgPeakLoadChart from "@/components/charts/AvgPeakLoadChart";
import PowerByHourChart from "@/components/charts/PowerByHourChart";
import {
  DropdownModal,
  RadioOptionRow,
} from "@/components/ui/DropdownModal";
import { useAppColors, type AppColors } from "@/hooks/useAppColors";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useScrollToTopController } from "@/hooks/useScrollToTopController";
import PullRefreshScroll from "@/components/PullRefreshScroll";
import { Radius } from "@/constants/theme";
import { Control, useScreenPadding } from "@/constants/sizing";
import { useTranslation } from "react-i18next";
import {
  AnalyticsRange,
  ChartFrequency,
  MonitoringHistoryRow,
  REPORT_FREQUENCIES,
  ReportFrequency,
  ReportType,
  createPresetRange,
  downloadCsvOnWeb,
  downloadPdfOnWeb,
  generateAdlaWattCsv,
  generateAdlaWattPdf,
  getBatteryChartRangeData,
  getBatteryActivityData,
  getBatteryTemperatureData,
  getBestSunDaysData,
  getDefaultRange,
  getEnergyInputChartData,
  getEnergyOutputChartData,
  getInteriorTemperatureData,
  getLoadVsPeakData,
  getNetEnergyData,
  getOnlineShareData,
  getPowerByHourData,
  getRunningBalanceData,
  getSolarCoverageData,
  getSolarCurveByHourData,
  getSolarTemperatureData,
  getSolarVsLoadData,
  getSunHoursData,
  getTemperatureAlertsData,
  getUptimeData,
  getUnsafeDischargeChartData,
  groupMonitoringHistory,
  loadAnalyticsData,
  prepareReportData,
  type BatteryActivitySlice,
  type UnsafeBarPoint,
} from "@/services/analyticsService";
import type { ReportFile } from "@/services/reportPrint";
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
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { captureAppError } from "@/services/sentry";
import { useLocalSearchParams } from "expo-router";

/* ============================================================
   QUICK-NAV SCROLL
   ============================================================ */

// Jump duration for the "Generate Report" quick-nav. Deliberately
// short: the target is the very end of a long feed, and a long
// tween across the whole screen reads as lag, not as motion.
const QUICK_NAV_SCROLL_BOTTOM_MS = 400;

// Catch-up tween used when lazily mounted sections swap their
// placeholders for real heights while the jump is in flight.
const QUICK_NAV_CATCH_UP_MS = 200;

// How long an explicit jump keeps re-snapping to the bottom, so
// a section that mounts late cannot leave the view short of the
// end it was asked to reach.
const QUICK_NAV_BOTTOM_PIN_MS = 2000;

/* ============================================================
   LAZY CHART CARD
   ============================================================

   AnalyticsChartCard is shared with the admin + manual screens,
   so the lazy gate lives here rather than in the card itself.
   Chart bodies are a fixed CHART_HEIGHT (240) plus a stats strip
   and the card header, so ~380 is a close placeholder height and
   the scroll length stays stable while off-screen. */

function LazyCard(
  props: AnalyticsChartCardProps,
) {
  return (
    <LazyMount>
      <AnalyticsChartCard {...props} />
    </LazyMount>
  );
}

/* ============================================================
   SCREEN
   ============================================================ */

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const colors = useAppColors();

  // Responsive gutter: 16/20/24 by phone width (UI-STANDARDS.md).
  const screenPadding = useScreenPadding();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  /* ==========================================================
     QUICK-NAV SCROLL TARGETS
     ========================================================== */

  const scrollRef = useRef<ScrollView>(null);

  const scrollToTop =
    useScrollToTopController(scrollRef);

  // Shared scroll offset for the lazy chart sections. Created
  // once; consumers subscribe instead of re-rendering the whole
  // (very large) screen on every scroll frame.
  const [scrollVisibility] = useState(
    () => createScrollVisibility(),
  );

  const scrollYRef = useRef(0);

  // Content and viewport heights, mirrored into refs (never
  // state) so the very large screen is not re-rendered every
  // time a lazy section reports its size.
  const contentHeightRef = useRef(0);

  const viewportHeightRef = useRef(0);

  // Timestamp until which the quick-nav jump keeps re-snapping
  // to the bottom. Cleared when the user drags, so the pin can
  // never fight a real gesture.
  const bottomPinUntilRef = useRef(0);

  // Deep link from the manual's "Generate Report" button:
  // /dashboard/analytics?focus=report. Tracked as a ref so the
  // arrival scroll fires once, on the first measurement.
  const params = useLocalSearchParams<{
    focus?: string | string[];
  }>();

  const focusParam = Array.isArray(params.focus)
    ? params.focus[0]
    : params.focus;

  const focusParamHandledRef = useRef(false);

  // Stable Animated driver for the quick-nav scroll transition.
  // useState initializer (not useRef().current) per
  // react-hooks/refs: ref values must not be read on render.
  const [scrollOffset] = useState(
    () => new Animated.Value(0),
  );

  const [
    monitoringHistory,
    setMonitoringHistory,
  ] = useState<MonitoringHistoryRow[]>([]);

  // Which report format is currently being built, if any. Kept
  // per-format (instead of one shared boolean) so only the button
  // the user actually tapped shows "Preparing..." — the other
  // stays labelled while still being disabled during the export.
  const [
    exportingReport,
    setExportingReport,
  ] = useState<ReportType | null>(null);

  const [
    exportStatus,
    setExportStatus,
  ] = useState<ReportExportStatus>(
    null,
  );

  // Native export outcome: the built file plus the folder it
  // was saved into. Drives the post-export sheet, and is kept
  // after the sheet closes so "Open file" still has its handle.
  const [
    savedReport,
    setSavedReport,
  ] = useState<
    | (ReportFile & {
        folderLabel: string;
      })
    | null
  >(null);

  const [
    exportSheetVisible,
    setExportSheetVisible,
  ] = useState(false);

  const [
    reportFrequency,
    setReportFrequency,
  ] = useState<ReportFrequency>(
    "Daily",
  );

  const [
    reportModalVisible,
    setReportModalVisible,
  ] = useState(false);

  const [
    range,
    setRange,
  ] = useState<AnalyticsRange>(
    getDefaultRange(),
  );

  const [
    batteryFrequency,
    setBatteryFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    unsafeFrequency,
    setUnsafeFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    solarLoadFrequency,
    setSolarLoadFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    bestSunFrequency,
    setBestSunFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    sunHoursFrequency,
    setSunHoursFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    energyFrequency,
    setEnergyFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    netFrequency,
    setNetFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    balanceFrequency,
    setBalanceFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    coverageFrequency,
    setCoverageFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    tempFrequency,
    setTempFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    alertsFrequency,
    setAlertsFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    uptimeFrequency,
    setUptimeFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const [
    loadFrequency,
    setLoadFrequency,
  ] = useState<ChartFrequency>(
    "Daily",
  );

  const batteryPoints =
    useMemo<BatteryLevelPoint[]>(() => {
      const buckets =
        groupMonitoringHistory(
          monitoringHistory,
          batteryFrequency,
        );

      return getBatteryChartRangeData(
        buckets,
        batteryFrequency,
      );
    }, [
      monitoringHistory,
      batteryFrequency,
    ]);

  const unsafePoints =
    useMemo<UnsafeBarPoint[]>(() => {
      const buckets =
        groupMonitoringHistory(
          monitoringHistory,
          unsafeFrequency,
        );

      return getUnsafeDischargeChartData(
        buckets,
        unsafeFrequency,
      );
    }, [
      monitoringHistory,
      unsafeFrequency,
    ]);

  const activitySlices =
    useMemo<BatteryActivitySlice[]>(() => {
      // Range total: grouping is invariant (sum across buckets
      // equals sum across rows), so a fixed bucketing is used
      // and no frequency toggle is shown for this card.
      const buckets =
        groupMonitoringHistory(
          monitoringHistory,
          "Daily",
        );

      return getBatteryActivityData(
        buckets,
      );
    }, [monitoringHistory]);

  const solarLoadPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        solarLoadFrequency,
      );

    return getSolarVsLoadData(
      buckets,
      solarLoadFrequency,
    );
  }, [
    monitoringHistory,
    solarLoadFrequency,
  ]);

  const bestSunPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        bestSunFrequency,
      );

    return getBestSunDaysData(
      buckets,
      bestSunFrequency,
    );
  }, [
    monitoringHistory,
    bestSunFrequency,
  ]);

  const sunHoursPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        sunHoursFrequency,
      );

    return getSunHoursData(
      buckets,
      sunHoursFrequency,
    );
  }, [
    monitoringHistory,
    sunHoursFrequency,
  ]);

  // Hour-of-day cuts across dates, so the curve reads raw rows
  // directly and always yields the fixed 24 hourly buckets.
  // No frequency toggle: the curve shape is the point.
  const solarCurvePoints = useMemo(
    () => getSolarCurveByHourData(monitoringHistory),
    [monitoringHistory],
  );

  const energyInPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        energyFrequency,
      );

    return getEnergyInputChartData(
      buckets,
      energyFrequency,
    );
  }, [
    monitoringHistory,
    energyFrequency,
  ]);

  const energyOutPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        energyFrequency,
      );

    return getEnergyOutputChartData(
      buckets,
      energyFrequency,
    );
  }, [
    monitoringHistory,
    energyFrequency,
  ]);

  const netPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        netFrequency,
      );

    return getNetEnergyData(
      buckets,
      netFrequency,
    );
  }, [
    monitoringHistory,
    netFrequency,
  ]);

  const balancePoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        balanceFrequency,
      );

    return getRunningBalanceData(
      buckets,
      balanceFrequency,
    );
  }, [
    monitoringHistory,
    balanceFrequency,
  ]);

  const coveragePoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        coverageFrequency,
      );

    return getSolarCoverageData(
      buckets,
      coverageFrequency,
    );
  }, [
    monitoringHistory,
    coverageFrequency,
  ]);

  const battTempPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        tempFrequency,
      );

    return getBatteryTemperatureData(
      buckets,
      tempFrequency,
    );
  }, [
    monitoringHistory,
    tempFrequency,
  ]);

  const solarTempPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        tempFrequency,
      );

    return getSolarTemperatureData(
      buckets,
      tempFrequency,
    );
  }, [
    monitoringHistory,
    tempFrequency,
  ]);

  const interiorTempPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        tempFrequency,
      );

    return getInteriorTemperatureData(
      buckets,
      tempFrequency,
    );
  }, [
    monitoringHistory,
    tempFrequency,
  ]);

  const tempAlertsPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        alertsFrequency,
      );

    return getTemperatureAlertsData(
      buckets,
      alertsFrequency,
    );
  }, [
    monitoringHistory,
    alertsFrequency,
  ]);

  const uptimePoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        uptimeFrequency,
      );

    return getUptimeData(
      buckets,
      uptimeFrequency,
    );
  }, [
    monitoringHistory,
    uptimeFrequency,
  ]);

  // Range total: grouping is invariant (sum across buckets
  // equals sum across rows), so a fixed bucketing is used
  // and no frequency toggle is shown for this card.
  const onlineShare = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        "Daily",
      );

    return getOnlineShareData(buckets);
  }, [monitoringHistory]);

  const loadVsPeakPoints = useMemo(() => {
    const buckets =
      groupMonitoringHistory(
        monitoringHistory,
        loadFrequency,
      );

    return getLoadVsPeakData(
      buckets,
      loadFrequency,
    );
  }, [
    monitoringHistory,
    loadFrequency,
  ]);

  // Hour-of-day cuts across dates: raw rows straight to the
  // fixed 24 hourly buckets. No frequency toggle.
  const powerByHourPoints = useMemo(
    () => getPowerByHourData(monitoringHistory),
    [monitoringHistory],
  );

  const loadAnalytics =
    useCallback(
      async () => {
        const {
          monitoringHistory:
          monitoringRows,
        } = await loadAnalyticsData(
          range,
        );

        setMonitoringHistory(
          monitoringRows,
        );
      },
      [range],
    );

  // Mount + range-change fetch: setState lands in the async
  // loadAnalytics continuation, not synchronously in the body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- range-driven history fetch is the effect's purpose
    loadAnalytics();
  }, [loadAnalytics]);

  // Pull-to-refresh re-runs the same range fetch; charts
  // recompute from the fresh rows via the memos above. No
  // cooldown — the shared hook collapses repeat pulls.
  const {
    refreshing: analyticsRefreshing,
    onRefresh: onAnalyticsRefresh,
  } = usePullToRefresh(loadAnalytics);

  /* ==========================================================
     QUICK NAV — EXACT-BOTTOM SCROLL
     ========================================================== */

  // Drive the ScrollView with an Animated.Value so the
  // quick-nav transition can be tweened rather than jumped.
  useEffect(() => {
    const scrollListenerId = scrollOffset.addListener(
      ({ value }) => {
        scrollRef.current?.scrollTo({
          y: value,
          animated: false,
        });
      },
    );

    return () => {
      scrollOffset.removeListener(scrollListenerId);
    };
  }, [scrollOffset]);

  // The bottom is computed, never measured: content height minus
  // viewport height is exact regardless of how much above it lazy
  // sections add when they mount. (Measuring the report panel's
  // top is what used to stop short — its position is not the end
  // of the feed, and it kept moving mid-animation.)
  const maxScrollOffset = () =>
    Math.max(
      0,
      contentHeightRef.current -
        viewportHeightRef.current,
    );

  const scrollToBottom = ({
    animated = true,
  }: { animated?: boolean } = {}) => {
    if (!scrollRef.current) {
      return;
    }

    // Stay pinned for a short window: LazyMount placeholders are
    // estimated (see LazyCard) and swap to real heights during
    // and just after the jump, so each swap moves the true end.
    bottomPinUntilRef.current =
      Date.now() + QUICK_NAV_BOTTOM_PIN_MS;

    // Deep-link arrival lands in the same frame: the screen has
    // only just appeared, so there is nothing to tween from.
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
      // An interrupted tween was superseded by a catch-up
      // (see below) that owns the final position.
      if (!finished) {
        return;
      }

      // Settle exactly on the bottom; later growth re-snaps
      // through onContentSizeChange while the pin holds.
      scrollOffset.setValue(maxScrollOffset());
    });
  };

  // ?focus=report wants the report panel, so it wants the end of
  // the feed. Waits until both heights are real (the first
  // onContentSizeChange / onLayout pair) so the landing offset is
  // not computed against a zero viewport.
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

  // Tracks the real content height and, while a jump is pinned,
  // chases the end as lazy sections replace their placeholders.
  const handleContentSizeChange = (
    _width: number,
    height: number,
  ) => {
    contentHeightRef.current = height;

    applyFocusParam();

    if (Date.now() >= bottomPinUntilRef.current) {
      return;
    }

    const target = maxScrollOffset();

    // Chase downward only. If content shrank (a section
    // collapsed) the user is not yanked back up.
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

  const handleViewportLayout = (
    event: LayoutChangeEvent,
  ) => {
    viewportHeightRef.current =
      event.nativeEvent.layout.height;

    // The viewport can be the last of the two measurements to
    // land, so the deep link waits for it here too.
    applyFocusParam();
  };

  // A drag means the user has taken over: drop the pin so the
  // scroll never snaps back under their finger.
  const handleScrollBeginDrag = () => {
    bottomPinUntilRef.current = 0;
  };

  /* ==========================================================
     REPORT
     ========================================================== */

  // Opens a built report in an external app — never in AdlaWatt
  // and never through a share sheet. Used by both the post-export
  // panel and the declined folder-grant path so every export ends
  // in an external handoff.
  //
  // Android imports reportOpen lazily so expo-intent-launcher is
  // only ever evaluated there; iOS has no ACTION_VIEW and keeps
  // the system preview path.
  const openReportDirectly = useCallback(
    async (file: ReportFile) => {
      if (Platform.OS === "android") {
        const {
          openReportWithSystemApp,
        } = await import(
          "@/services/reportOpen"
        );

        await openReportWithSystemApp(file);

        return;
      }

      const { openReportPdfFile } =
        await import(
          "@/services/reportPrint"
        );

      await openReportPdfFile(file);
    },
    [],
  );

  const generateReport =
    useCallback(
      async (
        reportType: ReportType,
      ) => {
        if (exportingReport !== null) {
          return;
        }

        if (
          monitoringHistory.length ===
          0
        ) {
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

        /* ======================================================
           WEB EXPORT (jsPDF template)
           ====================================================== */

        if (
          Platform.OS === "web"
        ) {
          try {
            const reportData =
              prepareReportData(
                monitoringHistory,
                reportFrequency,
                range,
              );

            if (
              reportType === "CSV"
            ) {
              const csv =
                generateAdlaWattCsv(
                  reportData,
                );

              const filename =
                `adlawatt_${reportFrequency.toLowerCase()}_report_${new Date()
                  .toISOString()
                  .slice(0, 10)}.csv`;

              downloadCsvOnWeb(
                csv,
                filename,
              );

              setExportStatus({
                kind: "success",
                message:
                  "CSV report downloaded.",
              });

              return;
            }

            const pdf =
              await generateAdlaWattPdf(
                reportData,
              );

            const filename =
              `adlawatt_${reportFrequency.toLowerCase()}_report_${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`;

            downloadPdfOnWeb(
              pdf,
              filename,
            );

            setExportStatus({
              kind: "success",
              message:
                "PDF report downloaded.",
            });

            return;
          } catch (error) {
            captureAppError(error, {
              flow: "analytics-report",
              platform: "web",
              reportType,
            });

            setExportStatus({
              kind: "error",
              message:
                "The report could not be generated. Please try again.",
            });

            return;
          }
        }

        /* ======================================================
           NATIVE ANDROID / IOS EXPORT
           Real files: PDF via expo-print HTML, CSV via the
           shared CSV generator. Both are built into the app
           cache, then copied into a user-visible Download folder
           through the Storage Access Framework. Nothing reaches
           a share chooser: when the folder grant is declined the
           built file opens directly instead.
           Native modules are lazy-bound here (dynamic import)
           so tab mount never evaluates expo-print/file-system
           on release — web shims survive the static import but
           Fabric can throw at load.
           ====================================================== */

        setExportingReport(reportType);

        try {
          const reportData =
            prepareReportData(
              monitoringHistory,
              reportFrequency,
              range,
            );

          // Lazy-bound: only evaluated on actual export press.
          const {
            buildReportCsvFile,
            buildReportPdfFile,
          } = await import(
            "@/services/reportPrint"
          );

          const reportFile =
            reportType === "CSV"
              ? await buildReportCsvFile(
                  reportData,
                )
              : await buildReportPdfFile(
                  reportData,
                );

          const {
            saveReportFileToDownloads,
          } = await import(
            "@/services/reportStorage"
          );

          // null means the folder prompt was declined (or SAF
          // is unavailable): open the built file directly so an
          // export is never blocked, still with no share sheet.
          const saved =
            await saveReportFileToDownloads(
              reportFile.uri,
              reportFile.filename,
              reportFile.mimeType,
            );

          if (saved) {
            setSavedReport({
              ...reportFile,
              folderLabel:
                saved.folderLabel,
            });

            setExportSheetVisible(true);

            setExportStatus({
              kind: "success",
              message: `${reportType} report saved to ${saved.folderLabel}.`,
            });

            return;
          }

          await openReportDirectly(
            reportFile,
          );

          setExportStatus({
            kind: "success",
            message: `${reportType} report opened — allow folder access to save a copy.`,
          });
        } catch (error) {
          captureAppError(error, {
            flow: "analytics-report",
            platform: Platform.OS,
            reportType,
          });

          setExportStatus({
            kind: "error",
            message:
              "The report could not be generated. Please try again.",
          });
        } finally {
          setExportingReport(null);
        }
      },
      [
        exportingReport,
        monitoringHistory,
        openReportDirectly,
        reportFrequency,
        range,
      ],
    );

  /* ==========================================================
     SAVED REPORT SHEET
     ========================================================== */

  // What the card renders: the sheet only needs the name and
  // the folder, not the file handle.
  const exportResult: ReportExportResult =
    savedReport
      ? {
          filename:
            savedReport.filename,
          folderLabel:
            savedReport.folderLabel,
        }
      : null;

  // Opens the saved report directly — the PDF in the system
  // document preview, the CSV in the in-app viewer. No share
  // sheet is involved at any point.
  const openExportedReport =
    useCallback(async () => {
      const saved = savedReport;

      if (!saved) {
        return;
      }

      // Close first: the viewer covers the screen anyway, and
      // a second tap cannot fire the open twice while the
      // first one is still starting.
      setExportSheetVisible(false);

      try {
        await openReportDirectly(saved);
      } catch (error) {
        captureAppError(error, {
          flow: "analytics-report",
          platform: Platform.OS,
          reportType: "open",
        });

        setExportStatus({
          kind: "error",
          message:
            "The report could not be opened. Please try again.",
        });
      }
    }, [savedReport, openReportDirectly]);

  /* ==========================================================
     DATE RANGE
     ========================================================== */

  const setFromDate =
    useCallback(
      (
        date: Date,
      ) => {
        setRange(
          (currentRange) => {
            const today =
              new Date();

            const from =
              new Date(
                Math.min(
                  date.getTime(),
                  today.getTime(),
                ),
              );

            const end =
              from.getTime() >
              currentRange.end.getTime()
                ? from
                : currentRange.end;

            return {
              start: from,
              end,
            };
          },
        );
      },
      [],
    );

  const setToDate =
    useCallback(
      (
        date: Date,
      ) => {
        setRange(
          (currentRange) => {
            const today =
              new Date();

            const to =
              new Date(
                Math.min(
                  date.getTime(),
                  today.getTime(),
                ),
              );

            const end =
              to.getTime() <
              currentRange.start.getTime()
                ? currentRange.start
                : to;

            return {
              start:
                currentRange.start,
              end,
            };
          },
        );
      },
      [],
    );

  /*
   * Quick range preset (7D/30D/90D/1Y). Presets never exceed
   * today, matching the custom pickers so the query window and
   * the displayed range stay consistent.
   */
  const handlePresetSelect =
    useCallback(
      (days: number) => {
        const today =
          new Date();

        const preset =
          createPresetRange(days);

        setRange({
          start: preset.start,
          end:
            preset.end.getTime() >
            today.getTime()
              ? today
              : preset.end,
        });
      },
      [],
    );

  return (
    <ScreenContainer2 scrollToTop={scrollToTop}>
      {/* Fixed Navbar */}
      <NavBar />

      <ScrollVisibilityProvider
        visibility={scrollVisibility}
      >
        <PullRefreshScroll
          scrollRef={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: screenPadding },
          ]}
          showsVerticalScrollIndicator={
            false
          }
          onScroll={(event) => {
            const offsetY =
              event.nativeEvent.contentOffset
                .y;

            scrollYRef.current = offsetY;

            scrollVisibility.notify(offsetY);

            scrollToTop.reportScroll(event);
          }}
          onContentSizeChange={
            handleContentSizeChange
          }
          onLayout={handleViewportLayout}
          onScrollBeginDrag={
            handleScrollBeginDrag
          }
          scrollEventThrottle={16}
          refreshing={analyticsRefreshing}
          onRefresh={onAnalyticsRefresh}
          refreshLabel={t(
            "dashboard.common.pullToRefresh",
          )}
          refreshTint={colors.primary}
          testID="pull-scroll"
        >
        {/* ======================================================
            ANALYTICS HEADER
        ====================================================== */}
        <View
          style={
            styles.headerCard
          }
        >
          <AppText
            variant="heading"
            style={
              styles.headerTitle
            }
          >
            {t("dashboard.analytics.title")}
          </AppText>

          <AppText
            variant="caption"
            style={
              styles.headerSubtitle
            }
          >
            {t("dashboard.analytics.subtitle")}
          </AppText>
        </View>

        {/* ======================================================
            QUICK NAV BUTTONS
        ====================================================== */}

        <View style={styles.quickNavRow}>
          <Pressable
            onPress={() => scrollToBottom()}
            accessibilityRole="button"
            accessibilityLabel={t(
              "dashboard.analytics.goToGenerateReport",
            )}
            style={({ pressed }) => [
              styles.quickNavButton,
              pressed &&
                styles.quickNavButtonPressed,
            ]}
          >
            <AppText
              variant="caption"
              style={styles.quickNavButtonText}
            >
              {t("dashboard.analytics.generateReport")}
            </AppText>

            <Ionicons
              name="arrow-forward"
              size={16}
              color={colors.onPrimary}
            />
          </Pressable>
        </View>

        {/* ======================================================
            BATTERY SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionBattery")}
        </AppText>

        <LazyCard
          title="Battery Level Over Time"
          subtitle="Average battery level per period, with the unsafe zone below the 20% safety floor marked."
          icon="battery-half-outline"
          frequency={batteryFrequency}
          onFrequencyChange={
            setBatteryFrequency
          }
        >
          <BatteryLevelChart
            points={batteryPoints}
          />
        </LazyCard>

        <LazyCard
          title="Unsafe Discharge Events"
          subtitle="Snapshots below 20% per period. Lower is better."
          icon="warning-outline"
          frequency={unsafeFrequency}
          onFrequencyChange={
            setUnsafeFrequency
          }
        >
          <UnsafeDischargeChart
            points={unsafePoints}
          />
        </LazyCard>

        <LazyCard
          title="Battery Activity"
          subtitle="How often it charges vs drains."
          icon="battery-half-outline"
        >
          <BatteryActivityChart
            slices={activitySlices}
          />
        </LazyCard>

        {/* ======================================================
            SOLAR SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionSolar")}
        </AppText>

        <LazyCard
          title="Solar vs Load"
          subtitle="Whether the sun covers demand."
          icon="sunny-outline"
          frequency={solarLoadFrequency}
          onFrequencyChange={
            setSolarLoadFrequency
          }
        >
          <SolarVsLoadChart
            points={solarLoadPoints}
          />
        </LazyCard>

        <LazyCard
          title="Best Sun Days"
          subtitle="Peak panel output per day."
          icon="sunny-outline"
          frequency={bestSunFrequency}
          onFrequencyChange={
            setBestSunFrequency
          }
        >
          <BestSunDaysChart
            points={bestSunPoints}
          />
        </LazyCard>

        <LazyCard
          title="Sun Hours"
          subtitle="How long the panel produced."
          icon="sunny-outline"
          frequency={sunHoursFrequency}
          onFrequencyChange={
            setSunHoursFrequency
          }
        >
          <SunHoursChart
            points={sunHoursPoints}
          />
        </LazyCard>

        <LazyCard
          title="Solar Curve by Hour"
          subtitle="Best time of day for the sun."
          icon="sunny-outline"
        >
          <SolarCurveByHourChart
            points={solarCurvePoints}
          />
        </LazyCard>

        {/* ======================================================
            ENERGY SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionEnergy")}
        </AppText>

        <LazyCard
          title="Energy In and Out"
          subtitle="Daily balance."
          icon="flash-outline"
          frequency={energyFrequency}
          onFrequencyChange={
            setEnergyFrequency
          }
        >
          <EnergyInOutChart
            inPoints={energyInPoints}
            outPoints={energyOutPoints}
          />
        </LazyCard>

        <LazyCard
          title="Net Energy"
          subtitle="Surplus and deficit days."
          icon="flash-outline"
          frequency={netFrequency}
          onFrequencyChange={
            setNetFrequency
          }
        >
          <NetEnergyChart
            points={netPoints}
          />
        </LazyCard>

        <LazyCard
          title="Running Balance"
          subtitle="Whether stored energy grows or shrinks."
          icon="flash-outline"
          frequency={balanceFrequency}
          onFrequencyChange={
            setBalanceFrequency
          }
        >
          <RunningBalanceChart
            points={balancePoints}
          />
        </LazyCard>

        <LazyCard
          title="Solar Coverage"
          subtitle="Percent of your use the sun covered."
          icon="flash-outline"
          frequency={coverageFrequency}
          onFrequencyChange={
            setCoverageFrequency
          }
        >
          <SolarCoverageChart
            points={coveragePoints}
          />
        </LazyCard>

        {/* ======================================================
            HEALTH SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionHealth")}
        </AppText>

        <LazyCard
          title="Temperatures"
          subtitle="Heat trends."
          icon="pulse-outline"
          frequency={tempFrequency}
          onFrequencyChange={
            setTempFrequency
          }
        >
          <TemperaturesChart
            battPoints={battTempPoints}
            solarPoints={solarTempPoints}
            interiorPoints={interiorTempPoints}
          />
        </LazyCard>

        <LazyCard
          title="Temperature Alerts"
          subtitle="Days with high or critical heat."
          icon="pulse-outline"
          frequency={alertsFrequency}
          onFrequencyChange={
            setAlertsFrequency
          }
        >
          <TemperatureAlertsChart
            points={tempAlertsPoints}
          />
        </LazyCard>

        <LazyCard
          title="Device Uptime"
          subtitle="How reliable the ESP32 link is."
          icon="pulse-outline"
          frequency={uptimeFrequency}
          onFrequencyChange={
            setUptimeFrequency
          }
        >
          <UptimeChart
            points={uptimePoints}
          />
        </LazyCard>

        <LazyCard
          title="Online vs Offline"
          subtitle="Share of time connected."
          icon="pulse-outline"
        >
          <OnlineOfflineChart
            share={onlineShare}
          />
        </LazyCard>

        {/* ======================================================
            USAGE SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionUsage")}
        </AppText>

        <LazyCard
          title="Average vs Peak Load"
          subtitle="Typical and worst-case demand."
          icon="bulb-outline"
          frequency={loadFrequency}
          onFrequencyChange={
            setLoadFrequency
          }
        >
          <AvgPeakLoadChart
            points={loadVsPeakPoints}
          />
        </LazyCard>

        <LazyCard
          title="Power Use by Hour"
          subtitle="When to avoid high-draw electronics."
          icon="bulb-outline"
        >
          <PowerByHourChart
            points={powerByHourPoints}
          />
        </LazyCard>

        {/* ======================================================
            ANALYTICS PANEL
            Report export + date-range controls.
        ====================================================== */}
        <View style={styles.section}>
          <AnalyticsCards
            reportFrequency={reportFrequency}
            setReportModalVisible={
              setReportModalVisible
            }
            range={range}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onPresetSelect={
              handlePresetSelect
            }
            generateReport={generateReport}
            exporting={exportingReport !== null}
            exportingType={exportingReport}
            status={exportStatus}
            exportResult={exportResult}
            exportSheetVisible={
              exportSheetVisible
            }
            onOpenExportedReport={
              openExportedReport
            }
            onDismissExportResult={() =>
              setExportSheetVisible(false)
            }
          />
        </View>

        {/* Copyright */}
        <Copyright />
      </PullRefreshScroll>
      </ScrollVisibilityProvider>

      {/* ========================================================
          REPORT FREQUENCY MODAL
      ======================================================== */}
      <DropdownModal
        visible={reportModalVisible}
        title="Report Frequency"
        onClose={() =>
          setReportModalVisible(false)
        }
      >
        {REPORT_FREQUENCIES.map(
          (option) => (
            <RadioOptionRow
              key={option}
              label={option}
              selected={
                reportFrequency ===
                option
              }
              onPress={() => {
                setReportFrequency(
                  option,
                );

                setReportModalVisible(
                  false,
                );
              }}
            />
          ),
        )}
      </DropdownModal>
    </ScreenContainer2>
  );
}

/* ============================================================
   DIMENSIONS
   ============================================================ */

const analyticsDimensions = {
  horizontalPadding: 16,
  sectionSpacing: 18,

  /*
   * These values are intentionally preserved
   * from the previous Analytics header.
   */

  headerRadius: 16,
  headerBorderWidth: 3,
  contentBottomPadding: 24,
};

/* ============================================================
   STYLES
   ============================================================ */

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    /* ========================================================
       MAIN SCREEN
    ======================================================== */

    scrollView: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      paddingHorizontal:
        analyticsDimensions.horizontalPadding,
      paddingTop:
        analyticsDimensions.sectionSpacing,
      paddingBottom:
        analyticsDimensions.contentBottomPadding,
    },

    /* ========================================================
       ANALYTICS HEADER
    ======================================================== */

    headerCard: {
      backgroundColor:
        colors.glass.white,
      borderWidth:
        analyticsDimensions.headerBorderWidth,
      borderColor:
        colors.cardBorder,
      borderRadius:
        analyticsDimensions.headerRadius,
      padding: 18,
      marginBottom: 20,
    },

    headerTitle: {
      color: colors.text,
      fontWeight: "700",
    },

    headerSubtitle: {
      color:
        colors.textSecondary,
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
      marginBottom:
        analyticsDimensions.sectionSpacing,
    },

    /* Plain section header: medium, readable, no caption. */
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
      paddingHorizontal: 4,
      marginTop: 4,
      marginBottom: 12,
    },
  });