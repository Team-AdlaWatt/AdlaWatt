// Remote push registration tests.
//
// The app must never break when push is unavailable: permission
// refused, no EAS project id, no Play services, or the web
// platform all have to resolve instead of throwing. These lock
// that contract plus the token persistence path.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  ALERT_CHANNEL_ID,
  PUSH_TOKEN_KEY,
  clearStoredPushToken,
  getEasProjectId,
  getStoredPushToken,
  registerForPushNotificationsAsync,
  subscribeToNotificationTaps,
} from "@/services/pushNotifications";

jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(
    async () => undefined,
  ),
  addNotificationResponseReceivedListener: jest.fn(
    () => ({ remove: jest.fn() }),
  ),
}));

// expo-constants is read for the EAS project id. Swapped per
// test so the "no project id" branch can be exercised.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId:
            "ba375929-16f4-4a21-b339-8b43e93ecfd2",
        },
      },
    },
  },
}));

const notifications =
  Notifications as unknown as {
    getPermissionsAsync: jest.Mock;
    requestPermissionsAsync: jest.Mock;
    getExpoPushTokenAsync: jest.Mock;
    setNotificationChannelAsync: jest.Mock;
  };

const constants =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("expo-constants").default;

describe("pushNotifications", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();

    notifications.getPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );
    notifications.getExpoPushTokenAsync.mockResolvedValue(
      { data: "ExponentPushToken[test-token]" },
    );

    constants.expoConfig.extra.eas.projectId =
      "ba375929-16f4-4a21-b339-8b43e93ecfd2";

    Platform.OS = "android";
  });

  test("granted permission stores and returns the push token", async () => {
    const result =
      await registerForPushNotificationsAsync();

    expect(result).toEqual({
      status: "granted",
      token: "ExponentPushToken[test-token]",
    });

    expect(
      notifications.getExpoPushTokenAsync,
    ).toHaveBeenCalledWith({
      projectId:
        "ba375929-16f4-4a21-b339-8b43e93ecfd2",
    });

    await expect(
      getStoredPushToken(),
    ).resolves.toBe("ExponentPushToken[test-token]");
  });

  test("creates the alert channel before requesting a token", async () => {
    await registerForPushNotificationsAsync();

    expect(
      notifications.setNotificationChannelAsync,
    ).toHaveBeenCalledWith(
      ALERT_CHANNEL_ID,
      expect.objectContaining({
        name: "AdlaWatt Alerts",
      }),
    );
  });

  test("an already-granted permission is not re-prompted", async () => {
    await registerForPushNotificationsAsync();

    expect(
      notifications.requestPermissionsAsync,
    ).not.toHaveBeenCalled();
  });

  test("a refused permission resolves as denied with no token", async () => {
    notifications.requestPermissionsAsync.mockResolvedValue(
      { status: "denied" },
    );
    notifications.getPermissionsAsync.mockResolvedValue(
      { status: "undetermined" },
    );

    const result =
      await registerForPushNotificationsAsync();

    expect(result).toEqual({
      status: "denied",
      token: null,
    });

    expect(
      notifications.getExpoPushTokenAsync,
    ).not.toHaveBeenCalled();
  });

  test("a missing EAS project id degrades instead of throwing", async () => {
    constants.expoConfig.extra.eas.projectId =
      "";

    const result =
      await registerForPushNotificationsAsync();

    expect(result).toEqual({
      status: "unsupported",
      token: null,
    });

    expect(
      notifications.getExpoPushTokenAsync,
    ).not.toHaveBeenCalled();
  });

  test("a native failure is absorbed into an unsupported result", async () => {
    notifications.getExpoPushTokenAsync.mockRejectedValue(
      new Error("no play services"),
    );

    const result =
      await registerForPushNotificationsAsync();

    expect(result).toEqual({
      status: "unsupported",
      token: null,
    });
  });

  test("web is unsupported and never touches the native module", async () => {
    Platform.OS = "web";

    const result =
      await registerForPushNotificationsAsync();

    expect(result).toEqual({
      status: "unsupported",
      token: null,
    });

    expect(
      notifications.getPermissionsAsync,
    ).not.toHaveBeenCalled();
  });

  test("clearStoredPushToken removes the persisted token", async () => {
    await AsyncStorage.setItem(
      PUSH_TOKEN_KEY,
      "ExponentPushToken[stale]",
    );

    await clearStoredPushToken();

    await expect(
      getStoredPushToken(),
    ).resolves.toBeNull();
  });

  test("subscribeToNotificationTaps returns a working unsubscribe", () => {
    const remove = jest.fn();

    (
      Notifications.addNotificationResponseReceivedListener as jest.Mock
    ).mockReturnValue({ remove });

    const unsubscribe =
      subscribeToNotificationTaps(jest.fn());

    unsubscribe();

    expect(remove).toHaveBeenCalled();
  });

  test("getEasProjectId reads the id from the app config", () => {
    expect(getEasProjectId()).toBe(
      "ba375929-16f4-4a21-b339-8b43e93ecfd2",
    );
  });
});
