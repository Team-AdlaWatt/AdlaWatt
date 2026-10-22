import { Ionicons } from "@expo/vector-icons";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Animated,
  AppState,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import ActivityCard from "@/components/ActivityCard";
import AppRecCard from "@/components/AppRecCard";
import ChartCard from "@/components/ChartCard";
import PullRefreshScroll from "@/components/PullRefreshScroll";
import Copyright from "@/components/ui/Copyright";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Radius } from "@/constants/theme";
import { Control, useScreenPadding } from "@/constants/sizing";

import weatherJson from "@/data/weather.json";

import {
  type ForecastResult,
  getForecast,
} from "@/services/forecast";

import { canRefreshToday } from "@/services/weatherConfig";

import {
  type Coordinates,
  type WeatherData,
  WeatherError,
  getCurrentCoordinates,
  getWeather,
} from "@/services/weatherForecast";

import {
  useMonitoring,
} from "@/services/monitoringService";
import { useConnectivity } from "@/hooks/useConnectivity";
import { maybeScheduleLowSunAdvisory } from "@/services/reminderService";
import { useTranslation } from "react-i18next";

// ============================================================
// WEATHER AUTO-REFRESH
// ============================================================

// The weather is re-fetched on this interval so the displayed
// temperature never stays frozen for too long. The forecast
// changes slowly, so it polls every 3 hours instead — faster
// returns the same 3-hour slots and wastes free calls. All
// values come from weather.json.
const WEATHER_REFRESH_INTERVAL_MS =
  weatherJson.timing.autoRefreshMs;

const FORECAST_REFRESH_INTERVAL_MS =
  weatherJson.timing.forecastRefreshMs;

// ============================================================
// QUICK-NAV SCROLL
// ============================================================

const QUICK_NAV_SCROLL_MS = 1500;
const QUICK_NAV_SCROLL_INSET = 12;

// ============================================================
// DASHBOARD SCREEN
// ============================================================

