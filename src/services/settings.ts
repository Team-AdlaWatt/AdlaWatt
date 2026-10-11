import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  FontFamilyOption,
  FontSizeOption,
} from "@/services/typography";

// ============================================================
// TYPOGRAPHY PREFERENCES (v1)
//
// Local-only system settings. No Supabase.
// Dark mode is intentionally excluded.
// Language / email alerts are reserved for later
// and can extend this file without migration breaks.
// ============================================================

export interface TypographyPreferences {
  fontSize: FontSizeOption;
  fontFamily: FontFamilyOption;
}

export const DEFAULT_TYPOGRAPHY: TypographyPreferences =
  {
    fontSize: "Medium",
    fontFamily: "Inter",
  };

export const TYPOGRAPHY_STORAGE_KEY =
  "adlawatt.typography.v1";

function sanitize(
  value: unknown,
): TypographyPreferences {
  const candidate =
    (value as Partial<TypographyPreferences>) ??
    {};

  const fontSize: FontSizeOption =
    candidate.fontSize === "Small" ||
    candidate.fontSize === "Big"
      ? candidate.fontSize
      : "Medium";

  const fontFamily: FontFamilyOption =
    candidate.fontFamily === "Times New Roman" ||
    candidate.fontFamily === "Roboto" ||
    candidate.fontFamily === "Inter" ||
    candidate.fontFamily === "Monospace"
      ? candidate.fontFamily
      : "System Default";

  // Old saves may still carry fontWeight: ignored (no migration).

  return {
    fontSize,
    fontFamily,
  };
}

export async function loadTypographyPreferences(): Promise<TypographyPreferences> {
  try {
    const raw = await AsyncStorage.getItem(
      TYPOGRAPHY_STORAGE_KEY,
    );

    if (!raw) {
      return DEFAULT_TYPOGRAPHY;
    }

    return sanitize(JSON.parse(raw));
  } catch {
    return DEFAULT_TYPOGRAPHY;
  }
}

export async function saveTypographyPreferences(
  prefs: TypographyPreferences,
): Promise<void> {
  // Best-effort: callers already hold the new prefs in
  // state, so a blocked store (e.g. web private mode)
  // must not break Save.
  try {
    await AsyncStorage.setItem(
      TYPOGRAPHY_STORAGE_KEY,
      JSON.stringify(sanitize(prefs)),
    );
  } catch {
    // Intentionally ignored.
  }
}

// ============================================================
// VIBRATION SWITCH (v1)
//
// Device-level preference backing the Menu "Vibration" row
// ("Vibrate when important alerts are received"). Persisted
// so the choice survives restarts; default ON. The alert
// vibration controller gates on this value, and turning it
// OFF stops an active buzz immediately.
// ============================================================

const VIBRATION_STORAGE_KEY = "adlawatt.vibration.v1";

export async function loadVibrationSetting(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(
      VIBRATION_STORAGE_KEY,
    );

    // Absent or corrupt reads fall back to ON (matches the
    // Menu copy promising vibration on important alerts).
    if (raw === null || raw === undefined) {
      return true;
    }

    if (raw === "1" || raw === "true") {
      return true;
    }

    if (raw === "0" || raw === "false") {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export async function saveVibrationSetting(
  value: boolean,
): Promise<void> {
  // Best-effort like the rest: the UI already holds the new
  // value, so a blocked store must not break the toggle.
  try {
    await AsyncStorage.setItem(
      VIBRATION_STORAGE_KEY,
      value ? "1" : "0",
    );
  } catch {
    // Intentionally ignored.
  }
}

// ============================================================
// LANGUAGE PREFERENCE (v1)
//
// Device-level UI language backing the Menu Language row.
// Always starts English; the user switches manually.
// Persisted so the choice survives restarts. Unknown or
// corrupt reads fall back to English (the source language
// every string is written in).
// ============================================================

export type AppLanguage = "en" | "fil" | "ceb";

const LANGUAGE_STORAGE_KEY = "adlawatt.language.v1";

export const isAppLanguage = (
  value: unknown,
): value is AppLanguage =>
  value === "en" ||
  value === "fil" ||
  value === "ceb";

export async function loadLanguageSetting(): Promise<AppLanguage> {
  try {
    const raw = await AsyncStorage.getItem(
      LANGUAGE_STORAGE_KEY,
    );

    return isAppLanguage(raw) ? raw : "en";
  } catch {
    return "en";
  }
}

export async function saveLanguageSetting(
  value: AppLanguage,
): Promise<void> {
  // Best-effort like the rest: the UI already holds the new
  // value, so a blocked store must not break the switch.
  try {
    await AsyncStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      value,
    );
  } catch {
    // Intentionally ignored.
  }
}

// ============================================================
// EMAIL NOTIFICATION SWITCH (v1)
//
// Last CONFIRMED value of the global per-user alert-email
// switch, so the preferences toggle holds ON or OFF through
// offline stretches and failed fetches instead of falling
// back to the ON default (which phantom-flipped intentional
// OFF values the next time anything was saved).
//
// Writes happen only on successful server load/save. Reads
// prefer the per-user key, then the device-level last-known
// key (covers offline sign-in where the user id is unknown
// and shared devices between accounts).
// ============================================================

const EMAIL_NOTIFICATIONS_KEY =
  "adlawatt.email_notifications.v1";

const scopedEmailKey = (userId: string): string =>
  `${EMAIL_NOTIFICATIONS_KEY}:${userId}`;

function parseEmailFlag(value: unknown): boolean | null {
  if (value === "1" || value === true) {
    return true;
  }

  if (value === "0" || value === false) {
    return false;
  }

  return null;
}

export async function loadCachedEmailNotifications(
  userId?: string | null,
): Promise<boolean | null> {
  try {
    if (userId) {
      const scoped = parseEmailFlag(
        await AsyncStorage.getItem(
          scopedEmailKey(userId),
        ),
      );

      if (scoped !== null) {
        return scoped;
      }
    }

    return parseEmailFlag(
      await AsyncStorage.getItem(EMAIL_NOTIFICATIONS_KEY),
    );
  } catch {
    return null;
  }
}

export async function saveCachedEmailNotifications(
  value: boolean,
  userId?: string | null,
): Promise<void> {
  // Best-effort like typography: the UI already holds the
  // confirmed value, so a blocked store must not break flow.
  try {
    const raw = value ? "1" : "0";

    if (userId) {
      await AsyncStorage.setItem(
        scopedEmailKey(userId),
        raw,
      );
    }

    await AsyncStorage.setItem(
      EMAIL_NOTIFICATIONS_KEY,
      raw,
    );
  } catch {
    // Intentionally ignored.
  }
}

// ============================================================
// LOCAL REMINDERS SWITCH (v1)
//
// Device-local preference backing the Menu "Reminders" row
// (daily evening review + low-sun advisories, default ON).
// Same best-effort contract as vibration: the UI holds the
// value, the store must never break the toggle. Unlike the
// email switch this is device-level, not per-user —
// scheduled notifications live on the OS, not the account.
// ============================================================

const REMINDERS_KEY =
  "adlawatt.reminders.v1";

export async function loadRemindersSetting(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(
      REMINDERS_KEY,
    );

    if (raw === null || raw === undefined) {
      return true;
    }

    if (raw === "1" || raw === "true") {
      return true;
    }

    if (raw === "0" || raw === "false") {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export async function saveRemindersSetting(
  value: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      REMINDERS_KEY,
      value ? "1" : "0",
    );
  } catch {
    // Intentionally ignored.
  }
}
