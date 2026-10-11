import { Ionicons } from "@expo/vector-icons";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import Copyright from "@/components/ui/Copyright";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import { useScreenPadding } from "@/constants/sizing";
import Pagination from "@/components/ui/Pagination";
import AppText from "@/components/ui/AppText";
import { DropdownModal, RadioOptionRow, TintedOptionRow } from "@/components/ui/DropdownModal";
import ActivityLogCard, { ACTIVITY_LOG_GAP } from "@/components/ActivityLogCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { useSafeAsync } from "@/hooks/useSafeAsync";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

type TimeFilter =
  | "All"
  | "Last Hour"
  | "Today"
  | "This Week"
  | "This Year";

type ActivityType =
  | "info"
  | "warning"
  | "error"
  | "critical";

type ActivityLog = {
  id: string;
  title: string;
  details: string;
  type: ActivityType;
  date: string;
  time: string;
  timestamp: number;
};

// ============================================================
// PAGE-TURN SCROLL
// ============================================================

// Same glide as the dashboard home quick-nav button
// (Appliance Recommendation): fixed 1.5s cubic in-out
// drive to the very top whenever Prev/Next turns the page.
const PAGE_TURN_SCROLL_MS = 1500;

export default function ActivityLogsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useAppColors();

  // Responsive gutter: 16/20/24 by phone width (UI-STANDARDS.md).
  const screenPadding = useScreenPadding();

  // Locale-aware date/time formatting (device language,
  // never translated content — format only per policy).
  const localeTag =
    i18n.language === "fil"
      ? "fil-PH"
      : i18n.language === "ceb"
        ? "ceb-PH"
        : "en-US";

  // Display map: filter codes stay backend-bound English;
  // only the rendered label translates.
  const timeLabel = (option: TimeFilter): string =>
    option === "Last Hour"
      ? t("dashboard.logs.timeLastHour")
      : option === "Today"
        ? t("dashboard.logs.timeToday")
        : option === "This Week"
          ? t("dashboard.logs.timeThisWeek")
          : option === "This Year"
            ? t("dashboard.logs.timeThisYear")
            : t("dashboard.logs.timeAll");

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const [timeFilter, setTimeFilter] =
    useState<TimeFilter>("All");

  const [typeFilter, setTypeFilter] =
    useState<"all" | ActivityType>("all");

  const [timeModalVisible, setTimeModalVisible] =
    useState(false);

  const [typeModalVisible, setTypeModalVisible] =
    useState(false);

  const [totalActivityLogs, setTotalActivityLogs] =
    useState(0);

  // ============================================
  // PAGINATION
  // ============================================

  const [currentPage, setCurrentPage] =
    useState(1);

  const activityLogsPerPage = 10;

  // ==========================================================
  // PAGE-TURN SCROLL TARGETS
  //
  // Mirrors the dashboard home quick-nav mechanism: an
  // Animated.Value drives the ScrollView so page turns
  // glide to the very top over PAGE_TURN_SCROLL_MS.
  // ==========================================================

  const scrollRef =
    useRef<ScrollView>(null);

  const scrollYRef =
    useRef(0);

  // Stable Animated driver (useState initializer, not
  // useRef().current — react-hooks/refs forbids ref reads on render).
  const [scrollOffset] = useState(
    () => new Animated.Value(0),
  );

  // Drive the ScrollView with the animated value so the
  // scroll transition runs for a fixed duration.
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

  // ============================================
  // LOAD CURRENT USER'S ACTIVITY LOGS
  // ============================================

  const loadActivityLogs =
    async (): Promise<ActivityLog[]> => {
      const user = await getAuthenticatedUserSafe();

      if (!user) {
        setTotalActivityLogs(0);
        return [];
      }

      const {
        data,
        error,
        count,
      } = await supabase
        .from("activity_logs")
        .select(
          "act_id, title, description, type, created_at",
          { count: "exact" },
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(t("dashboard.logs.loadFailed"));
      }

      const logs: ActivityLog[] = (data ?? []).map(
        (log) => {
          const dateObject = new Date(
            log.created_at,
          );

          const type: ActivityType =
            log.type === "warning" ||
            log.type === "error" ||
            log.type === "critical"
              ? log.type
              : "info";

          return {
            id: log.act_id,
            title: log.title,
            details: log.description,
            type,
            date: dateObject.toLocaleDateString(
              localeTag,
              {
                month: "short",
                day: "2-digit",
                year: "numeric",
              },
            ),
            time: dateObject.toLocaleTimeString(
              localeTag,
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            ),
            timestamp: dateObject.getTime(),
          };
        },
      );

      setTotalActivityLogs(
        count ?? logs.length,
      );

      return logs;
    };

  const {
    data: loadedLogs,
    error: loadError,
    loading: isLoading,
    retry: retryLoad,
  } = useSafeAsync(loadActivityLogs, [i18n.language]);

  const activityLogs = useMemo(
    () => loadedLogs ?? [],
    [loadedLogs],
  );

  const hasLoadedData = activityLogs.length > 0;
  const showList =
    hasLoadedData || (!isLoading && !loadError);

  // ============================================
  // FILTER ACTIVITY LOGS
  // ============================================

  const filteredLogs = useMemo<ActivityLog[]>(
    () => {
      let filtered = [...activityLogs];

      if (typeFilter !== "all") {
        filtered = filtered.filter(
          (activity) =>
            activity.type === typeFilter,
        );
      }

      // Render-time "now" is intentional: the time-window
      // filter is relative to when the list renders.
      // eslint-disable-next-line react-hooks/purity -- time-window filter needs render-time now
      const now = Date.now();

      if (timeFilter !== "All") {
        const filterDuration: Record<
          Exclude<TimeFilter, "All">,
          number
        > = {
          "Last Hour": 60 * 60 * 1000,
          Today: 24 * 60 * 60 * 1000,
          "This Week": 7 * 24 * 60 * 60 * 1000,
          "This Year": 365 * 24 * 60 * 60 * 1000,
        };

        const minimumTimestamp =
          now - filterDuration[timeFilter];

        filtered = filtered.filter(
          (activity) =>
            activity.timestamp >=
              minimumTimestamp &&
            activity.timestamp <= now,
        );
      }

      return filtered;
    },
    [
      activityLogs,
      timeFilter,
      typeFilter,
    ],
  );

  // ============================================
  // PAGINATED ACTIVITY LOGS
  // ============================================

  const totalPages =
    filteredLogs.length === 0
      ? 0
      : Math.ceil(
          filteredLogs.length /
            activityLogsPerPage,
        );

  const pageStart =
    (currentPage - 1) *
    activityLogsPerPage;

  const pageEnd =
    currentPage *
    activityLogsPerPage;

  const currentPageLogs =
    filteredLogs.slice(
      pageStart,
      pageEnd,
    );

  // ============================================
  // FILTER HANDLERS
  // ============================================

  const handleTimeFilter = (
    filter: TimeFilter,
  ) => {
    setTimeFilter(filter);
    setCurrentPage(1);
    setTimeModalVisible(false);
  };

  const handleTypeFilter = (
    filter: "all" | ActivityType,
  ) => {
    setTypeFilter(filter);
    setCurrentPage(1);
    setTypeModalVisible(false);
  };

  // ============================================
  // PAGE TURN
  //
  // Glide to the very top on the CURRENT page first with
  // the same 1.5s cubic in-out curve as the dashboard home
  // quick-nav button, then swap the page content on
  // arrival — so the user never sees the new page jump in
  // at the bottom. Seeded from the live offset so the
  // glide starts exactly where the user left off.
  // ============================================

  const goToPage = (
    direction: "prev" | "next",
  ) => {
    scrollOffset.stopAnimation();

    scrollOffset.setValue(
      scrollYRef.current,
    );

    Animated.timing(scrollOffset, {
      toValue: 0,
      duration: PAGE_TURN_SCROLL_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      // Runs on arrival (and on interruption by a newer
      // tap, so rapid taps still step once per tap).
      setCurrentPage((page) =>
        direction === "prev"
          ? Math.max(1, page - 1)
          : Math.min(totalPages, page + 1),
      );
    });
  };

  // ============================================
  // ACTIVITY TYPE LABEL
  // ============================================

  const getTypeLabel = () => {
    switch (typeFilter) {
      case "info":
        return t("dashboard.logs.typeInfo");

      case "warning":
        return t("dashboard.logs.typeWarning");

      case "error":
        return t("dashboard.logs.typeError");

      case "critical":
        return t("dashboard.logs.typeCritical");

      default:
        return t("dashboard.logs.typeAll");
    }
  };

  // ============================================
  // ACTIVITY TYPE ICON
  // ============================================

  const getTypeIcon =
    (): keyof typeof Ionicons.glyphMap => {
      switch (typeFilter) {
        case "info":
          return "information-circle-outline";

        case "warning":
          return "warning-outline";

        case "error":
        case "critical":
          return "alert-circle-outline";

        default:
          return "list-outline";
      }
    };

  // ============================================
  // RENDER
  // ============================================

  return (
    <ScreenContainer2>
      <NavBar />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollYRef.current =
            event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Header */}

        <View style={styles.headerCard}>
          <AppText
            variant="heading"
            style={styles.title}
          >
            {t("dashboard.logs.title")}
          </AppText>

          <AppText
            variant="caption"
            style={styles.subtitle}
          >
            {t("dashboard.logs.subtitle")}
          </AppText>
        </View>

        {/* Total Activity Logs */}

        <View style={styles.totalContainer}>
          <AppText
            variant="caption"
            style={styles.totalLabel}
          >
            {t("dashboard.logs.total")}{" "}

            <AppText style={styles.totalValue}>
              {totalActivityLogs}
            </AppText>
          </AppText>
        </View>

        {/* Filters */}

        <View style={styles.filterRow}>
          {/* Time Filter */}

          <View style={styles.filterWrapper}>
            <Pressable
              onPress={() => {
                setTimeModalVisible(true);

                setTypeModalVisible(false);
              }}
              style={({ pressed }) => [
                styles.filterButton,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={19}
                color={colors.accentContent}
              />

              <AppText
                variant="caption"
                style={styles.filterText}
              >
                {timeLabel(timeFilter)}
              </AppText>

              <Ionicons
                name="chevron-down-outline"
                size={18}
                color={colors.text}
              />
            </Pressable>
          </View>

          {/* Activity Type Filter */}

          <View style={styles.filterWrapper}>
            <Pressable
              onPress={() => {
                setTypeModalVisible(true);

                setTimeModalVisible(false);
              }}
              style={({ pressed }) => [
                styles.filterButton,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Ionicons
                name={getTypeIcon()}
                size={19}
                color={
                  typeFilter === "error" ||
                  typeFilter === "critical"
                    ? colors.error
                    : typeFilter === "warning"
                      ? colors.secondary
                      : colors.accentContent
                }
              />

              <AppText
                variant="caption"
                style={styles.filterText}
              >
                {getTypeLabel()}
              </AppText>

              <Ionicons
                name="chevron-down-outline"
                size={18}
                color={colors.text}
              />
            </Pressable>
          </View>
        </View>

        {/* Loading / Error */}

        {isLoading && !hasLoadedData && (
          <View style={styles.statusBlock}>
            <ActivityIndicator
              size="large"
              color={colors.accentContent}
            />
          </View>
        )}

        {loadError && !hasLoadedData && (
          <ErrorState
            message={loadError}
            onRetry={retryLoad}
          />
        )}

        {/* Activity Cards */}

        {showList && (
          <View style={styles.activityList}>
            {currentPageLogs.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title={t("shared.emptyTitle")}
                description={t("shared.emptyDescription")}
              />
            ) : (
              currentPageLogs.map((activity) => (
                <ActivityLogCard
                  key={activity.id}
                  item={activity}
                />
              ))
            )}
          </View>
        )}

        {/* Pagination */}

        <Pagination
          currentPage={
            filteredLogs.length === 0
              ? 0
              : currentPage
          }
          totalPages={totalPages}
          onPrevious={() =>
            goToPage("prev")
          }
          onNext={() =>
            goToPage("next")
          }
        />

        <Copyright />
      </ScrollView>

      {/* ========================================================
          TIME RANGE MODAL
      ======================================================== */}
      <DropdownModal
        visible={timeModalVisible}
        title={t("dashboard.logs.timeRange")}
        onClose={() =>
          setTimeModalVisible(false)
        }
      >
        {(
          [
            "All",
            "Last Hour",
            "Today",
            "This Week",
            "This Year",
          ] as TimeFilter[]
        ).map((option) => (
          <RadioOptionRow
            key={option}
            label={timeLabel(option)}
            selected={timeFilter === option}
            onPress={() =>
              handleTimeFilter(option)
            }
          />
        ))}
      </DropdownModal>

      {/* ========================================================
          ACTIVITY TYPE MODAL
      ======================================================== */}
      <DropdownModal
        visible={typeModalVisible}
        title={t("dashboard.logs.activityType")}
        onClose={() =>
          setTypeModalVisible(false)
        }
      >
        {[
          {
            value: "all" as const,
            label: t("dashboard.logs.typeAll"),
            icon: "list-outline" as const,
            color: colors.accentContent,
          },
          {
            value: "info" as const,
            label: t("dashboard.logs.typeInfo"),
            icon: "information-circle-outline" as const,
            color: colors.accentContent,
          },
          {
            value: "warning" as const,
            label: t("dashboard.logs.typeWarning"),
            icon: "warning-outline" as const,
            color: colors.secondary,
          },
          {
            value: "error" as const,
            label: t("dashboard.logs.typeError"),
            icon: "alert-circle-outline" as const,
            color: colors.error,
          },
          {
            value: "critical" as const,
            label: t("dashboard.logs.typeCritical"),
            icon: "alert-circle-outline" as const,
            color: colors.error,
          },
        ].map((option) => (
          <TintedOptionRow
            key={option.value}
            label={option.label}
            icon={option.icon}
            color={option.color}
            selected={
              typeFilter === option.value
            }
            onPress={() =>
              handleTypeFilter(
                option.value as
                  | "all"
                  | ActivityType,
              )
            }
          />
        ))}
      </DropdownModal>
    </ScreenContainer2>
  );
}

const dashboardDimensions = {
    horizontalPadding: 16,
    sectionSpacing: 14,
    cardRadius: 16,
    cardPadding: 18,

    filterGap: 10,
    filterHeight: 48,
    filterRadius: 14,
  };

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingHorizontal:
        dashboardDimensions.horizontalPadding,

      paddingTop:
        dashboardDimensions.sectionSpacing,

      paddingBottom: 20,
    },

    /* Header */

    headerCard: {
      backgroundColor: colors.glass.white,

      borderWidth: 3,
      borderColor: colors.cardBorder,

      borderRadius:
        dashboardDimensions.cardRadius,

      padding:
        dashboardDimensions.cardPadding,

      marginBottom: 12,
    },

    title: {
      color: colors.text,
      fontWeight: "700",
    },

    subtitle: {
      color: colors.textSecondary,
      marginTop: 6,
      lineHeight: 20,
    },

    /* Total */

    totalContainer: {
      width: "100%",
      alignItems: "flex-end",
      marginBottom: 10,
    },

    totalLabel: {
      color: colors.textSecondary,
      textAlign: "right",
    },

    totalValue: {
      color: colors.text,
      fontWeight: "700",
    },

    /* Filters */

    filterRow: {
      width: "100%",

      flexDirection: "row",

      gap: dashboardDimensions.filterGap,

      marginBottom: 14,

      zIndex: 10,
    },

    filterWrapper: {
      flex: 1,
      position: "relative",
    },

    filterButton: {
      height:
        dashboardDimensions.filterHeight,

      width: "100%",

      flexDirection: "row",

      alignItems: "center",

      paddingHorizontal: 13,

      gap: 8,

      backgroundColor: colors.glass.white,

      borderWidth: 3,

      borderColor: colors.primary,

      borderRadius:
        dashboardDimensions.filterRadius,
    },

    filterText: {
      flex: 1,

      color: colors.text,

      fontWeight: "600",
    },

    buttonPressed: {
      opacity: 0.75,
    },

    /* Activity List */

    activityList: {
      width: "100%",

      gap: ACTIVITY_LOG_GAP,

      zIndex: 1,
    },

    statusBlock: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
  });