// Local reminder unit tests (OS surface fully mocked —
// no banners, no permission UI).
//
// Locks the scheduling contract: idempotent identifiers
// (cancel-before-schedule, never stacking), self-gating on
// the device switch, low-sun majority rule, and trigger
// shapes. The OS actually firing is covered on-device only.

import {
  EVENING_REMINDER_ID,
  LOW_SUN_REMINDER_ID,
  buildEveningTrigger,
  buildLowSunTrigger,
  cancelAllReminders,
  ensureEveningReminder,
  isLowSunStretch,
  maybeScheduleLowSunAdvisory,
} from "@/services/reminderService";
import {
  loadRemindersSetting,
  saveRemindersSetting,
} from "@/services/settings";
import type { ForecastResult } from "@/services/forecast";
import * as Notifications from "expo-notifications";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  addNotificationResponseReceivedListener:
    jest.fn(),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidNotificationPriority: {
    HIGH: "high",
    DEFAULT: "default",
  },
  SchedulableTriggerInputTypes: {
    CALENDAR: "calendar",
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    YEARLY: "yearly",
    DATE: "date",
    TIME_INTERVAL: "timeInterval",
  },
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mocked = Notifications as unknown as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
};

const forecastWith = (
  outlooks: ("High" | "Moderate" | "Low")[],
  bestSunDay: string | null = "Monday",
): ForecastResult =>
  ({
    upcoming: outlooks.map(
      (solarOutlook, index) => ({
        date: `2026-10-${10 + index}`,
        weekday: `Day${index}`,
        dateLabel: `Oct ${10 + index}`,
        tempMin: 24,
        tempMax: 31,
        feelsLikeMax: 33,
        peakDescription: "Clear",
        peakIcon: "sunny",
        peakSeverity: "clear",
        popMax: 10,
        solarOutlook,
        tempFlag: null,
      }),
    ),
    bestSunDay,
    cityName: "Test City",
    fetchedAt: "now",
  }) as ForecastResult;

beforeEach(async () => {
  jest.clearAllMocks();
  // Honor the real Promise<void> contract so source never
  // receives undefined from this mock (regression guard for
  // the `.catch`-on-undefined TypeError).
  mocked.cancelScheduledNotificationAsync.mockResolvedValue(
    undefined as never,
  );
  await saveRemindersSetting(true);
});

describe("isLowSunStretch", () => {
  test("all low is a stretch", () => {
    expect(
      isLowSunStretch(
        forecastWith([
          "Low",
          "Low",
          "Low",
          "Low",
          "Low",
        ]),
      ),
    ).toBe(true);
  });

  test("majority low is a stretch", () => {
    expect(
      isLowSunStretch(
        forecastWith([
          "Low",
          "Low",
          "Low",
          "Moderate",
          "High",
        ]),
      ),
    ).toBe(true);
  });

  test("minority low is not", () => {
    expect(
      isLowSunStretch(
        forecastWith([
          "Low",
          "Moderate",
          "High",
          "High",
          "High",
        ]),
      ),
    ).toBe(false);
  });

  test.each([
    ["null", null],
    [
      "empty",
      forecastWith([]),
    ],
  ])("%s is not a stretch", (_label, result) => {
    expect(
      isLowSunStretch(result),
    ).toBe(false);
  });
});

describe("trigger builders", () => {
  test("evening trigger is daily 19:00 repeating", () => {
    expect(buildEveningTrigger()).toEqual({
      type: "daily",
      hour: 19,
      minute: 0,
      channelId: "adlawatt-reminders",
    });
  });

  test("low-sun trigger is tomorrow 07:00 one-shot", () => {
    const before = new Date();
    const trigger = buildLowSunTrigger() as {
      type: string;
      date: Date;
    };

    expect(trigger.type).toBe("date");

    const expected = new Date();
    expected.setDate(expected.getDate() + 1);
    expected.setHours(7, 0, 0, 0);

    // Same calendar day and hour (millisecond drift
    // between construction and assertion is irrelevant).
    expect(
      trigger.date.getFullYear(),
    ).toBe(expected.getFullYear());
    expect(
      trigger.date.getMonth(),
    ).toBe(expected.getMonth());
    expect(
      trigger.date.getDate(),
    ).toBe(expected.getDate());
    expect(
      trigger.date.getHours(),
    ).toBe(7);
    expect(before.getTime()).toBeLessThanOrEqual(
      trigger.date.getTime(),
    );
  });
});

