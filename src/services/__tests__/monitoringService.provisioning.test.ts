import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";
import { resolveProvisioningMonitorIdForUser } from "@/services/monitoringService";

jest.mock("@/lib/supabase", () => ({
  getAuthenticatedUserSafe: jest.fn(),
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
  },
}));

const query = {
  select: jest.fn(),
  eq: jest.fn(),
  limit: jest.fn(),
};

const mockMonitoringResult = (
  data: unknown[] | null,
  error: { message: string } | null = null,
) => {
  query.limit.mockResolvedValueOnce({ data, error });
};

describe("resolveProvisioningMonitorIdForUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);

    (supabase.from as jest.Mock).mockReturnValue(query);
    (getAuthenticatedUserSafe as jest.Mock).mockResolvedValue(null);
  });

  test("returns the authenticated user's valid monitor_id", async () => {
    mockMonitoringResult([{ monitor_id: 1100 }]);

    await expect(
      resolveProvisioningMonitorIdForUser("user-1"),
    ).resolves.toEqual({
      status: "found",
      monitorId: 1100,
    });

    expect(getAuthenticatedUserSafe).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("monitoring");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  test.each([0, -1, 1.5, 0x100000000, "1100", null])(
    "rejects invalid monitor_id %p",
    async (monitorId) => {
      mockMonitoringResult([{ monitor_id: monitorId }]);

      await expect(
        resolveProvisioningMonitorIdForUser("user-1"),
      ).resolves.toEqual({ status: "invalid" });
    },
  );

  test("returns not_found for a missing monitoring row", async () => {
    mockMonitoringResult([]);

    await expect(
      resolveProvisioningMonitorIdForUser("user-1"),
    ).resolves.toEqual({ status: "not_found" });
  });

  test("returns ambiguous for duplicate monitoring rows", async () => {
    mockMonitoringResult([
      { monitor_id: 1100 },
      { monitor_id: 1101 },
    ]);

    await expect(
      resolveProvisioningMonitorIdForUser("user-1"),
    ).resolves.toEqual({ status: "ambiguous" });
  });

  test("returns query_failed when Supabase errors", async () => {
    mockMonitoringResult(null, { message: "query failed" });

    await expect(
      resolveProvisioningMonitorIdForUser("user-1"),
    ).resolves.toEqual({ status: "query_failed" });
  });

  test("returns session_expired when no authenticated user is available", async () => {
    await expect(
      resolveProvisioningMonitorIdForUser(),
    ).resolves.toEqual({ status: "session_expired" });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("falls back to getAuthenticatedUserSafe when userId is omitted", async () => {
    (getAuthenticatedUserSafe as jest.Mock).mockResolvedValue({
      id: "user-2",
    });
    mockMonitoringResult([{ monitor_id: 2200 }]);

    await expect(
      resolveProvisioningMonitorIdForUser(),
    ).resolves.toEqual({
      status: "found",
      monitorId: 2200,
    });

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-2");
  });
});
