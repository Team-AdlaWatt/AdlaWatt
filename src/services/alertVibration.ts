import { Platform, Vibration } from "react-native";

import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import { loadVibrationSetting } from "@/services/settings";

// ============================================================
// ALERT VIBRATION CONTROLLER
// ============================================================
//
// Persistent buzz while unread alert notifications exist.
// Stops only on: mark-as-read, zero unread alerts, the
// vibration preference turning OFF, or sign-out.
//
// SAFETY: phone motors are rated for intermittent use, so
// the pattern is a short buzz on a long rest (~14-17% duty
// cycle, thermally negligible indefinitely):
//   Android: 400ms buzz / 2000ms rest, OS-repeated
//   iOS:     single buzz re-fired every 2.5s (the platform
//            has no repeating mode)
// The pattern never escalates, one buzz runs at most, and
// no wake-locks or special permissions are used (VIBRATE is
// normal-level and pre-granted — no manifest change, no
// rebuild). DND / silent-switch behavior stays exactly as
// the OS defines it.
//
// SCOPE: foreground-reliable, background best-effort. A
// killed app cannot buzz without FCM push infrastructure,
// which is deliberately out of scope.
// ============================================================

const ANDROID_PATTERN = [0, 400, 2000];
const IOS_REBUZZ_MS = 2500;

// Where a start came from. "sync" is the inbox reconcile on
// mount; "insert" is a new unread alert arriving over
// realtime; "reenable" is the user switching vibration back
// ON in Preferences. The guidance panel uses "sync" for its
// one-time intro and "reenable" to explain a fresh buzz
// without re-showing on every launch with a stale alert.
export type AlertVibrationTrigger =
  | "sync"
  | "insert"
  | "reenable";

type AlertVibrationListener = (
  active: boolean,
  trigger: AlertVibrationTrigger,
) => void;

const listeners = new Set<AlertVibrationListener>();

let active = false;
let iosTimer: ReturnType<typeof setInterval> | null =
  null;

export const isAlertVibrationActive = (): boolean =>
  active;

export function subscribeAlertVibration(
  listener: AlertVibrationListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

const emitAlertVibration = (
  isActive: boolean,
  trigger: AlertVibrationTrigger,
): void => {
  listeners.forEach((listener) => {
    try {
      listener(isActive, trigger);
    } catch {
      // Listeners must never break the buzz.
    }
  });
};

const clearIosTimer = (): void => {
  if (iosTimer) {
    clearInterval(iosTimer);
    iosTimer = null;
  }
};

export async function startAlertVibration(
  trigger: AlertVibrationTrigger = "sync",
): Promise<void> {
  if (active) {
    return;
  }

  let enabled = true;

  try {
    enabled = await loadVibrationSetting();
  } catch {
    enabled = true;
  }

  if (!enabled) {
    return;
  }

  active = true;
  emitAlertVibration(true, trigger);

  if (Platform.OS === "android") {
    Vibration.vibrate(ANDROID_PATTERN, true);
    return;
  }

  Vibration.vibrate();
  clearIosTimer();
  iosTimer = setInterval(() => {
    Vibration.vibrate();
  }, IOS_REBUZZ_MS);
}

export function stopAlertVibration(
  trigger: AlertVibrationTrigger = "sync",
): void {
  // Idempotent and defensive: always silence the OS, even
  // if our flag drifted (e.g. hot reload mid-buzz).
  active = false;
  clearIosTimer();

  try {
    Vibration.cancel();
  } catch {
    // Intentionally ignored: nothing to silence.
  }

  emitAlertVibration(false, trigger);
}

// Reconciles the buzz with the current inbox: starts when
// an unread alert exists (and the preference is ON), stops
// otherwise. Used on mount restores and when the preference
// flips back ON.
export async function syncAlertVibration(
  trigger: AlertVibrationTrigger = "sync",
): Promise<void> {
  try {
    const user = await getAuthenticatedUserSafe();

    if (!user) {
      stopAlertVibration();
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("notif_id")
      .eq("user_id", user.id)
      .eq("type", "alert")
      .eq("read", false)
      .limit(1);

    if (error || !data) {
      return;
    }

    if (data.length > 0) {
      await startAlertVibration(trigger);
    } else {
      stopAlertVibration(trigger);
    }
  } catch {
    // Intentionally ignored (see header).
  }
}
