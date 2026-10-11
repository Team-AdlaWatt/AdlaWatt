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

import { DropdownModal, RadioOptionRow, TintedOptionRow } from "@/components/ui/DropdownModal";

import NotificationCard, {
  NotificationCardData,
  NotificationType,
} from "@/components/NotificationCard";

import Pagination from "@/components/ui/Pagination";

import AppText from "@/components/ui/AppText";

import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { useSafeAsync } from "@/hooks/useSafeAsync";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { OptionRow, useScreenPadding } from "@/constants/sizing";

import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import { stopAlertVibration } from "@/services/alertVibration";
import { useTranslation } from "react-i18next";

type TimeFilter =
  | "All"
  | "Last Hour"
  | "Today"
  | "This Week"
  | "This Year";

type NotificationData = NotificationCardData & {
  timestamp: number;
};

// ============================================================
// PAGE-TURN SCROLL
// ============================================================

// Same glide as the dashboard home quick-nav button
// (Appliance Recommendation): fixed 1.5s cubic in-out
// drive to the very top whenever Prev/Next turns the page.
const PAGE_TURN_SCROLL_MS = 1500;

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useAppColors();

  // Responsive gutter: 16/20/24 by phone width (UI-STANDARDS.md).
  const screenPadding = useScreenPadding();

  // Locale-aware date/time formatting (format only per policy).
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
      ? t("dashboard.notifications.timeLastHour")
      : option === "Today"
        ? t("dashboard.notifications.timeToday")
        : option === "This Week"
          ? t("dashboard.notifications.timeThisWeek")
          : option === "This Year"
            ? t("dashboard.notifications.timeThisYear")
            : t("dashboard.notifications.timeAll");

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const [timeFilter, setTimeFilter] =
    useState<TimeFilter>("All");

  const [typeFilter, setTypeFilter] =
    useState<"All" | NotificationType>("All");

  const [timeModalVisible, setTimeModalVisible] =
    useState(false);

  const [typeModalVisible, setTypeModalVisible] =
    useState(false);

  // ============================================
  // PAGINATION
  // ============================================

  const [currentPage, setCurrentPage] =
    useState(1);

  const notificationsPerPage = 10;

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

  // Stable Animated.Value without render-phase ref access
  // (react-hooks/refs). useState lazy init keeps one instance
  // across renders; identical behavior for OTA preview builds.
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
  // LOAD CURRENT USER'S NOTIFICATIONS
  // ============================================

  const loadNotifications =
    async (): Promise<NotificationData[]> => {
      const user = await getAuthenticatedUserSafe();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "notif_id, user_id, title, description, type, read, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw new Error(t("dashboard.notifications.loadFailed"));
      }

      // Dedupe by content (title + description), keeping the
      // newest row — but only within a short window. Rule
      // refires can store near-identical rows seconds apart
      // and those must collapse; genuinely distinct
      // occurrences (same text, well apart in time) render
      // as separate rows so history is never silently lost.
      const seen = new Map<string, number>();
      const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

      const formattedNotifications: NotificationData[] =
        (data ?? []).map((notification) => {
          const dateObject = new Date(
            notification.created_at,
          );

          return {
            id: notification.notif_id,
            title: notification.title,
            message: notification.description,

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

            type:
              notification.type as NotificationType,

            isRead: notification.read,

            timestamp: dateObject.getTime(),
          };
        })
        .filter((notification) => {
          const key = `${notification.title}|||${notification.message}`;
          // Iteration order is newest-first (query orders by
          // created_at desc), so the stored stamp is always
          // the newer occurrence.
          const lastSeen = seen.get(key);

          if (
            lastSeen !== undefined &&
            notification.timestamp >=
              lastSeen - DEDUPE_WINDOW_MS
          ) {
            return false;
          }

          seen.set(key, notification.timestamp);
          return true;
        });

      return formattedNotifications;
    };

  const {
    data: loadedNotifications,
    error: loadError,
    loading: isLoading,
    retry: retryLoad,
  } = useSafeAsync(loadNotifications, [i18n.language]);

  // Optimistic read-all: flips the list instantly on tap;
  // the refetch after a successful update is authoritative
  // and clears the override when fresh rows arrive.
  const [readOverride, setReadOverride] =
    useState(false);
  const [isMarkingRead, setIsMarkingRead] =
    useState(false);
  const [markError, setMarkError] = useState("");

  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }

    setReadOverride(false);
  }, [loadedNotifications]);

  const notifications = useMemo(() => {
    const base = loadedNotifications ?? [];

    return readOverride
      ? base.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      : base;
  }, [loadedNotifications, readOverride]);

  const hasLoadedData = notifications.length > 0;
  const showList =
    hasLoadedData || (!isLoading && !loadError);

  // ============================================
  // TOTAL NOTIFICATIONS
  // ============================================

  const totalNotifications =
    notifications.length;

  // ============================================
  // FILTER NOTIFICATIONS
  // ============================================

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (typeFilter !== "All") {
      result = result.filter(
        (notification) =>
          notification.type === typeFilter,
      );
    }

    const now = new Date();

    if (timeFilter === "Today") {
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      result = result.filter(
        (notification) =>
          notification.timestamp >=
          startOfDay.getTime(),
      );
    }

    if (timeFilter === "Last Hour") {
      result = result.filter(
        (notification) =>
          notification.timestamp >=
          now.getTime() - 60 * 60 * 1000,
      );
    }

    if (timeFilter === "This Week") {
      const startOfWeek = new Date(now);

      startOfWeek.setDate(
        now.getDate() - now.getDay(),
      );

      startOfWeek.setHours(0, 0, 0, 0);

      result = result.filter(
        (notification) =>
          notification.timestamp >=
          startOfWeek.getTime(),
      );
    }

    if (timeFilter === "This Year") {
      const startOfYear = new Date(
        now.getFullYear(),
        0,
        1,
      );

      result = result.filter(
        (notification) =>
          notification.timestamp >=
          startOfYear.getTime(),
      );
    }

    return result.sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }, [
    notifications,
    timeFilter,
    typeFilter,
  ]);

  // ============================================
  // PAGINATION CALCULATIONS
  // ============================================

  const totalPages = Math.ceil(
    filteredNotifications.length /
      notificationsPerPage,
  );

  const pageStart =
    (currentPage - 1) *
    notificationsPerPage;

  const currentPageNotifications =
    totalPages === 0
      ? []
      : filteredNotifications.slice(
          pageStart,
          pageStart + notificationsPerPage,
        );

  const displayCurrentPage =
    totalPages === 0 ? 0 : currentPage;

  // ============================================
  // RECENT / EARLIER
  // ============================================

  const recentNotifications =
    currentPageNotifications.filter(
      (notification) =>
        !notification.isRead,
    );

  const earlierNotifications =
    currentPageNotifications.filter(
      (notification) =>
        notification.isRead,
    );

  // ============================================
  // FILTER HANDLERS
  // ============================================

  const handleTimeFilter = (
    value: TimeFilter,
  ) => {
    setTimeFilter(value);
    setCurrentPage(1);
    setTimeModalVisible(false);
  };

  const handleTypeFilter = (
    value: "All" | NotificationType,
  ) => {
    setTypeFilter(value);
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
  // TYPE LABEL
  // ============================================

  const getTypeLabel = () => {
    switch (typeFilter) {
      case "normal":
        return t("dashboard.notifications.typeNormal");

      case "alert":
        return t("dashboard.notifications.typeAlert");

      default:
        return t("dashboard.notifications.typeAll");
    }
  };

  // ============================================
  // TYPE ICON
  // ============================================

  const getTypeIcon =
    (): keyof typeof Ionicons.glyphMap => {
      switch (typeFilter) {
        case "normal":
          return "notifications-outline";

        case "alert":
          return "alert-circle-outline";

        default:
          return "list-outline";
      }
    };

  // ============================================
  // MARK ALL AS READ
  // ============================================

  const handleMarkAsRead = async () => {
    if (isMarkingRead) {
      return;
    }

    setMarkError("");
    setIsMarkingRead(true);
    setReadOverride(true);

    try {
      const user = await getAuthenticatedUserSafe();

      if (!user) {
        throw new Error(t("common.authRequired"));
      }

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        throw new Error(error.message);
      }

      // Mark-as-read is the user's explicit silence switch:
      // the update succeeded, so stop the alert buzz now
      // rather than waiting on any re-check.
      stopAlertVibration();

      retryLoad();
    } catch (thrown) {
      const message =
        thrown instanceof Error
          ? thrown.message
          : t("dashboard.notifications.markFailed");

      console.error(
        "Error marking notifications as read:",
        message,
      );

      // Revert the optimistic flip so the list shows the
      // true server state, and tell the user it failed.
      setReadOverride(false);
      setMarkError(
        t("dashboard.notifications.markError"),
      );
    } finally {
      setIsMarkingRead(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

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
            {t("dashboard.notifications.title")}
          </AppText>

          <AppText
            variant="caption"
            style={styles.subtitle}
          >
            {t("dashboard.notifications.subtitle")}
          </AppText>
        </View>

        {/* Total Notifications */}
        <View style={styles.totalContainer}>
          <AppText
            variant="caption"
            style={styles.totalText}
          >
            {t("dashboard.notifications.total")}{" "}

            <AppText
              style={styles.totalNumber}
            >
              {totalNotifications}
            </AppText>
          </AppText>
        </View>

        {/* Filters */}
        <View style={styles.controlsContainer}>
          {/* Time Dropdown */}
          <View style={styles.dropdownWrapper}>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => {
                setTimeModalVisible(true);

                setTypeModalVisible(false);
              }}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.accentContent}
              />

              <AppText
                variant="caption"
                style={styles.dropdownButtonText}
              >
                {timeLabel(timeFilter)}
              </AppText>

              <Ionicons
                name="chevron-down-outline"
                size={17}
                color={colors.accentContent}
              />
            </Pressable>
          </View>

          {/* Type Dropdown */}
          <View style={styles.dropdownWrapper}>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => {
                setTypeModalVisible(true);

                setTimeModalVisible(false);
              }}
            >
              <Ionicons
                name={getTypeIcon()}
                size={18}
                color={
                  typeFilter === "alert"
                    ? colors.error
                    : colors.accentContent
                }
              />

              <AppText
                variant="caption"
                style={styles.dropdownButtonText}
              >
                {getTypeLabel()}
              </AppText>

              <Ionicons
                name="chevron-down-outline"
                size={17}
                color={colors.accentContent}
              />
            </Pressable>
          </View>

          {/* Mark as Read */}
          <Pressable
            style={[
              styles.markReadButton,
              isMarkingRead &&
                styles.markReadButtonDisabled,
            ]}
            onPress={handleMarkAsRead}
            disabled={isMarkingRead}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.notifications.markAllAsRead")}
            accessibilityState={{
              disabled: isMarkingRead,
            }}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={17}
              color={colors.onPrimary}
            />

            <AppText
              variant="caption"
              style={styles.markReadText}
            >
              {isMarkingRead
                ? t("dashboard.notifications.marking")
                : t("dashboard.notifications.markAsRead")}
            </AppText>
          </Pressable>
        </View>

        {markError ? (
          <AppText
            variant="caption"
            style={styles.markReadError}
            accessibilityRole="alert"
          >
            {markError}
          </AppText>
        ) : null}

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

        {/* Recent */}
        {showList &&
          recentNotifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={colors.accentContent}
              />

              <AppText
                variant="body"
                style={styles.sectionTitle}
              >
                {t("dashboard.notifications.recent")}
              </AppText>

              <View style={styles.countPill}>
                <AppText
                  variant="caption"
                  style={styles.countPillText}
                >
                  {recentNotifications.length}
                </AppText>
              </View>
            </View>

            <View
              style={styles.notificationList}
            >
              {recentNotifications.map(
                (notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                  />
                ),
              )}
            </View>
          </View>
        )}

        {/* Earlier */}
        {showList &&
          earlierNotifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.textSecondary}
              />

              <AppText
                variant="body"
                style={styles.sectionTitle}
              >
                {t("dashboard.notifications.earlier")}
              </AppText>

              <View
                style={[
                  styles.countPill,
                  styles.countPillMuted,
                ]}
              >
                <AppText
                  variant="caption"
                  style={styles.countPillTextMuted}
                >
                  {earlierNotifications.length}
                </AppText>
              </View>
            </View>

            <View
              style={styles.notificationList}
            >
              {earlierNotifications.map(
                (notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                  />
                ),
              )}
            </View>
          </View>
        )}

        {/* Empty State */}
        {showList &&
          currentPageNotifications.length === 0 && (
            <EmptyState
              icon="notifications-off-outline"
              title={t("dashboard.notifications.noNotifications")}
              description={t("dashboard.notifications.noNotificationsDesc")}
            />
          )}

        {/* Pagination - Always Visible */}
        <Pagination
          currentPage={displayCurrentPage}
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
        title={t("dashboard.notifications.timeRange")}
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
          NOTIFICATION TYPE MODAL
      ======================================================== */}
      <DropdownModal
        visible={typeModalVisible}
        title={t("dashboard.notifications.notificationType")}
        onClose={() =>
          setTypeModalVisible(false)
        }
      >
        {[
          {
            value: "All" as const,
            label: t("dashboard.notifications.typeAll"),
            icon: "list-outline" as const,
            color: colors.accentContent,
          },
          {
            value: "normal" as const,
            label: t("dashboard.notifications.typeNormal"),
            icon: "notifications-outline" as const,
            color: colors.accentContent,
          },
          {
            value: "alert" as const,
            label: t("dashboard.notifications.typeAlert"),
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
                  | "All"
                  | NotificationType,
              )
            }
          />
        ))}
      </DropdownModal>
    </ScreenContainer2>
  );
}

