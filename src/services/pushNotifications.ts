// ============================================================
// ADLAWATT PUSH NOTIFICATIONS (remote, FCM-backed)
//
// Local reminders live in reminderService.ts and never touch a
// server. This module is the other half: it obtains the device's
// Expo push token so a server-side sender can address this
// install, and it hands notification taps to the app.
//
// The native side is already in the build: expo-notifications
// supplies the FCM dependency and google-services.json supplies
// the project credentials, while the FCM V1 service-account key
// uploaded to EAS is what lets Expo's push service relay an
// alert to this device.
//
// Deliberately no business rules here — what *triggers* an alert
// is a product decision, so this file only manages the token and
// the tap subscription. Nothing throws: every failure resolves
// and logs, so a device without Play services can never block
// app startup.
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ============================================================
// CONSTANTS
// ============================================================

// Persisted Expo push token. Stored locally so the token survives
// restarts without a network round-trip; a sender reads it from
// wherever the app publishes it.
export const PUSH_TOKEN_KEY =
  "adlawatt.pushToken.v1";

// Server alerts get their own Android channel so they are
// distinguishable from the local reminders channel (and can be
// silenced independently in system settings). Must match
// `android.googleServicesFile`'s sibling config: the
// expo-notifications plugin defaultChannel in app.json.
export const ALERT_CHANNEL_ID =
  "adlawatt-alerts";

export type PushRegistrationStatus =
  | "granted"
  | "denied"
  | "unsupported";

export interface PushRegistrationResult {
  status: PushRegistrationStatus;
  /** Expo push token, present only when status is "granted". */
  token: string | null;
}

// ============================================================
// PROJECT ID
// ============================================================

// getExpoPushTokenAsync refuses to run without an explicit EAS
// project id outside Expo Go.
export const getEasProjectId =
  (): string | null => {
    const extra = Constants?.expoConfig
      ?.extra as
      | { eas?: { projectId?: string } }
      | undefined;

    return (
      extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      null
    );
  };

// ============================================================
// ANDROID CHANNEL
// ============================================================

const ensureAlertChannel =
  async (): Promise<void> => {
    if (Platform.OS !== "android") {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(
        ALERT_CHANNEL_ID,
        {
          name: "AdlaWatt Alerts",
          importance:
            Notifications.AndroidImportance
              .HIGH,
          vibrationPattern: [0, 400, 2000],
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        },
      );
    } catch (error) {
      console.warn(
        "Alert channel setup failed:",
        error instanceof Error
          ? error.message
          : error,
      );
    }
  };

// ============================================================
// STORAGE
// ============================================================

export const getStoredPushToken =
  async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(
        PUSH_TOKEN_KEY,
      );
    } catch {
      return null;
    }
  };

export const clearStoredPushToken =
  async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(
        PUSH_TOKEN_KEY,
      );
    } catch {
      // Best effort: a stale token is overwritten on the next
      // successful registration anyway.
    }
  };

// ============================================================
// REGISTRATION
// ============================================================

/**
 * Asks for notification permission and resolves this install's
 * Expo push token, persisting it locally.
 *
 * Returns a result instead of throwing: the app must stay usable
 * when permission is refused, when the platform has no push
 * support, or when the device has no Play services.
 */
export const registerForPushNotificationsAsync =
  async (): Promise<PushRegistrationResult> => {
    if (Platform.OS === "web") {
      return {
        status: "unsupported",
        token: null,
      };
    }

    try {
      await ensureAlertChannel();

      const existing =
        await Notifications.getPermissionsAsync();

      let status = existing.status;

      if (status !== "granted") {
        const requested =
          await Notifications.requestPermissionsAsync();

        status = requested.status;
      }

      if (status !== "granted") {
        return {
          status: "denied",
          token: null,
        };
      }

      const projectId = getEasProjectId();

      if (!projectId) {
        console.warn(
          "Push registration skipped: no EAS project id in the app config.",
        );

        return {
          status: "unsupported",
          token: null,
        };
      }

      const { data } =
        await Notifications.getExpoPushTokenAsync(
          { projectId },
        );

      try {
        await AsyncStorage.setItem(
          PUSH_TOKEN_KEY,
          data,
        );
      } catch {
        // The token is still usable this session; persistence
        // only saves the next round-trip.
      }

      return {
        status: "granted",
        token: data,
      };
    } catch (error) {
      console.warn(
        "Push registration failed:",
        error instanceof Error
          ? error.message
          : error,
      );

      return {
        status: "unsupported",
        token: null,
      };
    }
  };

// ============================================================
// TAP HANDLING
// ============================================================

/**
 * Subscribes to notification taps, returning the unsubscribe
 * function. The listener fires when the user taps a notification,
 * whether the app was foreground, background, or cold-started by
 * the tap.
 */
export const subscribeToNotificationTaps = (
  handler: (
    response: Notifications.NotificationResponse,
  ) => void,
): (() => void) => {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(
      handler,
    );

  return () => {
    subscription.remove();
  };
};
