import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";

import {
  loadRemindersSetting,
} from "@/services/settings";
import type { ForecastResult } from "@/services/forecast";
import { Routes } from "@/constants/routes";

// ============================================================
// LOCAL REMINDERS (no server, no FCM, works offline)
// ============================================================
//
// Phone pop-ups scheduled on-device through the OS. Two kinds:
//   evening  — daily 19:00 "review today's energy" nudge.
//   low-sun  — one-shot next-morning advisory when the 5-day
//              forecast shows a low-sun stretch.
//
// Self-gating: every ensure function checks the device-local
// reminders switch first (default ON, Menu row like
// vibration). OFF always cancels instead of scheduling.
// Nothing here throws — all failures resolve false and log.
// ============================================================

export const REMINDER_CHANNEL_ID =
  "adlawatt-reminders";

export const EVENING_REMINDER_ID =
  "adlawatt-evening";

export const LOW_SUN_REMINDER_ID =
  "adlawatt-lowsun";

export const EVENING_HOUR = 19;
export const LOW_SUN_HOUR = 7;

// Foreground presentation matches the old push behavior:
// banner + list + sound + badge, so a reminder looks the
// same whether the app is open or closed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority:
      Notifications.AndroidNotificationPriority
        .DEFAULT,
  }),
});

const ensureReminderChannel =
  async (): Promise<void> => {
    if (Platform.OS !== "android") {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(
        REMINDER_CHANNEL_ID,
        {
          name: "AdlaWatt Reminders",
          importance:
            Notifications.AndroidImportance
              .DEFAULT,
          vibrationPattern: [0, 400, 2000],
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        },
      );
    } catch (error) {
      console.warn(
        "Reminder channel setup failed:",
        error instanceof Error
          ? error.message
          : error,
      );
    }
  };

const ensurePermission = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    const { status: existing } =
      await Notifications.getPermissionsAsync();

    if (existing === "granted") {
      return true;
    }

    const { status } =
      await Notifications.requestPermissionsAsync();

    return status === "granted";
  } catch (error) {
    console.warn(
      "Reminder permission check failed:",
      error instanceof Error
        ? error.message
        : error,
    );

    return false;
  }
};

// A low-sun stretch = at least half the upcoming days rate
// Low. Pure (unit-tested); the advisory copy names the best
// sun day when the forecast provides one.
export const isLowSunStretch = (
  result: ForecastResult | null,
): boolean => {
  if (
    !result ||
    result.upcoming.length === 0
  ) {
    return false;
  }

  const lowDays = result.upcoming.filter(
    (day) => day.solarOutlook === "Low",
  ).length;

  return (
    lowDays >=
    Math.ceil(result.upcoming.length / 2)
  );
};

export const buildEveningTrigger =
  (): Notifications.NotificationTriggerInput => ({
    // DAILY repeats by definition (no repeats flag).
    type: Notifications
      .SchedulableTriggerInputTypes.DAILY,
    hour: EVENING_HOUR,
    minute: 0,
    channelId: REMINDER_CHANNEL_ID,
  });

export const buildLowSunTrigger =
  (): Notifications.NotificationTriggerInput => {
    const fireAt = new Date();

    fireAt.setDate(fireAt.getDate() + 1);
    fireAt.setHours(
      LOW_SUN_HOUR,
      0,
      0,
      0,
    );

    return {
      type: Notifications
        .SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: REMINDER_CHANNEL_ID,
    };
  };

// Idempotent: previous schedule with the same identifier is
// cancelled first, so repeats never stack duplicates.
// Web has no scheduled-notification native module —
// no-op early so web consoles stay clean.
const scheduleOnce = async (
  identifier: string,
  title: string,
  body: string,
  route: string,
  trigger: Notifications.NotificationTriggerInput,
): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(
      identifier,
    );

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: "default",
        data: { route },
      },
      trigger,
    });

    return true;
  } catch (error) {
    console.warn(
      `Reminder schedule failed (${identifier}):`,
      error instanceof Error
        ? error.message
        : error,
    );

    return false;
  }
};

export const ensureEveningReminder =
  async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      return false;
    }

    try {
      if (
        !(await loadRemindersSetting())
      ) {
        return false;
      }

      if (!(await ensurePermission())) {
        return false;
      }

      await ensureReminderChannel();

      return scheduleOnce(
        EVENING_REMINDER_ID,
        "AdlaWatt Evening Review",
        "Take a minute to review today's energy and plan tomorrow's appliance use.",
        Routes.ANALYTICS,
        buildEveningTrigger(),
      );
    } catch (error) {
      console.warn(
        "Evening reminder ensure failed:",
        error instanceof Error
          ? error.message
          : error,
      );

      return false;
    }
  };

export const maybeScheduleLowSunAdvisory =
  async (
    result: ForecastResult | null,
  ): Promise<boolean> => {
    if (Platform.OS === "web") {
      return false;
    }

    try {
      if (
        !(await loadRemindersSetting())
      ) {
        try {
          await Notifications.cancelScheduledNotificationAsync(
            LOW_SUN_REMINDER_ID,
          );
        } catch {
          // Best-effort by design.
        }

        return false;
      }

      if (!isLowSunStretch(result)) {
        try {
          await Notifications.cancelScheduledNotificationAsync(
            LOW_SUN_REMINDER_ID,
          );
        } catch {
          // Best-effort by design.
        }

        return false;
      }

      if (!(await ensurePermission())) {
        return false;
      }

      await ensureReminderChannel();

      const bestDay =
        result?.bestSunDay ?? null;

      return scheduleOnce(
        LOW_SUN_REMINDER_ID,
        "Low Sun Ahead",
        bestDay
          ? `Low-sun stretch forecast — conserve battery. Best sun: ${bestDay}, charge fully then.`
          : "Low-sun stretch forecast — conserve battery and postpone heavy appliances.",
        Routes.DASHBOARD,
        buildLowSunTrigger(),
      );
    } catch (error) {
      console.warn(
        "Low-sun advisory schedule failed:",
        error instanceof Error
          ? error.message
          : error,
      );

      return false;
    }
  };

export const cancelAllReminders =
  async (): Promise<void> => {
    if (Platform.OS === "web") {
      return;
    }

    for (const identifier of [
      EVENING_REMINDER_ID,
      LOW_SUN_REMINDER_ID,
    ]) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          identifier,
        );
      } catch {
        // Best-effort by design.
      }
    }
  };

// Tap on a reminder deep-links by its content route.
// Returns the remover; mount once (dashboard layout).
// Web has no native notification response — no-op.
export const addReminderResponseListener =
  (): (() => void) => {
    if (Platform.OS === "web") {
      return () => {};
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          try {
            const route = (
              response.notification.request
                .content.data as {
                route?: unknown;
              } | null
            )?.route;

            router.push(
              typeof route === "string" &&
                route.startsWith("/")
                ? (route as never)
                : Routes.DASHBOARD,
            );
          } catch (error) {
            console.warn(
              "Reminder deep-link failed:",
              error instanceof Error
                ? error.message
                : error,
            );
          }
        },
      );

    return () => subscription.remove();
};
