// ============================================================
// SENTRY (preview-only, PII-scrubbed)
//
// Thin wrapper around @sentry/react-native. Init is a no-op
// when no DSN is configured (local dev without env, Jest, CI)
// and on web (native-only phase). All reporting is tagged
// environment: "preview" so a future production project stays
// separated by construction.
//
// DSN source of truth:
// - local: .env.local EXPO_PUBLIC_SENTRY_DSN (gitignored)
// - builds/OTA: EAS secret EXPO_PUBLIC_SENTRY_DSN (baked in)
// ============================================================

import { Platform } from "react-native";

import * as Sentry from "@sentry/react-native";

let initialized = false;

function getDsn(): string {
  return (
    process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ??
    ""
  );
}

/**
 * Keys / patterns that must never leave the device inside a
 * Sentry envelope. Matched case-insensitively against breadcrumb
 * messages, URLs, and extra keys.
 */
const SENSITIVE_KEYS = [
  "supabase",
  "sb_publishable",
  "sb_secret",
  "authorization",
  "agentmail_api_key",
  "agentmail",
  "owm_key",
  "openweathermap",
  "password",
  "token",
];

function containsSensitive(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const lowered = value.toLowerCase();

  return SENSITIVE_KEYS.some((key) =>
    lowered.includes(key),
  );
}

function scrubValue(value: unknown): unknown {
  if (typeof value === "string") {
    return containsSensitive(value)
      ? "[Filtered]"
      : value;
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(scrubValue);
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const scrubbed: Record<string, unknown> =
      {};

    for (const [
      key,
      entry,
    ] of Object.entries(
      value as Record<string, unknown>,
    )) {
      scrubbed[key] = containsSensitive(key)
        ? "[Filtered]"
        : scrubValue(entry);
    }

    return scrubbed;
  }

  return value;
}

export function initSentry(): void {
  if (initialized) {
    return;
  }

  // Native-only phase: web uses the static-site build where the
  // native SDK is inert. Jest/CI have no DSN configured.
  if (Platform.OS === "web") {
    return;
  }

  const dsn = getDsn();

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: "preview",
    enableNative: true,
    // Low sampling for mobile data: errors always send,
    // performance traces sample at 10%, no session replay.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubValue(event) as typeof event;
    },
    beforeSendTransaction(event) {
      return scrubValue(event) as typeof event;
    },
  });

  initialized = true;
}

/**
 * Attach an anonymous user id on sign-in; clear on sign-out.
 * Never pass email, username, or tokens here.
 */
export function setSentryUser(
  userId: string | null,
): void {
  if (!initialized) {
    return;
  }

  Sentry.setUser(
    userId ? { id: userId } : null,
  );
}

/**
 * Capture a caught error with optional extra context.
 * Prefer this over raw console.error for new code; existing
 * call sites migrate gradually.
 */
export function captureAppError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) {
    return;
  }

  Sentry.captureException(error, {
    extra: context
      ? (scrubValue(context) as Record<
          string,
          unknown
        >)
      : undefined,
  });
}

export function isSentryInitialized(): boolean {
  return initialized;
}