describe("ensureEveningReminder", () => {
  test("switch OFF schedules nothing", async () => {
    await saveRemindersSetting(false);

    await expect(
      ensureEveningReminder(),
    ).resolves.toBe(false);

    expect(
      mocked.scheduleNotificationAsync,
    ).not.toHaveBeenCalled();
  });

  test("denied permission schedules nothing", async () => {
    mocked.getPermissionsAsync.mockResolvedValue(
      { status: "denied" },
    );
    mocked.requestPermissionsAsync.mockResolvedValue(
      { status: "denied" },
    );

    await expect(
      ensureEveningReminder(),
    ).resolves.toBe(false);

    expect(
      mocked.scheduleNotificationAsync,
    ).not.toHaveBeenCalled();
  });

  test("granted permission cancels-then-schedules by id", async () => {
    mocked.getPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );
    mocked.scheduleNotificationAsync.mockResolvedValue(
      "evening-id",
    );

    await expect(
      ensureEveningReminder(),
    ).resolves.toBe(true);

    expect(
      mocked.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith(
      EVENING_REMINDER_ID,
    );
    expect(
      mocked.scheduleNotificationAsync,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: EVENING_REMINDER_ID,
      }),
    );
  });
});

describe("maybeScheduleLowSunAdvisory", () => {
  test("null forecast cancels pending and resolves false", async () => {
    mocked.getPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );

    await expect(
      maybeScheduleLowSunAdvisory(null),
    ).resolves.toBe(false);

    expect(
      mocked.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith(
      LOW_SUN_REMINDER_ID,
    );
    expect(
      mocked.scheduleNotificationAsync,
    ).not.toHaveBeenCalled();
  });

  test("fair week cancels pending and resolves false", async () => {
    await expect(
      maybeScheduleLowSunAdvisory(
        forecastWith([
          "High",
          "High",
          "Moderate",
          "High",
          "High",
        ]),
      ),
    ).resolves.toBe(false);

    expect(
      mocked.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith(
      LOW_SUN_REMINDER_ID,
    );
  });

  test("low stretch schedules naming the best day", async () => {
    mocked.getPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );
    mocked.scheduleNotificationAsync.mockResolvedValue(
      "lowsun-id",
    );

    await expect(
      maybeScheduleLowSunAdvisory(
        forecastWith(
          ["Low", "Low", "Low", "Low", "Low"],
          "Wednesday",
        ),
      ),
    ).resolves.toBe(true);

    expect(
      mocked.scheduleNotificationAsync,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: LOW_SUN_REMINDER_ID,
        content: expect.objectContaining({
          title: "Low Sun Ahead",
        }),
      }),
    );

    const body = mocked
      .scheduleNotificationAsync.mock.calls[0][0]
      .content.body as string;

    expect(body).toMatch(/Wednesday/);
  });

  test("switch OFF cancels instead of scheduling", async () => {
    await saveRemindersSetting(false);

    await expect(
      maybeScheduleLowSunAdvisory(
        forecastWith([
          "Low",
          "Low",
          "Low",
          "Low",
          "Low",
        ]),
      ),
    ).resolves.toBe(false);

    expect(
      mocked.scheduleNotificationAsync,
    ).not.toHaveBeenCalled();
  });
});

describe("cancelAllReminders", () => {
  test("cancels both identifiers without throwing", async () => {
    await expect(
      cancelAllReminders(),
    ).resolves.toBeUndefined();

    expect(
      mocked.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith(
      EVENING_REMINDER_ID,
    );
    expect(
      mocked.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith(
      LOW_SUN_REMINDER_ID,
    );
  });
});

describe("reminders setting round-trip", () => {
  test("persists through the AsyncStorage mock", async () => {
    await saveRemindersSetting(false);
    await expect(
      loadRemindersSetting(),
    ).resolves.toBe(false);

    await saveRemindersSetting(true);
    await expect(
      loadRemindersSetting(),
    ).resolves.toBe(true);
  });
});
