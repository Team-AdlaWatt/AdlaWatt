import { Ionicons } from "@expo/vector-icons";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import Svg, {
  Circle,
  Line,
} from "react-native-svg";

import AppText from "@/components/ui/AppText";
import { Colors } from "@/constants/colors";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

import type { ForecastResult } from "@/services/forecast";

import { MonitoringData } from "@/services/monitoringService";

import {
  formatBestSunSummary,
  formatClockTime,
  formatDataAge,
  formatForecastDay,
  isStaleReading,
  resolveTodayDisplay,
  todayEstimateSubtext,
  todaySkyNote,
  todayUnavailableLabel,
} from "@/services/weatherConfig";

// ============================================================
// TYPES
// ============================================================

type ChartType =
  | "battery"
  | "voltage"
  | "watt_hour"
  | "solar"
  | "solar_voltage"
  | "solar_current"
  | "solar_energy"
  | "solar_timer"
  | "load"
  | "weather"
  | "temperature"
  | "solar_temperature"
  | "dod";

type TemperatureStatus =
  | "Nominal"
  | "Elevated"
  | "High"
  | "Critical";

interface WeatherData {
  city: string;
  temperature: number;
  feelsLike?: number;
  description: string;
  mainGroup?: string;
  observedAt?: number;
  isFallback?: boolean;
  // Id-based classifier fields (service v2). Absent on
  // legacy objects — the Today card shows neutral instead.
  conditionId?: number;
  iconCode?: string;
  rainMm?: number | null;
  cacheVersion?: number;
}

type NonBatteryChartType =
  Exclude<ChartType, "battery">;

// ============================================================
// CARD DATA
// ============================================================

interface CardData {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  // Secondary honest line ("Actual 33°C") shown when the
  // primary value is feels-like. Separate from subtext so
  // honesty notes are never overwritten.
  feelsLike?: string;
  badge?: string;
  // Honesty note under the badge
  // ("Not confirmed nearby" / "Estimate").
  subtext?: string;
  badgeStyle?: object;
  badgeTextStyle?: object;
}

// ============================================================
// PROPS
// ============================================================

interface ChartCardProps {
  type: ChartType;
  monitoring: MonitoringData | null;
  weather?: WeatherData | null;
  loading: boolean;
  forecast?: ForecastResult | null;
  forecastLoading?: boolean;
  forecastError?: string;
  // Today-card tap-to-refresh (weather type only). Absent =
  // display-only, preserving every other usage.
  onRefreshToday?: () => void;
  todayRefreshing?: boolean;
}

// ============================================================
// BATTERY GAUGE CONFIGURATION
// ============================================================

const RING_SIZE = 150;

const RADIUS = 60;

const STROKE = 11;

const CENTER =
  RING_SIZE / 2;

const CIRCUMFERENCE =
  2 * Math.PI * RADIUS;

const LOW_BATTERY_THRESHOLD = 20;

const WATT_HOURS_MIN = 0;

const WATT_HOURS_MAX = 720;

const LOW_WATT_HOURS_THRESHOLD = 144;

const LOW_VOLTAGE_THRESHOLD = 10.65;

const VOLTAGE_MIN = 9;

const VOLTAGE_MAX = 12.6;

// ============================================================
// BATTERY GAUGE ANIMATION
//
// The ring sweeps smoothly whenever the battery percentage
// changes, and while charging the gauge breathes (subtle zoom)
// with a soft pulsing glow halo in the battery color.
// ============================================================

const RING_ANIMATION_DURATION_MS = 700;

const CHARGING_PULSE_DURATION_MS = 800;

const CHARGING_SCALE_MAX = 0.04;

const CHARGING_GLOW_MIN_OPACITY = 0.12;

const CHARGING_GLOW_MAX_OPACITY = 0.4;

const CHARGING_GLOW_RADIUS_OFFSET = 3;

const CHARGING_GLOW_STROKE_OFFSET = 5;

// ============================================================
// SUN GAUGE CONFIGURATION
//
// Single-layer sun: a solid fill color driven by the solar
// status. Low = grey, Moderate = 50% yellow, High = 100%
// yellow. A smooth animated transition cross-fades between
// the three colors while the gauge stays fully colored.
//
// The color animation is driven through the Animated.Value
// listener below instead of wrapping the SVG shapes with
// Animated.createAnimatedComponent, which would leak a
// `collapsable` prop onto the DOM SVG elements on web.
// ============================================================

const SUN_RADIUS = 52;

const SUN_RAYS_STROKE = STROKE;

// Short capsule rays that float with a clear distance from the
// circle edge and stay fully inside the gauge box (no clipping).

const SUN_RAY_START = 62;

const SUN_RAY_END = 68;

const SUN_GREY = "#dcdc6d";

const SUN_MODERATE = "#EDEB44";

const SOLAR_ANIMATION_DURATION_MS = 2000;

const SOLAR_RAYS = Array.from(
  { length: 8 },
  (_, index) => {
    const angle =
      (index * Math.PI) / 4;

    return {
      x1:
        CENTER +
        SUN_RAY_START *
          Math.cos(angle),
      y1:
        CENTER +
        SUN_RAY_START *
          Math.sin(angle),
      x2:
        CENTER +
        SUN_RAY_END *
          Math.cos(angle),
      y2:
        CENTER +
        SUN_RAY_END *
          Math.sin(angle),
    };
  }
);

// ============================================================
// SUN GAUGE HELPERS
//
// The sun color is animated by a single intensity value that
// maps 0 → grey, 0.5 → 50% yellow, 1 → 100% yellow, with
// every in-between shade resolved by color interpolation.
// ============================================================

function getSolarIntensity(
  status: string | undefined,
): number {
  if (status === "High") {
    return 1;
  }

  if (status === "Moderate") {
    return 0.5;
  }

  return 0;
}

// ============================================================
// COMPONENT
// ============================================================