export default function DashboardScreen() {
  const { t } = useTranslation();
  const colors = useAppColors();

  // Responsive gutter: 16/20/24 by phone width (UI-STANDARDS.md).
  const screenPadding = useScreenPadding();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );
  // ==========================================================
  // QUICK-NAV SCROLL TARGETS
  // ==========================================================

  const scrollRef =
    useRef<ScrollView>(null);

  const monitoringRef =
    useRef<View>(null);

  const electronicsRef =
    useRef<View>(null);

  const scrollYRef =
    useRef(0);

  // Stable Animated driver for the 1.5s scroll transition.
  // useState initializer (not useRef().current) per
  // react-hooks/refs: ref values must not be read on render.
  const [scrollOffset] = useState(
    () => new Animated.Value(0),
  );

  // ==========================================================
  // ADLAWATT MONITORING
  //
  // Source:
  // Supabase / monitoringService
  //
  // This remains completely independent from weather.
  // ==========================================================

  const {
    monitoring,
    loading,
    stale,
    cachedAt,
    refresh: refreshMonitoring,
  } = useMonitoring();

  // Phone-side connectivity (distinct from device status):
  // offline shows the cached readings plus a banner instead
  // of nulls. Banner renders only on explicit false — never
  // on first paint while NetInfo still resolves.
  const { connected } = useConnectivity();

  const showOfflineBanner =
    connected === false;

  const lastUpdatedLabel =
    cachedAt !== null
      ? new Date(
          cachedAt,
        ).toLocaleTimeString()
      : null;

  // ==========================================================
  // WEATHER STATE
  //
  // Source:
  // OpenWeatherMap API / weatherForecast.ts (current) and
  // forecast.ts (upcoming 5 days). Forecast has its own
  // loading and error states so it never affects the
  // Supabase monitoring cards or the current-weather card.
  // ==========================================================

  const [weather, setWeather] =
    useState<WeatherData | null>(null);

  const [weatherLoading, setWeatherLoading] =
    useState(true);

  // Last live-fetch failure (code + message from
  // WeatherError). Drives the Today card's location/error
  // state — never masked by stored data, cleared on success.
  const [weatherError, setWeatherError] = useState<{
    code: string;
    message: string;
  } | null>(null);

  // Manual Today-card refresh state: busy flag for the
  // card plus an in-flight guard so tap storms collapse
  // into one fetch. lastFetchRef stamps every attempt for
  // the 2-minute tap block and the foreground age gate.
  const [todayRefreshing, setTodayRefreshing] =
    useState(false);

  const todayInflightRef = useRef(false);

  // True while the most recent weather attempt failed.
  // Lets "Try again" bypass the 2-minute quota gate —
  // a failure must never lock the user out of a retry.
  const lastAttemptFailedRef = useRef(false);

  const lastFetchRef =
    useRef<number | null>(null);

  const [forecast, setForecast] =
    useState<ForecastResult | null>(null);

  const [forecastLoading, setForecastLoading] =
    useState(true);

  const [forecastError, setForecastError] =
    useState("");

  const hasLoadedForecast = useRef(false);

  const hasLoadedWeather = useRef(false);

  const screenMounted = useRef(true);

  // ==========================================================
  // LOAD CURRENT WEATHER
  // ==========================================================

  const loadWeather = useCallback(
    async (options?: {
      fresh?: boolean;
      coordinates?: Coordinates;
    }) => {
      try {
        // Only show the loading state on the first fetch;
        // background refreshes keep the last known value.
        if (
          screenMounted.current &&
          !hasLoadedWeather.current
        ) {
          setWeatherLoading(true);
        }

        const current = await getWeather(options);

        if (!screenMounted.current) {
          return;
        }

        hasLoadedWeather.current = true;

        lastAttemptFailedRef.current = false;

        setWeather(current);
        setWeatherError(null);
      } catch (error) {
        // Keep the last known value on background refresh
        // failures; only blank the card if nothing has
        // loaded yet. The error (code + message) always
        // reaches the card so location problems surface as
        // an explicit state instead of silent stale sky.
        console.warn(
          "Weather refresh failed:",
          error instanceof Error
            ? error.message
            : error,
        );

        if (!screenMounted.current) {
          return;
        }

        lastAttemptFailedRef.current = true;

        setWeatherError(
          error instanceof WeatherError
            ? {
                code: error.code,
                message: error.message,
              }
            : {
                code: "unknown",
                message:
                  error instanceof Error
                    ? error.message
                    : "Weather unavailable.",
              },
        );

        if (!hasLoadedWeather.current) {
          setWeather(null);
        }
      } finally {
        lastFetchRef.current = Date.now();

        if (screenMounted.current) {
          setWeatherLoading(false);
        }
      }
    },
    [],
  );

  // ==========================================================
  // LOAD 5-DAY FORECAST
  // ==========================================================

  const loadForecast = useCallback(
    async (coordinates?: Coordinates) => {
      try {
        if (
          screenMounted.current &&
          !hasLoadedForecast.current
        ) {
          setForecastLoading(true);
        }

        const fix =
          coordinates ?? (await getCurrentCoordinates());

        const result = await getForecast(
          fix.lat,
          fix.lon
        );

        if (!screenMounted.current) {
          return;
        }

        hasLoadedForecast.current = true;

        setForecast(result);

        // Low-sun advisory: self-gated on the reminders
        // switch inside the service (OFF cancels instead).
        // Fire-and-forget so forecast rendering never waits.
        void maybeScheduleLowSunAdvisory(
          result,
        ).catch(() => {});

        setForecastError("");
      } catch (error) {
        console.warn(
          "Forecast refresh failed:",
          error instanceof Error
            ? error.message
            : error
        );

        if (!screenMounted.current) {
          return;
        }

        // Keep the last known strip on background failures;
        // only surface the error when nothing loaded yet.
        if (!hasLoadedForecast.current) {
          setForecastError(
            error instanceof Error
              ? error.message
              : t("dashboard.home.forecastFailed"),
          );
        }
      } finally {
        if (screenMounted.current) {
          setForecastLoading(false);
        }
      }
    },
    [t]
  );

  // ==========================================================
  // FRESH WEATHER SESSION (shared fix)
  //
  // One fresh GPS fix shared by the current-weather and
  // forecast legs, which then fetch fully in parallel on
  // the same cell. Previously the forecast fetch waited
  // behind the weather leg — on web the unbounded browser
  // fix plus a serial fetch pushed it past its 8s abort
  // budget on slow links, so pulls timed out while mounts
  // (parallel fast-path fetches) succeeded. If the shared
  // fix itself fails, each leg falls back to resolving its
  // own coordinates, exactly like before.
  // ==========================================================

  const fetchFreshWeatherSession =
    useCallback(async () => {
      let fix: Coordinates | null = null;

      try {
        fix =
          await getCurrentCoordinates({
            fresh: true,
          });
      } catch {
        fix = null;
      }

      if (fix) {
        await Promise.all([
          loadWeather({ coordinates: fix }),
          loadForecast(fix),
        ]);

        return;
      }

      await loadWeather({ fresh: true });

      await loadForecast();
    }, [loadWeather, loadForecast]);

  // ==========================================================
  // MANUAL TODAY REFRESH (tap the Today card)
  //
  // Blocked within 2 minutes of the last attempt (OWM model
  // data will not have changed) and while a fetch is already
  // in flight, so tap storms collapse into one request.
  // Manual taps force a fresh GPS fix for accuracy; auto
  // interval + foreground resume reuse the fast path.
  // ==========================================================

  const refreshToday = useCallback(async () => {
    if (
      !screenMounted.current ||
      todayInflightRef.current ||
      // A failed attempt (e.g. location denied) must stay
      // retryable — the 2-minute quota gate only protects
      // successful refreshes.
      (!lastAttemptFailedRef.current &&
        !canRefreshToday(lastFetchRef.current))
    ) {
      return;
    }

    todayInflightRef.current = true;

    setTodayRefreshing(true);

    try {
      // Fresh GPS for Today; forecast shares the same fix,
      // so both cards stay on the same location.
      await fetchFreshWeatherSession();
    } finally {
      todayInflightRef.current = false;

      if (screenMounted.current) {
        setTodayRefreshing(false);
      }
    }
  }, [fetchFreshWeatherSession]);

  // ==========================================================
  // PULL-TO-REFRESH (drag from under the NavBar)
  //
  // Re-fetches the whole session: monitoring row plus fresh-
  // GPS weather and forecast. Unlike the Today-card tap above,
  // this path has no 2-minute gate — the shared hook's
  // in-flight guard is the only lock, so the next pull works
  // the moment this one finishes.
  // ==========================================================

  const loadSession = useCallback(async () => {
    await Promise.all([
      refreshMonitoring(),

      fetchFreshWeatherSession(),
    ]);
  }, [
    refreshMonitoring,
    fetchFreshWeatherSession,
  ]);

  const {
    refreshing: sessionRefreshing,
    onRefresh: onPullRefresh,
  } = usePullToRefresh(loadSession);

  useEffect(() => {
    screenMounted.current = true;

    // Initial fetch: setState lands in the async
    // loadWeather/loadForecast continuations.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount + interval weather fetch is the effect's purpose
    loadWeather();

    loadForecast();

    // Keep the temperature from staying frozen by
    // re-fetching on fixed intervals: live weather every
    // 10 minutes, forecast every 3 hours (its 3-hour slots
    // never change faster than that).
    const refreshInterval = setInterval(() => {
      loadWeather();
    }, WEATHER_REFRESH_INTERVAL_MS);

    const forecastInterval = setInterval(() => {
      loadForecast();
    }, FORECAST_REFRESH_INTERVAL_MS);

    // Refetch when the app returns to the foreground so a
    // unit left open (or backgrounded past the interval)
    // repaints without waiting for the next tick. The
    // weather leg always re-runs: it re-requests location
    // permission (the OS dialog shows only while undetermined;
    // after a settings round-trip this is the recovery path)
    // and pulls the latest OpenWeather reading. The forecast
    // keeps its age gate — its 3-hour slots never change
    // faster, so quick app switches would waste calls.
    const foregroundSub =
      AppState.addEventListener(
        "change",
        (state) => {
          if (state !== "active") {
            return;
          }

          loadWeather();

          const last = lastFetchRef.current;

          if (
            last === null ||
            Date.now() - last >
              FORECAST_REFRESH_INTERVAL_MS
          ) {
            loadForecast();
          }
        },
      );

    return () => {
      screenMounted.current = false;

      clearInterval(refreshInterval);

      clearInterval(forecastInterval);

      foregroundSub.remove();
    };
  }, [loadForecast, loadWeather]);

  // ==========================================================
  // SMOOTH SCROLL-TO-SECTION
  // ==========================================================

  // Drive the ScrollView with an Animated.Value so the
  // scroll transition can run for a fixed 1.5s duration.
  useEffect(() => {
    const scrollListenerId =
      scrollOffset.addListener(
        ({ value }) => {
          scrollRef.current?.scrollTo({
            y: value,
            animated: false,
          });
        },
      );

    return () => {
      scrollOffset.removeListener(
        scrollListenerId,
      );
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

    const nativeScroll =
      scroll.getNativeScrollRef();

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

            scrollOffset.setValue(
              scrollYRef.current,
            );

            Animated.timing(scrollOffset, {
              toValue: target,
              duration:
                QUICK_NAV_SCROLL_MS,
              easing:
                Easing.inOut(
                  Easing.cubic,
                ),
              useNativeDriver: false,
            }).start();
          },
        );
      },
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <ScreenContainer2>
      {/* ====================================================
          FIXED NAVBAR
          ==================================================== */}

      <NavBar
        deviceStatus={
          monitoring?.device_status === "Online"
            ? "Online"
            : "Offline"
        }
      />

      {/* ====================================================
          DASHBOARD
          ==================================================== */}

      <PullRefreshScroll
        scrollRef={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollYRef.current =
            event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshing={sessionRefreshing}
        onRefresh={onPullRefresh}
        refreshLabel={t(
          "dashboard.common.pullToRefresh",
        )}
        refreshTint={colors.primary}
        testID="pull-scroll"
      >
        {/* ==================================================
            DASHBOARD HEADER
            ================================================== */}

        <View
          style={styles.headerCard}
        >
          <AppText
            variant="heading"
            style={styles.headerTitle}
          >
            {t("dashboard.home.title")}
          </AppText>

          <AppText
            variant="caption"
            style={styles.headerSubtitle}
          >
            {t("dashboard.home.subtitle")}
          </AppText>
        </View>

        {/* ==================================================
            QUICK NAV BUTTONS
            ================================================== */}

        <View
          style={styles.quickNavRow}
        >
          <Pressable
            onPress={() =>
              scrollToSection(
                electronicsRef,
              )
            }
            accessibilityRole="button"
            accessibilityLabel={t(
              "dashboard.home.goToElectronicsRecommendation",
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
              {t("dashboard.home.electronicsRecommendation")}
            </AppText>

            <Ionicons
              name="arrow-forward"
              size={16}
              color={colors.onPrimary}
            />
          </Pressable>
        </View>

        {/* ==================================================
            OFFLINE BANNER (phone offline, cached readings)
            ================================================== */}

        {showOfflineBanner ? (
          <View
            style={styles.offlineBanner}
            accessibilityRole="text"
            accessibilityLabel={t(
              "dashboard.home.offlineBanner",
            )}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={20}
              color={colors.severity.elevated.text}
            />

            <View style={styles.offlineTextWrap}>
              <AppText
                variant="body"
                style={styles.offlineTitle}
              >
                {t(
                  "dashboard.home.offlineBanner",
                )}
              </AppText>

              {stale && lastUpdatedLabel ? (
                <AppText
                  variant="caption"
                  style={styles.offlineSubtitle}
                >
                  {t(
                    "dashboard.home.lastUpdated",
                    { time: lastUpdatedLabel },
                  )}
                </AppText>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ==================================================
            REAL-TIME MONITORING
            ================================================== */}

        <View
          ref={monitoringRef}
          style={styles.section}
        >
          <AppText
            variant="body"
            style={styles.sectionTitle}
          >
            {t("dashboard.home.realtimeMonitoring")}
          </AppText>

          <View
            style={styles.monitorGrid}
          >
            {/* ==============================================
                BATTERY

                Source: Supabase

                ChartCard.tsx:
                - Circular battery gauge
                - Battery percentage
                - Time remaining
                - Battery status
                - DoD Safe / Unsafe
                ============================================== */}

            <View
              style={
                styles.batteryCardContainer
              }
            >
              <ChartCard
                type="battery"
                monitoring={monitoring}
                loading={loading}
              />
            </View>

            {/* ==============================================
                BATTERY MONITORING

                ChartCard.tsx internally renders:
                - Voltage
                - Watt-hour
                - Load Now

                Only "voltage" is passed here because
                ChartCard.tsx uses it as the grouped
                Battery Monitoring card.
                ============================================== */}

            <View
              style={styles.fullWidthCard}
            >
              <ChartCard
                type="voltage"
                monitoring={monitoring}
                loading={loading}
              />
            </View>

            {/* ==============================================
                SOLAR MONITORING

                ChartCard.tsx internally renders:
                - Solar Timer
                - Solar Input
                - Solar Voltage
                - Solar Current
                - Total Energy
                ============================================== */}

            <View
              style={styles.fullWidthCard}
            >
              <ChartCard
                type="solar"
                monitoring={monitoring}
                loading={loading}
              />
            </View>

            {/* ==============================================
                WEATHER

                Source: Open-Meteo API

                ChartCard.tsx renders:
                - Weather icon
                - City
                - Temperature
                - Weather condition
                ============================================== */}

            <View
              style={styles.fullWidthCard}
            >
              <ChartCard
                type="weather"
                monitoring={monitoring}
                weather={weather}
                weatherError={weatherError}
                loading={weatherLoading}
                forecast={forecast}
                forecastLoading={forecastLoading}
                forecastError={forecastError}
                onRefreshToday={refreshToday}
                todayRefreshing={todayRefreshing}
              />
            </View>
          </View>
        </View>

        {/* ==================================================
            APPLIANCE RECOMMENDATION
            ================================================== */}

        <View
          ref={electronicsRef}
          style={styles.section}
        >
          <AppText
            variant="body"
            style={styles.sectionTitle}
          >
            {t("dashboard.home.electronicsRecommendation")}
          </AppText>

          <AppRecCard
            battery={
              monitoring
                ? {
                    soc:
                      monitoring.battery_level,
                    voltage:
                      monitoring.voltage,
                    remainingWh:
                      monitoring.watt_hours,
                    dod:
                      monitoring.dod_status,
                  }
                : undefined
            }
          />
        </View>

        {/* ==================================================
            RECENT ACTIVITY
            ================================================== */}

        <View
          style={styles.section}
        >
          <ActivityCard />
        </View>

        {/* ==================================================
            COPYRIGHT
            ================================================== */}

        <Copyright />
      </PullRefreshScroll>

      </ScreenContainer2>
  );
}

const dashboardDimensions = {
  horizontalPadding: 16,
  sectionSpacing: 18,
  cardRadius: 16,
  monitorGap: 10,
};

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

  scrollContent: {
    paddingHorizontal:
      dashboardDimensions.horizontalPadding,
    paddingTop: 20,
    paddingBottom: 24,
  },

  headerCard: {
    backgroundColor:
      colors.glass.white,
    borderWidth: 3,
    borderColor:
      colors.cardBorder,
    borderRadius:
      dashboardDimensions.cardRadius,
    padding: 18,
    marginBottom: 18,
  },

  headerTitle: {
    color: colors.text,
    fontWeight: "700",
  },

  headerSubtitle: {
    color:
      colors.textSecondary,
    marginTop: 6,
  },

  offlineBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor:
      colors.severity.elevated.bg,
    borderWidth: 2,
    borderColor:
      colors.severity.elevated.border,
    borderRadius:
      dashboardDimensions.cardRadius,
    padding: 12,
    marginBottom: 18,
  },

  offlineTextWrap: {
    flex: 1,
  },

  offlineTitle: {
    color:
      colors.severity.elevated.text,
    fontWeight: "700",
    fontSize: 14,
  },

  offlineSubtitle: {
    color:
      colors.severity.elevated.text,
    marginTop: 2,
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
      dashboardDimensions.sectionSpacing,
  },

  sectionTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 10,
  },

  monitorGrid: {
    width: "100%",
    flexDirection: "column",
    gap:
      dashboardDimensions.monitorGap,
  },

  /*
   * Battery occupies the complete row.
   *
   * ChartCard.tsx renders the battery gauge
   * as a complete-width monitoring card.
   */
  batteryCardContainer: {
    width: "100%",
  },

  /*
   * All remaining ChartCards are grouped cards
   * that occupy their complete available width.
   *
   * ChartCard.tsx handles the internal layout
   * of Battery Monitoring, Solar Monitoring,
   * Weather, and Temperature Monitoring.
   */
  fullWidthCard: {
    width: "100%",
  },
});