const notificationDimensions = {
  borderWidth: 3,
  cardRadius: 16,

  filterHeight: OptionRow.minHeight,
  filterRadius: 12,

  buttonRadius: 12,
};

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 16,
    paddingBottom: 24,
  },

  /* Header */

  headerCard: {
    backgroundColor: colors.glass.white,

    borderWidth:
      notificationDimensions.borderWidth,

    borderColor: colors.cardBorder,

    borderRadius:
      notificationDimensions.cardRadius,

    padding: 18,

    marginBottom: 10,
  },

  title: {
    color: colors.text,
    fontWeight: "700",
  },

  subtitle: {
    color: colors.textSecondary,

    marginTop: 6,

    fontWeight: "400",

    lineHeight: 19,
  },

  /* Total */

  totalContainer: {
    width: "100%",

    alignItems: "flex-end",

    marginBottom: 10,
  },

  totalText: {
    color: colors.textSecondary,
  },

  totalNumber: {
    color: colors.text,
    fontWeight: "700",
  },

  /* Controls */

  controlsContainer: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    marginBottom: 20,

    zIndex: 100,
  },

  dropdownWrapper: {
    position: "relative",

    flex: 1,

    zIndex: 100,
  },

  dropdownButton: {
    minHeight:
      notificationDimensions.filterHeight,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 6,

    paddingHorizontal: 10,

    backgroundColor: colors.glass.white,

    borderWidth: 2,

    borderColor: colors.primary,

    borderRadius:
      notificationDimensions.filterRadius,
  },

  dropdownButtonText: {
    color: colors.text,

    fontWeight: "600",

    flexShrink: 1,
  },

  /* Mark as Read */

  markReadButton: {
    minHeight:
      notificationDimensions.filterHeight,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    paddingHorizontal: 12,

    backgroundColor: colors.primary,

    borderRadius:
      notificationDimensions.buttonRadius,
  },

  markReadText: {
    color: colors.onPrimary,

    fontWeight: "700",
  },

  markReadButtonDisabled: {
    opacity: 0.5,
  },

  markReadError: {
    color: colors.errorDeep,
    textAlign: "center",
    marginTop: 8,
  },

  /* Sections */

  section: {
    width: "100%",
    marginBottom: 18,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  sectionTitle: {
    color: colors.text,

    fontWeight: "700",

    flex: 1,
  },

  countPill: {
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: colors.primary,
  },

  countPillMuted: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },

  countPillText: {
    color: colors.onPrimary,

    fontWeight: "700",
  },

  countPillTextMuted: {
    color: colors.textSecondary,

    fontWeight: "700",
  },

  /* Notification List */

  notificationList: {
    width: "100%",

    gap: 12,
  },

  statusBlock: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});