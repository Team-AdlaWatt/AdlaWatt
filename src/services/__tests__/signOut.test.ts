import { performSignOut } from "@/services/signOut";
import { supabase } from "@/lib/supabase";
import { logAuth } from "@/services/activityLogService";
import { cancelAllReminders } from "@/services/reminderService";

// ============================================================
// SIGN OUT ORCHESTRATOR
//
// Ensures logout feels immediate: performSignOut() returns
// synchronously, logs while the session still exists, fires
// cleanup and signOut() in the background, and never rejects
// the caller even if the network calls fail.
// ============================================================

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
    },
  },
}));

jest.mock("@/services/activityLogService", () => ({
  logAuth: {
    loggedOut: jest.fn(),
  },
}));

jest.mock("@/services/reminderService", () => ({
  cancelAllReminders: jest.fn(),
}));

const mockedSignOut = supabase.auth.signOut as jest.Mock;
const mockedLoggedOut = logAuth.loggedOut as jest.Mock;
const mockedCancelAllReminders =
  cancelAllReminders as jest.Mock;

describe("performSignOut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSignOut.mockResolvedValue({ error: null });
    mockedCancelAllReminders.mockResolvedValue(undefined);
  });

  it("returns synchronously and triggers logout sequence", () => {
    const result = performSignOut();

    expect(result).toBeUndefined();
    expect(mockedLoggedOut).toHaveBeenCalledTimes(1);
    expect(mockedCancelAllReminders).toHaveBeenCalledTimes(1);
    expect(mockedSignOut).toHaveBeenCalledTimes(1);
  });

  it("does not reject when signOut fails", () => {
    mockedSignOut.mockRejectedValue(new Error("network"));

    expect(() => performSignOut()).not.toThrow();
    expect(mockedSignOut).toHaveBeenCalledTimes(1);
  });

  it("does not reject when reminder cancellation fails", () => {
    mockedCancelAllReminders.mockRejectedValue(
      new Error("notifications"),
    );

    expect(() => performSignOut()).not.toThrow();
    expect(mockedCancelAllReminders).toHaveBeenCalledTimes(1);
  });
});