export default function ChartCard({
  type,
  monitoring,
  weather,
  loading,
  forecast = null,
  forecastLoading = false,
  forecastError = "",
  onRefreshToday,
  todayRefreshing = false,
}: ChartCardProps) {

  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const sunHigh = colors.secondary;

  // Reduced motion: snap gauges instead of animating so
  // vestibular-sensitive users get instant state changes.
  const [reduceMotion, setReduceMotion] =
    useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  // ==========================================================
  // SUN GAUGE ANIMATION
  //
  // A single animated intensity value drives the sun color so
  // the gauge stays fully colored (no more grey/yellow layers).
  // When the solar status flips the sun cross-fades between
  // the three colors over SOLAR_ANIMATION_DURATION_MS.
  // ==========================================================

  // Stable Animated.Values via lazy useState (no render-phase
  // ref access — react-hooks/refs). Identity + behavior unchanged.
  const [sunIntensity] = useState(
    () => new Animated.Value(0),
  );

  const [sunColor, setSunColor] =
    useState(SUN_GREY);

  const sunColorNode = useMemo(
    () =>
      sunIntensity.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [
          SUN_GREY,
          SUN_MODERATE,
          sunHigh,
        ],
      }),
    [sunIntensity, sunHigh],
  );

  const solarTarget =
    getSolarIntensity(
      monitoring?.solar_status,
    );

  // ==========================================================
  // BATTERY GAUGE ANIMATION
  //
  // A progress value drives the ring sweep (offset + count-up
  // percentage) and a looping pulse drives the charging "glow
  // and zoom" breathing effect. Both forward each tick into
  // React state so the plain SVG circle props animate without
  // the Animated.createAnimatedComponent web caveat used by
  // the sun gauge above.
  // ==========================================================

  const [ringProgress] = useState(
    () => new Animated.Value(0),
  );

  const [chargingPulse] = useState(
    () => new Animated.Value(0),
  );

  const [ringLevel, setRingLevel] =
    useState(0);

  const [chargingScale, setChargingScale] =
    useState(1);

  const [
    chargingGlowOpacity,
    setChargingGlowOpacity,
  ] = useState(0);

  const isCharging =
    monitoring?.battery_status ===
    "Charging";

  const ringTarget =
    Math.max(
      0,
      Math.min(
        100,
        monitoring?.battery_level ?? 0,
      ),
    );

  useEffect(() => {
    // Forward each ring tick into state so the SVG circle's
    // strokeDashoffset (and the displayed percentage) follow
    // the animated progress value.
    const listenerId =
      ringProgress.addListener(
        ({ value }) => {
          setRingLevel(value);
        },
      );

    return () =>
      ringProgress.removeListener(
        listenerId,
      );
  }, [ringProgress]);

  useEffect(() => {
    if (
      type !== "voltage" ||
      loading
    ) {
      return;
    }

    const animation =
      Animated.timing(
        ringProgress,
        {
          toValue: ringTarget,
          duration: reduceMotion
            ? 0
            : RING_ANIMATION_DURATION_MS,
          easing:
            Easing.out(Easing.cubic),
          useNativeDriver: false,
        },
      );

    animation.start();

    // Cancel any in-flight sweep if the percentage flips
    // again before the transition completes.
    return () =>
      animation.stop();
  }, [
    type,
    loading,
    ringTarget,
    ringProgress,
    reduceMotion,
  ]);

  useEffect(() => {
    // Forward each pulse tick into state so the gauge scale
    // and glow halo follow the looping animation.
    const listenerId =
      chargingPulse.addListener(
        ({ value }) => {
          if (!isCharging) {
            return;
          }

          setChargingScale(
            1 +
              value *
                CHARGING_SCALE_MAX,
          );

          setChargingGlowOpacity(
            CHARGING_GLOW_MIN_OPACITY +
              value *
                (CHARGING_GLOW_MAX_OPACITY -
                  CHARGING_GLOW_MIN_OPACITY),
          );
        },
      );

    return () =>
      chargingPulse.removeListener(
        listenerId,
      );
  }, [
    chargingPulse,
    isCharging,
  ]);

  useEffect(() => {
    if (
      type !== "voltage" ||
      !isCharging ||
      reduceMotion
    ) {
      chargingPulse.stopAnimation();

      chargingPulse.setValue(0);

      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset glow state when charging stops (animation external sync)
      setChargingScale(1);

      setChargingGlowOpacity(0);

      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(
          chargingPulse,
          {
            toValue: 1,
            duration:
              CHARGING_PULSE_DURATION_MS,
            easing:
              Easing.inOut(Easing.ease),
            useNativeDriver: false,
          },
        ),
        Animated.timing(
          chargingPulse,
          {
            toValue: 0,
            duration:
              CHARGING_PULSE_DURATION_MS,
            easing:
              Easing.inOut(Easing.ease),
            useNativeDriver: false,
          },
        ),
      ]),
    );

    loop.start();

    // Stop breathing once charging ends or the card
    // unmounts.
    return () => {
      loop.stop();

      chargingPulse.stopAnimation();

      chargingPulse.setValue(0);

      setChargingScale(1);

      setChargingGlowOpacity(0);
    };
  }, [
    type,
    isCharging,
    chargingPulse,
    reduceMotion,
  ]);

  useEffect(() => {
    // Forward each animation tick into React state so the
    // plain SVG shapes below keep their cross-fade without
    // requiring Animated-wrapped components.
    const listenerId =
      sunIntensity.addListener(() => {
        const interpolated =
          sunColorNode as unknown as {
            __getValue: () => string;
          };

        setSunColor(
          interpolated.__getValue(),
        );
      });

    return () =>
      sunIntensity.removeListener(listenerId);
  }, [
    sunIntensity,
    sunColorNode,
  ]);

  useEffect(() => {
    if (type !== "solar") {
      return;
    }

    const animation =
      Animated.timing(
        sunIntensity,
        {
          toValue: solarTarget,
          duration: reduceMotion
            ? 0
            : SOLAR_ANIMATION_DURATION_MS,
          useNativeDriver: false,
        },
      );

    animation.start();

    // Cancel any in-flight transition if the status
    // flips again before the 2s fade completes.
    return () =>
      animation.stop();
  }, [
    type,
    solarTarget,
    sunIntensity,
    reduceMotion,
  ]);

  // ==========================================================
  // BATTERY MONITORING GROUP
  //
  // The battery gauge block (ring + percentage + time remaining
  // + status badges) was merged into this card's left column.
  // Voltage, Watt-hour, and Load Now fill the right 2 × 3 grid.
  // ==========================================================

  if (type === "voltage") {

    const level =
      monitoring?.battery_level ?? 0;

    const isLowBattery =
      level <=
      LOW_BATTERY_THRESHOLD;

    const batteryColor =
      isLowBattery
        ? colors.error
        : colors.primary;

    const dashOffset =
      CIRCUMFERENCE *
      (1 - ringLevel / 100);

    // --------------------------------------------------------
    // BATTERY GAUGE DIRECTION
    //
    // 0%   = 12 o'clock
    // 25%  = 9 o'clock
    // 50%  = 6 o'clock
    // 75%  = 3 o'clock
    // 100% = back to 12 o'clock
    //
    // Counterclockwise direction.
    // --------------------------------------------------------

    const batteryTransform =
      `translate(${RING_SIZE} 0) ` +
      `scale(-1 1) ` +
      `rotate(-90 ${CENTER} ${CENTER})`;

    const batteryStatus =
      monitoring?.battery_status ??
      "Idle";

    const isIdle =
      batteryStatus === "Idle";

    const dodStatus =
      monitoring?.dod_status ??
      "Safe";

    const isDodUnsafe =
      dodStatus === "Unsafe";

    // The DoD badge turns red not only when the DoD status is
    // unsafe but also whenever the battery level is low (below
    // LOW_BATTERY_THRESHOLD), because a low battery is still
    // considered under load of the depth-of-discharge rule.
    // The red badge always shows "DoD Unsafe".
    const isDodBadgeRed =
      isDodUnsafe || isLowBattery;

    const dodLabel =
      isDodBadgeRed
        ? "DoD Unsafe"
        : "DoD Safe";

    const voltageData =
      getCardData(
        "voltage",
        monitoring,
        weather ?? null,
        loading,
        styles,
      );

    const wattHourData =
      getCardData(
        "watt_hour",
        monitoring,
        weather ?? null,
        loading,
        styles,
      );

    const isLowWattHours =
      (monitoring?.watt_hours ?? 0) <=
      LOW_WATT_HOURS_THRESHOLD;

    const isLowVoltage =
      (monitoring?.voltage ?? 0) <=
      LOW_VOLTAGE_THRESHOLD;

    const loadData =
      getCardData(
        "load",
        monitoring,
        weather ?? null,
        loading,
        styles,
      );

    /*
     * The monitoring service data is extended here with the
     * interior temperature fields so both temperatures can be
     * surfaced inside this card without changing the shared
     * MonitoringData import.
     */

    const temperatureMonitoring =
      monitoring as (
        MonitoringData & {
          interior_temp: number;
          interior_temp_status:
            TemperatureStatus;
        }
      ) | null;

    const interiorTemperatureStatus =
      temperatureMonitoring
        ?.interior_temp_status ??
      "Nominal";

    const batteryTemperatureData =
      getCardData(
        "temperature",
        monitoring,
        weather ?? null,
        loading,
        styles,
      );

    const interiorTemperatureValue =
      loading
        ? "—"
        : `${temperatureMonitoring
            ?.interior_temp ??
          0}°C`;

    const interiorTemperatureBadge =
      getTemperatureBadgeStyle(
        interiorTemperatureStatus,
        styles,
      );

    const interiorTemperatureBadgeText =
      getTemperatureBadgeTextStyle(
        interiorTemperatureStatus,
        styles,
      );

    return (
      <View
        style={[
          styles.monitorCard,
          styles.groupMonitoringCard,
        ]}
      >

        {/* ==================================================
            BATTERY HEADER / ACCENT PANEL
            ================================================== */}

        <View
          style={
            styles.groupHeaderPanel
          }
        >

          <View
            style={
              styles.groupHeaderLeft
            }
          >

            <Ionicons
              name="flash-outline"
              size={30}
              color={colors.headerContent}
            />

            <AppText
              variant="heading"
              style={
                styles.groupHeaderTitle
              }
            >
              Battery Monitoring
            </AppText>

          </View>

        </View>

        {/* ==================================================
            BATTERY BODY ROW
            ================================================== */}

        <View
          style={
            styles.batteryBodyRow
          }
        >

          {/* ==================================================
              LEFT — BATTERY GAUGE COLUMN
              ================================================== */}

          <View
            style={
              styles.batteryGaugeColumn
            }
          >

            <View
              style={
                styles.batteryCircle
              }
            >

              <Animated.View
                style={[
                  styles.batteryPulse,
                  {
                    transform: [
                      {
                        scale: chargingScale,
                      },
                    ],
                  },
                ]}
              >

                <Svg
                  width={RING_SIZE}
                  height={RING_SIZE}
                  viewBox={
                    `0 0 ${RING_SIZE} ${RING_SIZE}`
                  }
                >

                  {/* Charging Glow Halo */}

                  <Circle
                    cx={CENTER}
                    cy={CENTER}
                    r={
                      RADIUS +
                      CHARGING_GLOW_RADIUS_OFFSET
                    }
                    stroke={batteryColor}
                    strokeWidth={
                      STROKE +
                      CHARGING_GLOW_STROKE_OFFSET
                    }
                    fill="none"
                    opacity={
                      chargingGlowOpacity
                    }
                  />

                  {/* Background Ring */}

                  <Circle
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    stroke={colors.border}
                    strokeWidth={STROKE}
                    fill="none"
                  />

                  {/* Battery Progress */}

                  <Circle
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    stroke={batteryColor}
                    strokeWidth={STROKE}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={
                      `${CIRCUMFERENCE} ${CIRCUMFERENCE}`
                    }
                    strokeDashoffset={
                      dashOffset
                    }
                    transform={
                      batteryTransform
                    }
                  />

                </Svg>

                {/* ==============================================
                    BATTERY CENTER
                    ============================================== */}

                <View
                  style={
                    styles.batteryCenter
                  }
                >

                  <AppText
                    variant="heading"
                    style={[
                      styles.batteryPercentage,
                      isLowBattery &&
                        styles.lowBatteryText,
                    ]}
                  >
                    {loading
                      ? "—"
                      : `${Math.round(ringLevel)}%`}
                  </AppText>

                </View>

              </Animated.View>

            </View>

            {/* ==============================================
                TIME REMAINING
                ============================================== */}

            <AppText
              variant="caption"
              style={
                styles.remainingText
              }
            >
              Time Remaining:{" "}
              {loading
                ? "—"
                : monitoring
                    ?.time_remaining ??
                  "—"}
            </AppText>

            {/* ==============================================
                BATTERY STATUS AND DoD STATUS
                ============================================== */}

            <View
              style={
                styles.batteryStatusRow
              }
            >

              {/* Battery Status: icon + label so state never
                  relies on color alone (Idle vs
                  Charging/Discharging). */}

              <View
                style={[
                  styles.batteryStatus,
                  isIdle
                    ? styles.batteryStatusIdle
                    : null,
                ]}
              >

                <AppText
                  variant="caption"
                  style={
                    styles.batteryStatusText
                  }
                >
                  {batteryStatus}
                </AppText>

              </View>

              {/* DoD Status: shield icon + Safe/Unsafe label
                  pairs color with shape + text. */}

              <View
                style={[
                  styles.dodStatusBadge,
                  isDodBadgeRed
                    ? styles.dodUnsafeBadge
                    : styles.dodSafeBadge,
                ]}
              >

                <AppText
                  variant="caption"
                  style={[
                    styles.dodStatusBadgeText,
                    isDodBadgeRed
                      ? styles.dodUnsafeBadgeText
                      : styles.dodSafeBadgeText,
                  ]}
                >
                  {dodLabel}
                </AppText>

              </View>

            </View>

          </View>

          {/* ==================================================
              RIGHT — BATTERY 2 × 3 MEASUREMENT GRID
              ================================================== */}

          <View
            style={
              styles.batteryMetricGrid
            }
          >

            {/* ==============================================
                VOLTAGE
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                {voltageData.label}
              </AppText>

              <AppText
                variant="heading"
                style={[
                  styles.batteryMetricValue,
                  isLowVoltage &&
                    styles.lowBatteryText,
                ]}
              >
                {voltageData.value}
              </AppText>

            </View>

            {/* ==============================================
                WATT-HOUR
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                {wattHourData.label}
              </AppText>

<AppText
                  variant="heading"
                  style={[
                    styles.batteryMetricValue,
                    isLowWattHours &&
                      styles.lowBatteryText,
                  ]}
                >
                  {wattHourData.value}
                </AppText>

            </View>

            {/* ==============================================
                CURRENT LOAD
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                {loadData.label}
              </AppText>

              <AppText
                variant="heading"
                style={
                  styles.batteryMetricValue
                }
              >
                {loadData.value}
              </AppText>

            </View>

            {/* ==============================================
                RESERVED CELL (for future data)
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            />

            {/* ==============================================
                TEMPERATURE (battery temperature)
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                Temperature
              </AppText>

              <AppText
                variant="heading"
                style={
                  styles.batteryMetricValue
                }
              >
                {batteryTemperatureData.value}
              </AppText>

              {batteryTemperatureData.badge && (
                <View
                  style={[
                    styles.statusBadge,
                    batteryTemperatureData.badgeStyle,
                  ]}
                >

                  <AppText
                    variant="caption"
                    style={[
                      styles.statusBadgeText,
                      batteryTemperatureData.badgeTextStyle,
                    ]}
                  >
                    {batteryTemperatureData.badge}
                  </AppText>

                </View>
              )}

            </View>

            {/* ==============================================
                INTERIOR TEMPERATURE
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                Interior
              </AppText>

              <AppText
                variant="heading"
                style={
                  styles.batteryMetricValue
                }
              >
                {interiorTemperatureValue}
              </AppText>

              <View
                style={[
                  styles.statusBadge,
                  interiorTemperatureBadge,
                ]}
              >

                <AppText
                  variant="caption"
                  style={[
                    styles.statusBadgeText,
                    interiorTemperatureBadgeText,
                  ]}
                >
                  {interiorTemperatureStatus}
                </AppText>

              </View>

            </View>

          </View>

        </View>

      </View>
    );
  }

  // ==========================================================
  // SOLAR MONITORING GROUP
  //
  // Solar Input (inside the sun gauge), Timer, and the status
  // badge fill the left column. Voltage, Current, Total Energy,
  // and Solar Panel Temperature fill the right 2 × 3 grid.
  // The Temperature Monitoring card no longer exists.
  // ==========================================================

  if (type === "solar") {

    const solarStatus =
      monitoring?.solar_status ??
      "Low";

    const solarTimer =
      monitoring?.solar_timer ??
      "00:00:00";

    const solarInput =
      loading
        ? "—"
        : `${monitoring?.solar_input ?? 0}W`;

    const solarVoltage =
      loading
        ? "—"
        : `${monitoring?.solar_voltage ?? 0}V`;

    const solarCurrent =
      loading
        ? "—"
        : `${monitoring?.solar_current ?? 0}A`;

    const totalEnergy =
      loading
        ? "—"
        : `${monitoring?.total_energy ?? 0}Wh`;

    const solarTemperatureData =
      getCardData(
        "solar_temperature",
        monitoring,
        weather ?? null,
        loading,
        styles,
      );

    // --------------------------------------------------------
    // SOLAR STATUS BADGE COLORS
    // --------------------------------------------------------

    const solarBadgeStyle =
      solarStatus === "High"
        ? styles.normalBadge
        : solarStatus === "Moderate"
        ? styles.moderateBadge
        : styles.lowBadge;

    return (
      <View
        style={[
          styles.monitorCard,
          styles.groupMonitoringCard,
        ]}
      >

        {/* ==================================================
            SOLAR HEADER / ACCENT PANEL
            ================================================== */}

        <View
          style={
            styles.groupHeaderPanel
          }
        >

          <View
            style={
              styles.groupHeaderLeft
            }
          >

            <Ionicons
              name="sunny-outline"
              size={30}
              color={colors.headerContent}
            />

            <AppText
              variant="heading"
              style={
                styles.groupHeaderTitle
              }
            >
              Solar Monitoring
            </AppText>

          </View>

        </View>

        {/* ==================================================
            SOLAR BODY ROW
            ================================================== */}

        <View
          style={
            styles.batteryBodyRow
          }
        >

          {/* ================================================
              LEFT — SOLAR SUN GAUGE COLUMN
              ================================================ */}

          <View
            style={
              styles.batteryGaugeColumn
            }
          >

            <View
              style={
                styles.batteryCircle
              }
            >

              <Svg
                width={RING_SIZE}
                height={RING_SIZE}
                viewBox={
                  `0 0 ${RING_SIZE} ${RING_SIZE}`
                }
              >

                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  r={SUN_RADIUS}
                  fill={sunColor}
                />

                {SOLAR_RAYS.map((ray) => (
                  <Line
                    key={
                      `ray-${ray.x1}-${ray.y1}`
                    }
                    x1={ray.x1}
                    y1={ray.y1}
                    x2={ray.x2}
                    y2={ray.y2}
                    stroke={sunColor}
                    strokeWidth={
                      SUN_RAYS_STROKE
                    }
                    strokeLinecap="round"
                  />
                ))}

              </Svg>

              {/* ==============================================
                  SOLAR INPUT CENTER
                  ============================================== */}

              <View
                style={
                  styles.batteryCenter
                }
              >

                <AppText
                  variant="heading"
                  style={
                    styles.solarCenterText
                  }
                >
                  {solarInput}
                </AppText>

              </View>

            </View>

            {/* ==============================================
                TIMER
                ============================================== */}

            <AppText
              variant="caption"
              style={[
                styles.remainingText,
                styles.solarTimerText,
              ]}
            >
              Timer:{" "}
              {loading
                ? "—"
                : formatSolarTimer(
                    solarTimer,
                  )}
            </AppText>

            {/* ==============================================
                SOLAR STATUS BADGE
                ============================================== */}

            <View
              style={[
                styles.batteryStatusRow,
                styles.solarStatusRow,
              ]}
            >

              <View
                style={[
                  styles.batteryStatus,
                  solarBadgeStyle,
                ]}
              >

                <AppText
                  variant="caption"
                  style={[
                    styles.batteryStatusText,
                    solarStatus === "Moderate"
                      ? styles.solarModerateText
                      : null,
                  ]}
                >
                  {solarStatus}
                </AppText>

              </View>

            </View>

          </View>

          {/* ================================================
              RIGHT — SOLAR 2 × 3 MEASUREMENT GRID
              ================================================ */}

          <View
            style={
              styles.batteryMetricGrid
            }
          >

            {/* ==============================================
                VOLTAGE
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                Voltage
              </AppText>

              <AppText
                variant="heading"
                style={
                  styles.batteryMetricValue
                }
              >
                {solarVoltage}
              </AppText>

            </View>

            {/* ==============================================
                CURRENT
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                Current
              </AppText>

              <AppText
                variant="heading"
                style={
                  styles.batteryMetricValue
                }
              >
                {solarCurrent}
              </AppText>

            </View>

            {/* ==============================================
                TOTAL ENERGY
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                Total Energy
              </AppText>

              <AppText
                variant="heading"
                style={
                  styles.batteryMetricValue
                }
              >
                {totalEnergy}
              </AppText>

            </View>

            {/* ==============================================
                RESERVED CELL (for future data)
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            />

            {/* ==============================================
                SOLAR PANEL TEMPERATURE
                (moved from Temperature Monitoring)
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.batteryMetricLabel
                }
              >
                Solar Panel
              </AppText>

              <AppText
                variant="heading"
                style={
                  styles.batteryMetricValue
                }
              >
                {solarTemperatureData.value}
              </AppText>

              {solarTemperatureData.badge && (
                <View
                  style={[
                    styles.statusBadge,
                    solarTemperatureData.badgeStyle,
                  ]}
                >

                  <AppText
                    variant="caption"
                    style={[
                      styles.statusBadgeText,
                      solarTemperatureData.badgeTextStyle,
                    ]}
                  >
                    {solarTemperatureData.badge}
                  </AppText>

                </View>
              )}

            </View>

            {/* ==============================================
                RESERVED CELL (for future data)
                ============================================== */}

            <View
              style={
                styles.batteryMetricCell
              }
            />

          </View>

        </View>

      </View>
    );
  }

  // ==========================================================
  // WEATHER MONITORING CARD
  //
  // Weather is intentionally separated from the solar card.
  // The weather card now follows the same grouped-card layout
  // used by Battery Monitoring and Solar Monitoring.
  // ==========================================================

  if (type === "weather") {

    const weatherData =
      getCardData(
        "weather",
        monitoring,
        weather ?? null,
        loading,
        styles,
      );

    // Peak border + summary: High solar outlook => Peak,
    // anything else => rainy cell. Row content below is
    // real OWM daily data (condition, temps, rain chance).
    // ========================================================

    // Real-time device date for the Today card. Recomputed
    // on every render, so each weather refresh (10-min
    // interval + foreground resume in dashboard/index.tsx)
    // paints the current weekday/date, including midnight
    // rollover while the app is open.
    const todayLabel = formatForecastDay(new Date());

    // Binary peak derivation (UI phase): High => Peak,
    // Binary peak derivation: High => Peak, anything else
    // => rainy cell (border + summary). Row content is the
    // real daily OWM summary (condition, temps, rain %).
    const isPeakDay = (
      solarOutlook: string,
    ): boolean => solarOutlook === "High";

    // Peak-day summary for the footer line under the
    // location row. Counts binary Peak days across the
    // same 4 rows rendered above.
    const peakDays: string[] = forecast
      ? forecast.upcoming
          .slice(0, 4)
          .filter((day) =>
            isPeakDay(day.solarOutlook),
          )
          .map((day) => day.weekday)
      : [];

    const peakSummary: string =
      peakDays.length === 0
        ? formatBestSunSummary(null)
        : peakDays.length === 1
          ? formatBestSunSummary(
              peakDays[0],
            )
          : `${peakDays.length} peak days: ${peakDays.join(", ")}. Good day to charge fully.`;

    // Today honesty: age from OWM `dt`, stale past the
    // configured window, and the fallback-location label.
    // Age renders at paint time and refreshes with every
    // weather cycle (interval, foreground, tap).
    const todayObservedAt =
      weather?.observedAt;

    // Dim only when stale data is on screen — never the
    // first-load empty state.
    const todayStale =
      !!weather &&
      isStaleReading(todayObservedAt);

    const todayAgeLabel =
      typeof todayObservedAt === "number"
        ? formatDataAge(todayObservedAt)
        : null;

    const todayLocationLabel =
      weather?.isFallback
        ? `${weatherData.label} (default location)`
        : weatherData.label;

    const canTapRefresh =
      typeof onRefreshToday === "function";

    const todayBusy =
      loading || todayRefreshing;

    return (
      <View
        style={[
          styles.monitorCard,
          styles.weatherMonitoringCard,
        ]}
      >

        {/* ==================================================
            WEATHER HEADER / ACCENT PANEL
            ================================================== */}

        <View
          style={
            styles.weatherHeaderPanel
          }
        >

          <View
            style={
              styles.weatherHeaderLeft
            }
          >

            <Ionicons
              name={weatherData.icon}
              size={30}
              color={colors.headerContent}
            />

            <AppText
              variant="heading"
              style={
                styles.weatherHeaderTitle
              }
            >
              Weather Monitoring
            </AppText>

          </View>

        </View>

        {/* ==================================================
            TODAY (LIVE) + NEXT 4 DAYS PREDICTION
            Today card: real-time device date (left), live
            condition icon from the OWM icon code (center),
            live temp + id-based label (right). Below it the
            vertical 4-row peak-sunlight list. Everything
            stays inside this Weather Monitoring card.
            ================================================== */}

        <View
          style={
            styles.weatherForecastTagRow
          }
        >

          <AppText
            variant="caption"
            style={
              styles.weatherForecastTag
            }
          >
            Today
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`About today's condition. ${todaySkyNote()}`}
            accessibilityHint="Shows where the sky label comes from"
            onPress={() =>
              Alert.alert(
                "Today's sky",
                todaySkyNote(),
              )
            }
            hitSlop={8}
            style={{ marginLeft: 6 }}
          >
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={colors.textSecondary}
            />
          </Pressable>

        </View>

        <View
          style={
            styles.weatherForecastRow
          }
        >

          <Pressable
            style={[
              styles.weatherTodayCard,
              todayStale &&
                styles.weatherTodayStale,
            ]}
            accessibilityRole={
              canTapRefresh
                ? "button"
                : "none"
            }
            accessibilityLabel={`Today, ${todayLabel.weekday} ${todayLabel.date}, ${todayBusy ? "updating weather" : `${weatherData.value}${weatherData.feelsLike ? `, ${weatherData.feelsLike}` : ""}, ${weatherData.badge ?? ""}${weatherData.subtext ? `, ${weatherData.subtext}` : ""}`}${canTapRefresh ? ", tap to refresh" : ""}`}
            accessibilityState={
              canTapRefresh
                ? {
                    busy: todayBusy,
                    disabled:
                      todayBusy,
                  }
                : undefined
            }
            onPress={
              canTapRefresh
                ? onRefreshToday
                : undefined
            }
            disabled={
              !canTapRefresh || todayBusy
            }
          >

            <View
              style={
                styles.weatherTodayLeft
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.weatherForecastWeekday
                }
              >
                {todayLabel.weekday}
              </AppText>

              <AppText
                variant="caption"
                style={
                  styles.weatherForecastDate
                }
              >
                {todayLabel.date}
              </AppText>

            </View>

            <View
              style={
                styles.weatherTodayCenter
              }
            >

              <Ionicons
                name={weatherData.icon}
                size={36}
                color={colors.primary}
              />

            </View>

            <View
              style={
                styles.weatherTodayRight
              }
            >

              <AppText
                variant="caption"
                style={
                  styles.weatherTodayTemp
                }
              >
                {todayBusy
                  ? "…"
                  : weatherData.value}
              </AppText>

              {!todayBusy && weatherData.feelsLike ? (
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={
                    styles.weatherTodaySubtext
                  }
                >
                  {weatherData.feelsLike}
                </AppText>
              ) : null}

              <AppText
                variant="caption"
                numberOfLines={1}
                style={
                  styles.weatherForecastClass
                }
              >
                {weatherData.badge ?? ""}
              </AppText>

              {weatherData.subtext ? (
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={
                    styles.weatherTodaySubtext
                  }
                >
                  {weatherData.subtext}
                </AppText>
              ) : null}

            </View>

          </Pressable>

        </View>

        <View
          style={
            styles.weatherForecastTagRow
          }
        >

          <AppText
            variant="caption"
            style={
              styles.weatherForecastTag
            }
          >
            Next 4 days prediction
          </AppText>

        </View>

        <View
          style={
            styles.weatherForecastList
          }
        >

          {forecastError ? (
            <View
              style={
                styles.weatherForecastErrorRow
              }
            >

              <Ionicons
                name="warning-outline"
                size={20}
                color={colors.errorDark}
                style={{ marginRight: 8 }}
              />

              <AppText
                variant="caption"
                style={
                  styles.weatherForecastErrorText
                }
              >
                {forecastError}
              </AppText>

            </View>
          ) : forecastLoading || !forecast ? (
            [0, 1, 2, 3].map((key) => (
              <View
                key={`skeleton-${key}`}
                style={
                  styles.weatherForecastRowItem
                }
              >

                <AppText
                  variant="caption"
                  style={
                    styles.weatherForecastRowDay
                  }
                >
                  —
                </AppText>

                <AppText
                  variant="caption"
                  style={
                    styles.weatherForecastRowWindow
                  }
                >
                  —
                </AppText>

              </View>
            ))
          ) : (
            forecast.upcoming
              .slice(0, 4)
              .map((day) => {
                const peak = isPeakDay(
                  day.solarOutlook,
                );

                const rainPct = Math.round(
                  day.popMax * 100,
                );

                const pillStyle =
                  day.solarOutlook === "High"
                    ? styles.weatherForecastPillHigh
                    : day.solarOutlook === "Moderate"
                      ? styles.weatherForecastPillModerate
                      : styles.weatherForecastPillLow;

                const pillTextStyle =
                  day.solarOutlook === "High"
                    ? styles.weatherForecastPillTextHigh
                    : day.solarOutlook === "Moderate"
                      ? styles.weatherForecastPillTextModerate
                      : styles.weatherForecastPillTextLow;

                return (
                  <View
                    key={day.date}
                    style={[
                      styles.weatherForecastRowItem,
                      peak
                        ? styles.weatherForecastRowItemPeak
                        : styles.weatherForecastRowItemRainy,
                    ]}
                    accessibilityRole="none"
                    accessibilityLabel={`${day.weekday} ${day.dateLabel}, ${day.peakDescription}, ${day.tempMax} degrees, low ${day.tempMin} degrees${rainPct > 0 ? `, rain ${rainPct} percent` : ""}, ${day.solarOutlook} sun${day.tempFlag ? `, ${day.tempFlag}` : ""}`}
                  >

                    <AppText
                      variant="caption"
                      style={
                        styles.weatherForecastRowDay
                      }
                    >
                      {day.weekday}
                    </AppText>

                    <Ionicons
                      name={
                        day.peakIcon as keyof typeof Ionicons.glyphMap
                      }
                      size={24}
                      color={colors.primary}
                    />

                    <View style={{ flex: 1, rowGap: 2 }}>
                      <AppText
                        variant="caption"
                        style={
                          styles.weatherForecastTemp
                        }
                      >
                        {`${day.tempMax}°`}
                        <AppText
                          variant="caption"
                          style={
                            styles.weatherForecastTempMin
                          }
                        >
                          {` / ${day.tempMin}°`}
                        </AppText>
                      </AppText>

                      {rainPct > 0 ? (
                        <View
                          style={
                            styles.weatherForecastPopRow
                          }
                        >
                          <Ionicons
                            name="water-outline"
                            size={12}
                            color={colors.accentContent}
                          />
                          <AppText
                            variant="caption"
                            style={
                              styles.weatherForecastPop
                            }
                          >
                            {`${rainPct}%`}
                          </AppText>
                        </View>
                      ) : null}

                      <AppText
                        variant="caption"
                        numberOfLines={1}
                        style={
                          styles.weatherForecastRowWindow
                        }
                      >
                        {`${day.dateLabel} • ${day.peakDescription}`}
                      </AppText>
                    </View>

                    <View style={{ rowGap: 4, alignItems: "flex-end" }}>
                      <View
                        style={[
                          styles.weatherForecastPill,
                          pillStyle,
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={[
                            styles.weatherForecastPillText,
                            pillTextStyle,
                          ]}
                        >
                          {day.solarOutlook}
                        </AppText>
                      </View>

                      {day.tempFlag ? (
                        <View
                          style={{ flexDirection: "row", columnGap: 4 }}
                        >
                          {day.tempFlag === "hot" ||
                          day.tempFlag === "both" ? (
                            <View
                              style={[
                                styles.weatherForecastFlag,
                                styles.weatherForecastFlagHot,
                              ]}
                            >
                              <AppText
                                variant="caption"
                                style={
                                  styles.weatherForecastFlagHotText
                                }
                              >
                                HOT
                              </AppText>
                            </View>
                          ) : null}
                          {day.tempFlag === "cold" ||
                          day.tempFlag === "both" ? (
                            <View
                              style={[
                                styles.weatherForecastFlag,
                                styles.weatherForecastFlagCool,
                              ]}
                            >
                              <AppText
                                variant="caption"
                                style={
                                  styles.weatherForecastFlagCoolText
                                }
                              >
                                COLD
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                  </View>
                );
              })
          )}

        </View>

        <View
          style={
            styles.weatherForecastFooter
          }
        >

          <View
            style={
              styles.weatherForecastLocationRow
            }
          >

            <Ionicons
              name="location-outline"
              size={14}
              color={
                colors.textSecondary
              }
              style={{ marginRight: 4 }}
            />

            <AppText
              variant="caption"
              numberOfLines={1}
              style={
                styles.weatherForecastLocation
              }
            >
              {`${todayLocationLabel} • Updated ${
                todayAgeLabel ??
                (forecast
                  ? formatClockTime(
                      new Date(
                        forecast.fetchedAt
                      )
                    )
                  : "—")
              }`}
            </AppText>

          </View>

          {todayStale && weather ? (
            <AppText
              variant="caption"
              style={
                styles.weatherForecastStale
              }
            >
              {`Offline — last update ${todayAgeLabel ?? "unknown"}`}
            </AppText>
          ) : null}

          {forecast && !forecastError ? (
            <AppText
              variant="caption"
              style={
                styles.weatherForecastSummary
              }
            >
              {peakSummary}
            </AppText>
          ) : null}

        </View>

      </View>
    );
  }

  // ==========================================================
  // HIDDEN GROUP MEMBERS
  //
  // These values are rendered inside their respective
  // grouped monitoring cards above.
  // ==========================================================

  if (
    type === "battery" ||
    type === "watt_hour" ||
    type === "solar_voltage" ||
    type === "solar_current" ||
    type === "solar_energy" ||
    type === "solar_timer" ||
    type === "load" ||
    type === "dod" ||
    type === "solar_temperature" ||
    type === "temperature"
  ) {
    return null;
  }

  // ==========================================================
  // OTHER MONITORING CARDS
  // ==========================================================

  const data =
    getCardData(
      type,
      monitoring,
      weather ?? null,
      loading,
      styles,
    );

  const isSafe =
    type === "dod" &&
    data.value === "Safe";

  const isUnsafe =
    type === "dod" &&
    data.value === "Unsafe";

  return (
    <View
      style={
        styles.monitorCard
      }
    >

      {/* ==================================================
          ICON PANEL
          ================================================== */}

      <View
        style={
          styles.iconAccentPanel
        }
      >

        <Ionicons
          name={data.icon}
          size={28}
          color={colors.accentContent}
        />

      </View>

      {/* ==================================================
          LABEL
          ================================================== */}

      <AppText
        variant="caption"
        style={
          styles.monitorLabel
        }
      >
        {data.label}
      </AppText>

      {/* ==================================================
          VALUE
          ================================================== */}

      {data.value !==
        undefined && (

        <AppText
          variant="heading"
          style={[
            styles.monitorValue,
            isSafe &&
              styles.safeValue,
            isUnsafe &&
              styles.unsafeValue,
          ]}
        >
          {data.value}
        </AppText>

      )}

      {/* ==================================================
          STATUS BADGE
          ================================================== */}

      {data.badge && (

        <View
          style={[
            styles.statusBadge,
            data.badgeStyle,
          ]}
        >

          <AppText
            variant="caption"
            style={[
              styles.statusBadgeText,
              data.badgeTextStyle,
            ]}
          >
            {data.badge}
          </AppText>

        </View>

      )}

    </View>
  );
}

// ============================================================
// CARD DATA
// ============================================================

function getCardData(
  type: NonBatteryChartType,
  monitoring: MonitoringData | null,
  weather: WeatherData | null,
  loading: boolean,
  themedStyles: ReturnType<typeof getStyles>,
): CardData {

  switch (type) {

    // ========================================================
    // VOLTAGE
    // ========================================================

    case "voltage": {

      const clamped =
        Math.max(
          VOLTAGE_MIN,
          Math.min(
            VOLTAGE_MAX,
            monitoring?.voltage ?? 0,
          ),
        );

      return {
        icon:
          "flash-outline",

        label:
          "Voltage",

        value:
          loading
            ? "—"
            : `${clamped}V`,
      };
    }

    // ========================================================
    // WATT-HOUR
    // ========================================================

    case "watt_hour": {

      const clamped =
        Math.max(
          WATT_HOURS_MIN,
          Math.min(
            WATT_HOURS_MAX,
            monitoring?.watt_hours ?? 0,
          ),
        );

      return {
        icon:
          "battery-charging-outline",

        label:
          "Watt-hour",

        value:
          loading
            ? "—"
            : `${clamped}Wh`,
      };
    }

    // ========================================================
    // SOLAR INPUT
    // ========================================================

    case "solar": {

      const solarStatus =
        monitoring?.solar_status ??
        "Low";

      return {
        icon:
          "sunny-outline",

        label:
          "Solar Input",

        value:
          loading
            ? "—"
            : `${monitoring?.solar_input ?? 0}W`,

        badge:
          solarStatus,

        badgeStyle:
          solarStatus === "High"
            ? themedStyles.normalBadge
            : solarStatus ===
                "Moderate"
              ? themedStyles.moderateBadge
              : themedStyles.lowBadge,

        badgeTextStyle:
          solarStatus ===
          "Moderate"
            ? themedStyles.darkBadgeText
            : themedStyles.lightBadgeText,
      };
    }

    // ========================================================
    // SOLAR VOLTAGE
    // ========================================================

    case "solar_voltage":

      return {
        icon:
          "flash-outline",

        label:
          "Voltage",

        value:
          loading
            ? "—"
            : `${monitoring?.solar_voltage ?? 0}V`,
      };

    // ========================================================
    // SOLAR CURRENT
    // ========================================================

    case "solar_current":

      return {
        icon:
          "pulse-outline",

        label:
          "Current",

        value:
          loading
            ? "—"
            : `${monitoring?.solar_current ?? 0}A`,
      };

    // ========================================================
    // TOTAL ENERGY
    // ========================================================

    case "solar_energy":

      return {
        icon:
          "battery-charging-outline",

        label:
          "Total Energy",

        value:
          loading
            ? "—"
            : `${monitoring?.total_energy ?? 0}Wh`,
      };

    // ========================================================
    // SOLAR TIMER
    // ========================================================

    case "solar_timer":

      return {
        icon:
          "timer-outline",

        label:
          "Timer",

        value:
          loading
            ? "—"
            : formatSolarTimer(
                monitoring?.solar_timer ??
                  "00:00:00",
              ),
      };

    // ========================================================
    // CURRENT LOAD
    // ========================================================

    case "load":

      return {
        icon:
          "flash-outline",

        label:
          "Load Now",

        value:
          loading
            ? "—"
            : `${monitoring?.current_load ?? 0}W`,
      };

    // ========================================================
    // WEATHER
    // ========================================================

    case "weather": {

      const formatTemp = (value: number): string =>
        `${Math.round(Number(value))}°C`;

      const hasTemp =
        weather &&
        typeof weather.temperature === "number" &&
        Number.isFinite(weather.temperature);

      const hasFeels =
        !loading &&
        typeof weather?.feelsLike === "number" &&
        Number.isFinite(weather.feelsLike);

      // Primary is feels-like when available (matches local
      // perception better); otherwise actual temperature.
      const tempValue =
        loading
          ? "—"
          : hasFeels
            ? formatTemp(weather.feelsLike as number)
            : hasTemp
              ? formatTemp(
                  (weather as { temperature: number })
                    .temperature,
                )
              : "—";

      const actualValue =
        !loading && hasFeels && hasTemp
          ? `Actual ${formatTemp(
              (weather as { temperature: number })
                .temperature,
            )}`
          : undefined;

      const cityLabel =
        weather?.city ??
        "—";

      const unavailable = todayUnavailableLabel();
      const estimate = todayEstimateSubtext();

      // Legacy (no classifier fields) or stale (>30min):
      // temp + Updated-age still render; the condition
      // stays neutral instead of a possibly-false label.
      const display = resolveTodayDisplay(weather);

      if (display.kind === "neutral") {
        return {
          icon: "cloud-outline",

          label: cityLabel,

          value: tempValue,

          ...(actualValue
            ? { feelsLike: actualValue }
            : {}),

          badge: unavailable,

          subtext: weather ? estimate : undefined,

          badgeStyle:
            themedStyles.overcastWeatherBadge,

          badgeTextStyle:
            themedStyles.overcastWeatherBadgeText,
        };
      }

      const classified = display.classified;

      const badgeStyle =
        classified.severity === "fog"
          ? themedStyles.fogWeatherBadge
          : classified.severity === "severe"
            ? themedStyles.redWeatherBadge
            : classified.severity === "moderate"
              ? themedStyles.orangeWeatherBadge
              : classified.severity === "light"
                ? themedStyles.yellowWeatherBadge
                : classified.severity === "clear"
                  ? themedStyles.clearWeatherBadge
                  : /sunny|mostly clear|partly cloudy|partly sunny|mostly sunny/i.test(
                      classified.label,
                    )
                    ? themedStyles.partlyCloudyWeatherBadge
                    : themedStyles.overcastWeatherBadge;

      const badgeTextStyle =
        classified.severity === "fog"
          ? themedStyles.fogWeatherBadgeText
          : classified.severity === "severe"
            ? themedStyles.redWeatherBadgeText
            : classified.severity === "moderate"
              ? themedStyles.orangeWeatherBadgeText
              : classified.severity === "light"
                ? themedStyles.yellowWeatherBadgeText
                : classified.severity === "clear"
                  ? themedStyles.clearWeatherBadgeText
                  : /sunny|mostly clear|partly cloudy|partly sunny|mostly sunny/i.test(
                      classified.label,
                    )
                    ? themedStyles.partlyCloudyWeatherBadgeText
                    : themedStyles.overcastWeatherBadgeText;

      return {
        icon: classified.icon,

        label: cityLabel,

        value: tempValue,

        ...(actualValue
          ? { feelsLike: actualValue }
          : {}),

        badge: classified.label,

        ...(classified.subtext
          ? { subtext: classified.subtext }
          : {}),

        badgeStyle,

        badgeTextStyle,
      };
    }

    // ========================================================
    // DEPTH OF DISCHARGE
    // ========================================================

    case "dod":

      return {
        icon:
          "shield-checkmark-outline",

        label:
          "DoD Status",

        value:
          monitoring?.dod_status ??
          "Safe",
      };

    // ========================================================
    // BATTERY TEMPERATURE
    // ========================================================

    case "temperature": {

      const status =
        monitoring
          ?.battery_temperature_status ??
        "Nominal";

      return {
        icon:
          "thermometer-outline",

        label:
          "Battery Temp",

        value:
          loading
            ? "—"
            : `${monitoring
                ?.battery_temperature ??
              0}°C`,

        badge:
          status,

        badgeStyle:
          getTemperatureBadgeStyle(
            status,
            themedStyles,
          ),

        badgeTextStyle:
          getTemperatureBadgeTextStyle(
            status,
            themedStyles,
          ),
      };
    }

    // ========================================================
    // SOLAR PANEL TEMPERATURE
    // ========================================================

    case "solar_temperature": {

      const status =
        monitoring
          ?.solar_temperature_status ??
        "Nominal";

      return {
        icon:
          "thermometer-outline",

        label:
          "Solar Panel Temp",

        value:
          loading
            ? "—"
            : `${monitoring
                ?.solar_temperature ??
              0}°C`,

        badge:
          status,

        badgeStyle:
          getTemperatureBadgeStyle(
            status,
            themedStyles,
          ),

        badgeTextStyle:
          getTemperatureBadgeTextStyle(
            status,
            themedStyles,
          ),
      };
    }

  }
}

// ============================================================
// SOLAR TIMER FORMATTER
// ============================================================

function formatSolarTimer(
  timer: string,
): string {

  const value =
    String(timer ?? "")
      .trim();

  if (!value) {
    return "00:00:00";
  }

  // PostgreSQL interval values can be returned as
  // HH:MM:SS, H:MM:SS, or values containing days.

  const dayMatch =
    value.match(/(-?\d+)\s+days?/i);

  const timeMatch =
    value.match(/(\d{1,3}):(\d{2}):(\d{2})/);

  if (timeMatch) {

    const days = dayMatch
      ? Number(dayMatch[1])
      : 0;

    const hours =
      Number(timeMatch[1]) +
      days * 24;

    const minutes =
      Number(timeMatch[2]);

    const seconds =
      Number(timeMatch[3]);

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");
  }

  return value;
}

// ============================================================
// WEATHER ICON
// ============================================================

// The Today card classifies by OpenWeather's condition id
// (classifyTodayById) and looks the icon up by OWM icon
// code — no description-text matching anywhere in this
// card. resolveCondition stays for the 4-day forecast and
// solar-outlook logic in forecast.ts.

// ============================================================
// TEMPERATURE BADGE STYLE
// ============================================================

function getTemperatureBadgeStyle(
  status: TemperatureStatus,
  themedStyles: ReturnType<typeof getStyles>,
) {

  switch (status) {

    case "Nominal":

      return themedStyles.nominalTemperatureBadge;

    case "Elevated":

      return themedStyles.elevatedTemperatureBadge;

    case "High":

      return themedStyles.highTemperatureBadge;

    case "Critical":

      return themedStyles.criticalTemperatureBadge;

  }
}

// ============================================================
// TEMPERATURE BADGE TEXT STYLE
// ============================================================

function getTemperatureBadgeTextStyle(
  status: TemperatureStatus,
  themedStyles: ReturnType<typeof getStyles>,
) {

  switch (status) {

    case "Nominal":

      return themedStyles.nominalTemperatureBadgeText;

    case "Elevated":

      return themedStyles.elevatedTemperatureBadgeText;

    case "High":

      return themedStyles.highTemperatureBadgeText;

    case "Critical":

      return themedStyles.criticalTemperatureBadgeText;

  }
}

// (Temperature badge icons removed: status badges are text-only.)

// ============================================================
// STYLES
// ============================================================

const getStyles = (colors: AppColors) =>
  StyleSheet.create({

  // ==========================================================
  // BATTERY
  // ==========================================================

  // ==========================================================
  // BATTERY BODY ROW
  //
  // Splits the card body into two equal flex halves. Both
  // columns are flex:1 so the dividing boundary always lands
  // on the true center of the card. The column gap sits in
  // the middle, acting as the imaginary divider.
  // ==========================================================

  batteryBodyRow: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    // Wrap on narrow phones (<360): gauge stacks above metrics
    // instead of squeezing the fixed 150 ring (UI-STANDARDS.md).
    flexWrap: "wrap",
    alignItems: "stretch",
    paddingHorizontal: 10,
    paddingVertical: 10,
    columnGap: 12,
    rowGap: 12,
  },

  // ==========================================================
  // LEFT — BATTERY GAUGE COLUMN
  // ==========================================================

  batteryGaugeColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 150,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },

  batteryCircle: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },

  batteryPulse: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },

  batteryCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  batteryPercentage: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 30,
  },

  // Frozen: dark ink on the yellow sun fill in both themes.
  // batteryPercentage can't be reused here — it follows the
  // theme and goes light in dark mode, unreadable on yellow.
  solarCenterText: {
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 26,
  },

  // Frozen: dark ink on the moderate (amber) solar badge.
  solarModerateText: {
    color: Colors.light.text,
  },

  lowBatteryText: {
    color: colors.error,
  },

  batteryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
    gap: 8,
  },

  batteryStatus: {
    backgroundColor:
      colors.primary,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 3,
    minWidth: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 25,
  },

  batteryStatusIdle: {
    backgroundColor:
      colors.error,
  },

  batteryStatusText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  remainingText: {
    color:
      colors.textSecondary,
    marginTop: 3,
    textAlign: "center",
    fontSize: 12,
  },

  // ==========================================================
  // SOLAR MONITORING COLUMN OVERRIDES
  //
  // Pushes the timer and status badge slightly further away
  // from the sun gauge (down by ~1px) without affecting the
  // battery card that shares the base styles.
  // ==========================================================

  solarTimerText: {
    marginTop: 12,
  },

  solarStatusRow: {
    marginTop: 8,
  },

  // ==========================================================
  // RIGHT — BATTERY 2 × 3 MEASUREMENT GRID
  //
  // Flex-wraps six equal cells (two per row × three rows).
  // The bottom three cells are reserved for future data.
  // ==========================================================

  batteryMetricGrid: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 150,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    alignContent: "flex-start",
    justifyContent: "space-between",
  },

  batteryMetricCell: {
    width: "50%",
    minHeight: 78,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },

  batteryMetricLabel: {
    color: colors.text,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    flexShrink: 1,
  },

  batteryMetricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 22,
    flexShrink: 1,
  },

  // ==========================================================
  // MONITORING CARDS — BASE SHELL
  // ==========================================================

  monitorCard: {
    width: "100%",
    minHeight: 108,
    backgroundColor:
      colors.glass.white,
    borderWidth: 3,
    borderColor:
      colors.cardBorder,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 2,
  },

  // ==========================================================
  // SHARED GROUP MONITORING CARD OVERRIDE
  //
  // Used by: Battery Monitoring (voltage type)
  //           Temperature Monitoring (temperature type)
  //
  // Switches the base shell to column layout and strips
  // the horizontal/vertical padding so the header panel
  // fills edge-to-edge.
  // ==========================================================

  groupMonitoringCard: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden",
  },

  // ==========================================================
  // GROUP HEADER / ACCENT PANEL
  // ==========================================================

  groupHeaderPanel: {
    width: "100%",
    backgroundColor:
      colors.headerBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  groupHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  groupHeaderTitle: {
    color: colors.headerContent,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    flexShrink: 1,
  },

  // ==========================================================
  // WEATHER MONITORING CARD
  //
  // Uses the same grouped layout language as the Battery and
  // Solar monitoring cards.
  // ==========================================================

  weatherMonitoringCard: {
    minHeight: 175,
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden",
  },

  weatherHeaderPanel: {
    width: "100%",
    backgroundColor:
      colors.headerBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  weatherHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  weatherHeaderTitle: {
    color: colors.headerContent,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
    flexShrink: 1,
  },

  // ==========================================================
  // 4-DAY FORECAST STRIP
  //
  // Pinned live Today box + horizontal upcoming-days scroll
  // sized so three boxes are visible at once. Medium type
  // scale stays readable down to ~320px widths; tabular
  // numerals stop temps jittering.
  // ==========================================================

  weatherForecastRow: {
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 10,
    paddingTop: 8,
  },

  weatherForecastTagRow: {
    width: "100%",
    minHeight: 16,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
  },

  weatherForecastTag: {
    color: colors.accentContent,
    fontSize: 12,
    fontWeight: "700",
  },

  // ==========================================================
  // TODAY CARD (3-ZONE ROW) + VERTICAL 4-ROW PEAK LIST
  //
  // Today: date (left) / live condition icon (center) /
  // live temp + classification (right), clustered centered
  // as one glanceable group with a hero 36 icon and an
  // amber border so it stands out from the 4 rows below.
  // Spacing and type follow UI-STANDARDS (4/8 grid, 20 card
  // padding, 12/14/24 type, 56 list rows, radius 12-16).
  // ==========================================================

  weatherTodayCard: {
    width: "100%",
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      colors.glass.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    columnGap: 12,
  },

  weatherTodayLeft: {
    flexShrink: 0,
    minWidth: 64,
    alignItems: "center",
    rowGap: 2,
  },

  weatherTodayCenter: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  weatherTodayRight: {
    flexShrink: 0,
    minWidth: 72,
    alignItems: "center",
    rowGap: 2,
  },

  weatherTodayTemp: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
    fontVariant: ["tabular-nums"],
  },

  weatherTodaySubtext: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 14,
  },

  // Stale-reading treatment: dimmed Today card + offline
  // caption. Colors stay theme-driven for dark mode.
  weatherTodayStale: {
    opacity: 0.6,
  },

  weatherForecastStale: {
    color: colors.errorDark,
    fontSize: 12,
    fontWeight: "600",
  },

  weatherForecastList: {
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    rowGap: 8,
  },

  weatherForecastRowItem: {
    width: "100%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      colors.glass.white,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    columnGap: 8,
  },

  weatherForecastRowItemPeak: {
    borderColor: colors.primary,
  },

  weatherForecastRowItemRainy: {
    borderColor: colors.cardBorder,
  },

  weatherForecastRowDay: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    width: 44,
    lineHeight: 20,
  },

  weatherForecastRowWindow: {
    flex: 1,
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
  },

  weatherForecastPillRainy: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },

  weatherForecastPillTextRainy: {
    color: colors.textSecondary,
  },

  weatherForecastTodayBox: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      colors.glass.white,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    rowGap: 3,
  },

  weatherForecastScroll: {
    flex: 1,
  },

  weatherForecastScrollContent: {
    columnGap: 8,
    paddingRight: 2,
    alignItems: "stretch",
  },

  weatherForecastCell: {
    width: 88,
    minHeight: 156,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      colors.glass.white,
    borderWidth: 2,
    borderColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    rowGap: 3,
  },

  weatherForecastWeekday: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },

  weatherForecastDate: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },

  weatherForecastTemp: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 22,
    fontVariant: ["tabular-nums"],
  },

  weatherForecastTempMin: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "400",
  },

  weatherForecastPopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 2,
  },

  weatherForecastPop: {
    color: colors.accentContent,
    fontSize: 12,
    fontWeight: "600",
  },

  weatherForecastClass: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    textTransform: "capitalize",
  },

  weatherForecastPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  weatherForecastPillHigh: {
    backgroundColor: colors.primary,
  },

  weatherForecastPillModerate: {
    backgroundColor: colors.secondary,
  },

  weatherForecastPillLow: {
    backgroundColor: colors.error,
  },

  weatherForecastPillText: {
    fontSize: 12,
    fontWeight: "700",
  },

  weatherForecastPillTextHigh: {
    color: colors.onPrimary,
  },

  weatherForecastPillTextModerate: {
    color: colors.text,
  },

  weatherForecastPillTextLow: {
    color: colors.onPrimary,
  },

  weatherForecastFlag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  weatherForecastFlagHot: {
    backgroundColor: colors.warning,
  },

  weatherForecastFlagCool: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },

  weatherForecastFlagHotText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },

  weatherForecastFlagCoolText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },

  weatherForecastBest: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  weatherForecastBestStar: {
    color: colors.secondary,
  },

  weatherForecastErrorRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  weatherForecastErrorText: {
    color: colors.errorDark,
    flex: 1,
  },

  weatherForecastFooter: {
    width: "100%",
    paddingHorizontal: 14,
    paddingBottom: 12,
    rowGap: 2,
  },

  weatherForecastLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  weatherForecastLocation: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },

  weatherForecastSummary: {
    color: colors.accentContent,
    fontSize: 12,
    fontWeight: "600",
  },

  // ==========================================================
  // GENERAL CARD CONTENT
  // ==========================================================

  monitorLabel: {
    color: colors.text,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 17,
  },

  monitorValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 24,
  },

  safeValue: {
    color:
      colors.accentContent,
  },

  unsafeValue: {
    color:
      colors.error,
  },

  // ==========================================================
  // STATUS BADGES
  // ==========================================================

  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
  },

  normalBadge: {
    backgroundColor:
      colors.primary,
  },

  moderateBadge: {
    backgroundColor:
      colors.secondary,
  },

  alarmingBadge: {
    backgroundColor:
      colors.error,
  },

  lowBadge: {
    backgroundColor:
      colors.error,
  },

  lightBadgeText: {
    color: colors.onPrimary,
  },

  darkBadgeText: {
    color: colors.text,
  },

  // ==========================================================
  // DOD STATUS BADGES
  // ==========================================================

  dodStatusBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 25,
  },

  dodSafeBadge: {
    backgroundColor:
      colors.primary,
  },

  dodUnsafeBadge: {
    backgroundColor:
      colors.error,
  },

  dodStatusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
  },

  dodSafeBadgeText: {
    color: colors.onPrimary,
  },

  dodUnsafeBadgeText: {
    color: colors.onPrimary,
  },

  // ==========================================================
  // TEMPERATURE BADGES
  // ==========================================================

  nominalTemperatureBadge: {
    backgroundColor: colors.severity.nominal.bg,
    borderWidth: 1,
    borderColor: colors.severity.nominal.border,
  },

  nominalTemperatureBadgeText: {
    color: colors.severity.nominal.text,
  },

  elevatedTemperatureBadge: {
    backgroundColor: colors.severity.elevated.bg,
    borderWidth: 1,
    borderColor: colors.severity.elevated.border,
  },

  elevatedTemperatureBadgeText: {
    color: colors.severity.elevated.text,
  },

  highTemperatureBadge: {
    backgroundColor: colors.severity.high.bg,
    borderWidth: 1,
    borderColor: colors.severity.high.border,
  },

  highTemperatureBadgeText: {
    color: colors.severity.high.text,
  },

  criticalTemperatureBadge: {
    backgroundColor: colors.severity.critical.bg,
    borderWidth: 1,
    borderColor: colors.severity.critical.border,
  },

  criticalTemperatureBadgeText: {
    color: colors.severity.critical.text,
  },

  // ==========================================================
  // WEATHER BADGES
  // ==========================================================

  // CLEAR

  clearWeatherBadge: {
    backgroundColor: colors.weather.clear.bg,
    borderWidth: 1,
    borderColor: colors.weather.clear.border,
  },

  clearWeatherBadgeText: {
    color: colors.weather.clear.text,
  },

  // PARTLY CLOUDY

  partlyCloudyWeatherBadge: {
    backgroundColor: colors.weather.partlyCloudy.bg,
    borderWidth: 1,
    borderColor: colors.weather.partlyCloudy.border,
  },

  partlyCloudyWeatherBadgeText: {
    color: colors.weather.partlyCloudy.text,
  },

  // OVERCAST

  overcastWeatherBadge: {
    backgroundColor: colors.weather.overcast.bg,
    borderWidth: 1,
    borderColor: colors.weather.overcast.border,
  },

  overcastWeatherBadgeText: {
    color: colors.weather.overcast.text,
  },

  // FOG

  fogWeatherBadge: {
    backgroundColor: colors.weather.fog.bg,
    borderWidth: 1,
    borderColor: colors.weather.fog.border,
  },

  fogWeatherBadgeText: {
    color: colors.weather.fog.text,
  },

  // PAGASA-STYLE YELLOW

  yellowWeatherBadge: {
    backgroundColor: colors.weather.yellow.bg,
    borderWidth: 1,
    borderColor: colors.weather.yellow.border,
  },

  yellowWeatherBadgeText: {
    color: colors.weather.yellow.text,
  },

  // PAGASA-STYLE ORANGE

  orangeWeatherBadge: {
    backgroundColor: colors.weather.orange.bg,
    borderWidth: 1,
    borderColor: colors.weather.orange.border,
  },

  orangeWeatherBadgeText: {
    color: colors.weather.orange.text,
  },

  // PAGASA-STYLE RED

  redWeatherBadge: {
    backgroundColor: colors.weather.red.bg,
    borderWidth: 1,
    borderColor: colors.weather.red.border,
  },

  redWeatherBadgeText: {
    color: colors.weather.red.text,
  },

  // ==========================================================
  // ICON ACCENT PANEL
  //
  // Used by: Other monitoring cards (fallback branch)
  // ==========================================================

  iconAccentPanel: {
    width: 58,
    alignSelf: "stretch",
    backgroundColor: colors.color1,
    borderTopLeftRadius: 13,
    borderBottomLeftRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -12,
    marginTop: -12,
    marginBottom: -12,
    marginRight: 12,
  },

});