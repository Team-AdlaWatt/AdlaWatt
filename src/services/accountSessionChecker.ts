import { supabase } from "@/lib/supabase";

// ============================================================
// ACCOUNT SESSION CHECKER
// ============================================================
//
// Detects accounts that were deleted while the app was open
// (Supabase -> Authentication -> Users, or an admin delete).
// Deleting the auth row leaves the stored JWT valid until it
// expires, so the client keeps rendering the dashboard with a
// ghost session that only fails on the next server write.
//
// The only trusted signal is an explicit server statement that
// the user no longer exists:
//   - 403 user_from_sub_claim_does_not_exist (GoTrue: the JWT
//     still verifies but the auth row is gone)
//   - 404 user_not_found
//   - refresh_token_not_found, confirmed by a missing profile
//     row (the refresh grant is rejected once the row is gone,
//     but a rotated refresh token on a second device looks the
//     same, so the profile row breaks the tie)
//
// Everything else stays "unknown": offline, 5xx, an expired
// token, a missing session. A flaky network must never lock a
// user out of the app, so "unknown" never shows the takeover
// screen and the next tick retries on its own.
// ============================================================

export type DeletedAccountReason =
  | "auth_user_not_found"
  | "profile_not_found";

export type UnknownAccountReason =
  | "no_session"
  | "offline"
  | "server_error"
  | "expired_token"
  | "session_revoked"
  | "transient";

export type AccountCheckOutcome =
  | { status: "active" }
  | { status: "deleted"; reason: DeletedAccountReason }
  | { status: "unknown"; reason: UnknownAccountReason };

export interface AccountCheckOptions {
  /** Signed-in profile id. Used to break the tie when the
   * refresh grant is rejected, so a rotated refresh token on a
   * second device is not mistaken for a deleted account. */
  userId?: string;
  /** Delay before the confirming second call. */
  confirmDelayMs?: number;
}

const DEFAULT_CONFIRM_DELAY_MS = 1200;

// GoTrue error codes (see auth-js `AuthApiError.code`).
const USER_MISSING_CODES = new Set([
  "user_from_sub_claim_does_not_exist",
  "user_not_found",
]);

const REFRESH_REVOKED_CODES = new Set([
  "refresh_token_not_found",
  "invalid_refresh_token",
]);

const INVALID_TOKEN_CODES = new Set([
  "invalid_jwt",
  "bad_jwt",
]);

const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : "";

const getErrorCode = (error: unknown): string => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error
  ) {
    const code = (error as { code: unknown }).code;

    if (typeof code === "string") {
      return code.toLowerCase();
    }

    if (typeof code === "number") {
      return String(code);
    }
  }

  return "";
};

const getErrorStatus = (error: unknown): number | null => {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status ===
      "number"
  ) {
    return (error as { status: number }).status;
  }

  return null;
};

const getErrorMessage = (error: unknown): string => {
  if (!error) {
    return "";
  }

  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message ===
      "string"
  ) {
    return (error as { message: string }).message.toLowerCase();
  }

  return String(error).toLowerCase();
};

/** The server states the user no longer exists. */
const isUserMissingError = (error: unknown): boolean => {
  const code = getErrorCode(error);

  if (USER_MISSING_CODES.has(code)) {
    return true;
  }

  const message = getErrorMessage(error);

  return (
    message.includes("user from sub claim does not exist") ||
    message.includes("user not found")
  );
};

/** The refresh grant was rejected: the auth row is gone, or the
 * refresh token was rotated away by another device. */
const isRefreshRevokedError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  const code = getErrorCode(error);

  if (REFRESH_REVOKED_CODES.has(code)) {
    return true;
  }

  const message = getErrorMessage(error);

  return (
    message.includes("refresh token not found") ||
    message.includes("invalid refresh token")
  );
};

/** The access token itself is stale (expired or malformed). */
const isInvalidTokenError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  const code = getErrorCode(error);

  if (INVALID_TOKEN_CODES.has(code)) {
    return true;
  }

  const message = getErrorMessage(error);

  return (
    message.includes("invalid jwt") ||
    message.includes("token is expired") ||
    message.includes("jwt expired")
  );
};

const isSessionMissingError = (error: unknown): boolean =>
  getErrorName(error) === "AuthSessionMissingError" ||
  getErrorMessage(error).includes("auth session missing");

/** Transport failure (offline, DNS, timeout) or a 5xx from
 * GoTrue. Both are transient: the account may still exist. */
const isRetryableError = (error: unknown): boolean => {
  if (getErrorName(error) === "AuthRetryableFetchError") {
    return true;
  }

  const message = getErrorMessage(error);

  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("timeout")
  );
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** The refresh grant was rejected. The auth row being gone and
 * a rotated refresh token look identical here, so the profile
 * row breaks the tie: no profile means the account itself is
 * gone. A profile that still exists means the account lives and
 * only this session died. */
async function resolveRevokedSession(
  userId?: string,
): Promise<AccountCheckOutcome> {
  if (!userId) {
    return { status: "unknown", reason: "session_revoked" };
  }

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  // maybeSingle: no rows means the profile is gone, an error
  // means we simply could not tell (offline, RLS, 5xx).
  if (!error && data === null) {
    return {
      status: "deleted",
      reason: "profile_not_found",
    };
  }

  return { status: "unknown", reason: "session_revoked" };
}

async function runCheck(
  userId?: string,
): Promise<AccountCheckOutcome> {
  const { error } = await supabase.auth.getUser();

  if (!error) {
    return { status: "active" };
  }

  if (isUserMissingError(error)) {
    return {
      status: "deleted",
      reason: "auth_user_not_found",
    };
  }

  if (isRefreshRevokedError(error)) {
    return resolveRevokedSession(userId);
  }

  if (isInvalidTokenError(error)) {
    // Stale access token: renew it, then trust the renewed
    // session. A failed renewal only decides the account when
    // the profile row is gone as well.
    const { data, error: refreshError } =
      await supabase.auth.refreshSession();

    if (!refreshError && data.session) {
      return { status: "active" };
    }

    if (isRefreshRevokedError(refreshError)) {
      return resolveRevokedSession(userId);
    }

    return { status: "unknown", reason: "expired_token" };
  }

  if (isSessionMissingError(error)) {
    return { status: "unknown", reason: "no_session" };
  }

  if (isRetryableError(error)) {
    const status = getErrorStatus(error);

    return {
      status: "unknown",
      reason:
        status !== null && status >= 500
          ? "server_error"
          : "offline",
    };
  }

  return { status: "unknown", reason: "server_error" };
}

/**
 * Asks the server whether the signed-in account still exists.
 *
 * A "deleted" verdict is confirmed by a second call before it is
 * returned: one misread response must never lock a user out of
 * the app. "unknown" is always safe to ignore.
 */
export async function checkAccountExists(
  options: AccountCheckOptions = {},
): Promise<AccountCheckOutcome> {
  const first = await runCheck(options.userId);

  if (first.status !== "deleted") {
    return first;
  }

  await delay(
    options.confirmDelayMs ?? DEFAULT_CONFIRM_DELAY_MS,
  );

  const second = await runCheck(options.userId);

  if (second.status === "deleted") {
    return second;
  }

  return { status: "unknown", reason: "transient" };
}
