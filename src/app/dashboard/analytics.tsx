import { Ionicons } from "@expo/vector-icons";
import AnalyticsCards from "@/components/AnalyticsCard";
import Copyright from "@/components/ui/Copyright";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import AppText from "@/components/ui/AppText";
import AnalyticsChartCard from "@/components/AnalyticsChartCard";
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

/* ============================================================
   QUICK-NAV SCROLL
   ============================================================ */

const QUICK_NAV_SCROLL_MS = 1500;
const QUICK_NAV_SCROLL_INSET = 12;

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

  const reportRef = useRef<View>(null);

  const scrollYRef = useRef(0);

  // Stable Animated driver for the 1.5s scroll transition.
  // useState initializer (not useRef().current) per
  // react-hooks/refs: ref values must not be read on render.
  const [scrollOffset] = useState(
    () => new Animated.Value(0),
  );

  const [
    monitoringHistory,
    setMonitoringHistory,
  ] = useState<MonitoringHistoryRow[]>([]);

  const [
    isExporting,
    setIsExporting,
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

  /* ==========================================================
     SMOOTH SCROLL-TO-SECTION
     ========================================================== */

  // Drive the ScrollView with an Animated.Value so the
  // scroll transition can run for a fixed 1.5s duration.
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

  const scrollToSection = (
    sectionRef: React.RefObject<View | null>,
  ) => {
    const section = sectionRef.current;
    const scroll = scrollRef.current;

    if (!section || !scroll) {
      return;
    }

    const nativeScroll = scroll.getNativeScrollRef();

    if (!nativeScroll) {
      return;
    }

    // Measure both views in window coordinates so the
    // target scroll offset stays correct no matter the
    // current scroll position, on native and web.
    section.measureInWindow(
      (_sx, sectionWindowY) => {
        nativeScroll.measureInWindow(
          (_fx, scrollWindowY) => {
            const target = Math.max(
              sectionWindowY -
                scrollWindowY +
                scrollYRef.current -
                QUICK_NAV_SCROLL_INSET,
              0,
            );

            scrollOffset.setValue(scrollYRef.current);

            Animated.timing(scrollOffset, {
              toValue: target,
              duration: QUICK_NAV_SCROLL_MS,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: false,
            }).start();
          },
        );
      },
    );
  };

  /* ==========================================================
     REPORT
     ========================================================== */

  const generateReport =
    useCallback(
      async (
        reportType: ReportType,
      ) => {
        if (isExporting) {
          return;
        }

        if (
          monitoringHistory.length ===
          0
        ) {
          Alert.alert(
            "No Data",
            "There is no historical analytics data available for the selected date range.",
          );

          return;
        }

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

            return;
          } catch (error) {
            console.error(
              "Web report export error:",
              error,
            );

            Alert.alert(
              "Export Error",
              "The report could not be generated.",
            );

            return;
          }
        }

        /* ======================================================
           NATIVE ANDROID / IOS EXPORT
           Real files: PDF via expo-print HTML, CSV via the
           shared CSV generator written to the cache directory.
           Both are handed to the system share sheet.
           Native modules are lazy-bound here (dynamic import)
           so tab mount never evaluates expo-print/sharing/
           file-system on release — web shims survive the
           static import but Fabric can throw at load.
           ====================================================== */

        setIsExporting(true);

        try {
          const reportData =
            prepareReportData(
              monitoringHistory,
              reportFrequency,
              range,
            );

          // Lazy-bound: only evaluated on actual export press.
          const {
            printAndSharePdf,
            saveAndShareCsv,
          } = await import(
            "@/services/reportPrint"
          );

          if (
            reportType === "CSV"
          ) {
            await saveAndShareCsv(
              reportData,
            );

            return;
          }

          await printAndSharePdf(
            reportData,
          );
        } catch (error) {
          console.error(
            "Native report export error:",
            error,
          );

          Alert.alert(
            "Export Error",
            "The report could not be generated.",
          );
        } finally {
          setIsExporting(false);
        }
      },
      [
        isExporting,
        monitoringHistory,
        reportFrequency,
        range,
      ],
    );

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

  return (
    <ScreenContainer2>
      {/* Fixed Navbar */}
      <NavBar />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        onScroll={(event) => {
          scrollYRef.current =
            event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
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
            onPress={() =>
              scrollToSection(reportRef)
            }
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

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Battery Activity"
          subtitle="How often it charges vs drains."
          icon="battery-half-outline"
        >
          <BatteryActivityChart
            slices={activitySlices}
          />
        </AnalyticsChartCard>

        {/* ======================================================
            SOLAR SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionSolar")}
        </AppText>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Solar Curve by Hour"
          subtitle="Best time of day for the sun."
          icon="sunny-outline"
        >
          <SolarCurveByHourChart
            points={solarCurvePoints}
          />
        </AnalyticsChartCard>

        {/* ======================================================
            ENERGY SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionEnergy")}
        </AppText>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        {/* ======================================================
            HEALTH SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionHealth")}
        </AppText>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Online vs Offline"
          subtitle="Share of time connected."
          icon="pulse-outline"
        >
          <OnlineOfflineChart
            share={onlineShare}
          />
        </AnalyticsChartCard>

        {/* ======================================================
            USAGE SECTION
        ====================================================== */}
        <AppText
          variant="heading"
          style={styles.sectionTitle}
        >
          {t("dashboard.analytics.sectionUsage")}
        </AppText>

        <AnalyticsChartCard
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
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Power Use by Hour"
          subtitle="When to avoid heavy appliances."
          icon="bulb-outline"
        >
          <PowerByHourChart
            points={powerByHourPoints}
          />
        </AnalyticsChartCard>

        {/* ======================================================
            ANALYTICS PANEL
            Report export + date-range controls.
        ====================================================== */}
        <View
          ref={reportRef}
          collapsable={false}
          style={styles.section}
        >
          <AnalyticsCards
            reportFrequency={reportFrequency}
            setReportModalVisible={
              setReportModalVisible
            }
            range={range}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            generateReport={generateReport}
            exporting={isExporting}
          />
        </View>

        {/* Copyright */}
        <Copyright />
      </ScrollView>

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