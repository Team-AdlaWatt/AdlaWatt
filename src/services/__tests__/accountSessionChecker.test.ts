import { supabase } from "@/lib/supabase";
import {
  checkAccountExists,
  type AccountCheckOutcome,
} from "@/services/accountSessionChecker";

// ============================================================
// ACCOUNT SESSION CHECKER
//
// The checker only trusts an explicit server statement that the
// user no longer exists. Everything else must stay "unknown":
// a flaky network may never lock a user out of the app.
// ============================================================

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockedGetUser = supabase.auth.getUser as jest.Mock;
const mockedRefreshSession =
  supabase.auth.refreshSession as jest.Mock;
const mockedFrom = supabase.from as jest.Mock;

const authApiError = (
  code: string,
  status: number,
  message: string,
) => ({
  name: "AuthApiError",
  code,
  status,
  message,
});

const retryableError = (status: number, message: string) => ({
  name: "AuthRetryableFetchError",
  code: "",
  status,
  message,
});

/** Profile lookup: no row means the profile is gone. */
const mockProfileLookup = (
  data: { id: string } | null,
  error: unknown = null,
) => {
  const maybeSingle = jest.fn().mockResolvedValue({
    data,
    error,
  });

  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });

  mockedFrom.mockReturnValue({ select });
};

describe("checkAccountExists", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileLookup(null);
  });

  it("reports an active account when the server returns the user", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({ status: "active" });
    expect(mockedGetUser).toHaveBeenCalledTimes(1);
  });

  it("reports a deleted account when the auth user no longer exists", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: authApiError(
        "user_from_sub_claim_does_not_exist",
        403,
        "User from sub claim does not exist",
      ),
    });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "deleted",
      reason: "auth_user_not_found",
    });
  });

  it("reports a deleted account on a 404 user_not_found", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: authApiError(
        "user_not_found",
        404,
        "User not found",
      ),
    });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "deleted",
      reason: "auth_user_not_found",
    });
  });

  it("confirms a deleted verdict with a second call", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: authApiError(
        "user_from_sub_claim_does_not_exist",
        403,
        "User from sub claim does not exist",
      ),
    });

    await checkAccountExists({ confirmDelayMs: 0 });

    expect(mockedGetUser).toHaveBeenCalledTimes(2);
  });

  it("keeps the session when the confirming call disagrees", async () => {
    mockedGetUser
      .mockResolvedValueOnce({
        data: { user: null },
        error: authApiError(
          "user_from_sub_claim_does_not_exist",
          403,
          "User from sub claim does not exist",
        ),
      })
      .mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
        error: null,
      });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "unknown",
      reason: "transient",
    });
  });

  it("reports a deleted account when the profile row is gone too", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: authApiError(
        "refresh_token_not_found",
        400,
        "Invalid Refresh Token: Refresh Token Not Found",
      ),
    });
    mockProfileLookup(null);

    const outcome = await checkAccountExists({
      userId: "user-1",
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "deleted",
      reason: "profile_not_found",
    });
  });

  it("keeps the session when only the refresh token was revoked", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: authApiError(
        "refresh_token_not_found",
        400,
        "Invalid Refresh Token: Refresh Token Not Found",
      ),
    });
    mockProfileLookup({ id: "user-1" });

    const outcome = await checkAccountExists({
      userId: "user-1",
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "unknown",
      reason: "session_revoked",
    });
  });

  it("renews an expired token and reports an active account", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: authApiError(
        "invalid_jwt",
        401,
        "invalid JWT: token is expired",
      ),
    });
    mockedRefreshSession.mockResolvedValue({
      data: { session: { access_token: "token" }, user: null },
      error: null,
    });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({ status: "active" });
    expect(mockedRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the renewal fails offline", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: authApiError(
        "invalid_jwt",
        401,
        "invalid JWT: token is expired",
      ),
    });
    mockedRefreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: retryableError(0, "TypeError: Network request failed"),
    });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "unknown",
      reason: "expired_token",
    });
  });

  it("keeps the session while offline", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: retryableError(
        0,
        "TypeError: Network request failed",
      ),
    });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "unknown",
      reason: "offline",
    });
  });

  it("keeps the session when the server fails", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: retryableError(503, "Service unavailable"),
    });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "unknown",
      reason: "server_error",
    });
  });

  it("keeps the session when it is already gone", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: {
        name: "AuthSessionMissingError",
        message: "Auth session missing!",
      },
    });

    const outcome = await checkAccountExists({
      confirmDelayMs: 0,
    });

    expect(outcome).toEqual({
      status: "unknown",
      reason: "no_session",
    });
  });

  it("keeps the session on an unrecognized failure", async () => {
    mockedGetUser.mockResolvedValue({
      data: { user: null },
      error: {
        name: "AuthApiError",
        code: "unexpected_failure",
        status: 400,
        message: "Something else went wrong",
      },
    });

    const outcome: AccountCheckOutcome =
      await checkAccountExists({ confirmDelayMs: 0 });

    expect(outcome).toEqual({
      status: "unknown",
      reason: "server_error",
    });
  });
});
