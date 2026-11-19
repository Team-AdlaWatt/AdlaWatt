import { router } from "expo-router";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import ActivityLogCard, {
  ACTIVITY_LOG_GAP,
  ActivityLogItem,
  ActivityLogType,
} from "@/components/ActivityLogCard";
import AppText from "@/components/ui/AppText";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { useTableRealtimeRefresh } from "@/hooks/useTableRealtimeRefresh";
import { Touch } from "@/constants/sizing";
import { Routes } from "@/constants/routes";
import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

export default function ActivityCard() {
  const { t } = useTranslation();
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const [activities, setActivities] =
    useState<ActivityLogItem[]>([]);

  const loadRecentActivities = useCallback(async () => {
    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setActivities([]);
      return;
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .select(
        "act_id, title, description, type, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(5);

    if (error) {
      console.error(
        "Error loading recent activities:",
        error.message,
      );
      setActivities([]);
      return;
    }

    const mappedActivities: ActivityLogItem[] = (
      data ?? []
    ).map((activity) => {
      const dateObject = new Date(
        activity.created_at,
      );

      const type: ActivityLogType =
        activity.type === "warning" ||
        activity.type === "error" ||
        activity.type === "critical"
          ? activity.type
          : "info";

      return {
        id: activity.act_id,
        type,
        title: activity.title,
        details: activity.description,
        date: dateObject.toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "2-digit",
            year: "numeric",
          },
        ),
        time: dateObject.toLocaleTimeString(
          "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        ),
      };
    });

    setActivities(mappedActivities);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRecentActivities);
  }, [loadRecentActivities]);

  useTableRealtimeRefresh({
    table: "activity_logs",
    topic: "dashboard-activity-card",
    onRefresh: loadRecentActivities,
  });

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <AppText
          variant="body"
          style={styles.title}
        >
          {t("activityCard.recentActivity")}
        </AppText>

        <Pressable
          onPress={() =>
            router.push(Routes.ACTIVITY_LOGS)
          }
          style={styles.viewAllButton}
          accessibilityRole="link"
          accessibilityLabel={t("activityCard.viewAllActivity")}
          hitSlop={8}
        >
          <AppText
            variant="caption"
            style={styles.viewAll}
          >
            {t("activityCard.viewAll")}
          </AppText>
        </Pressable>
      </View>

      {/* Activity List */}
      <View style={styles.list}>
        {activities.map((activity) => (
          <ActivityLogCard
            key={activity.id}
            item={activity}
          />
        ))}
      </View>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 10,
  },

  viewAllButton: {
    minHeight: Touch.target,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
    marginRight: 2,
  },

  viewAll: {
    color: colors.onPrimary,
    fontWeight: "700",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 12,
  },

  list: {
    width: "100%",
    gap: ACTIVITY_LOG_GAP,
  },
});