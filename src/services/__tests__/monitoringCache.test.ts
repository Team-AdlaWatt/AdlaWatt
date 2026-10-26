// Monitoring last-reading cache unit tests (offline
// resilience: cold opens paint cached rows flagged stale).
//
// Covers: save/load round-trip with re-normalization,
// corrupt/missing/legacy shapes → null, user scoping, and
// getMonitoringData write-through on success. Supabase is
// spied; AsyncStorage uses the repo's jest mock (in-memory).

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getMonitoringData,
  loadCachedMonitoring,
  saveCachedMonitoring,
} from "@/services/monitoringService";
import * as supabaseLib from "@/lib/supabase";

const USER_ID = "user-1";

const chain: Record<string, jest.Mock> = {
  select: jest.fn(),
  eq: jest.fn(),
  maybeSingle: jest.fn(),
};

beforeAll(() => {
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  jest
    .spyOn(supabaseLib, "getAuthenticatedUserSafe")
    .mockResolvedValue({
      id: USER_ID,
    } as never);

  jest
    .spyOn(supabaseLib.supabase, "from")
    .mockImplementation((() => chain) as never);
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(async () => {
  jest.clearAllMocks();

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  await AsyncStorage.clear();
  try {
    const { memoryCache } = require("@/services/memoryCache");
    memoryCache.clear();
  } catch {}
});

describe("monitoring cache round-trip", () => {
  test("save then load preserves normalized data", async () => {
    await saveCachedMonitoring(
      {
        battery_level: 80,
        battery_status: "Charging",
      } as never,
      USER_ID,
    );

    const cached =
      await loadCachedMonitoring(USER_ID);

    expect(cached).not.toBeNull();
    expect(
      cached?.data.battery_level,
    ).toBe(80);
    expect(
      cached?.data.battery_status,
    ).toBe("Charging");
    expect(
      typeof cached?.savedAt,
    ).toBe("number");
  });

  test("load re-normalizes untrusted shapes", async () => {
    await AsyncStorage.setItem(
      `adlawatt.monitoring.last.v1:${USER_ID}`,
      JSON.stringify({
        data: {
          battery_level: "high",
          battery_status: "bogus",
        },
        savedAt: 123,
      }),
    );

    const cached =
      await loadCachedMonitoring(USER_ID);

    expect(
      cached?.data.battery_level,
    ).toBe(0);
    expect(
      cached?.data.battery_status,
    ).toBe("Idle");
  });

  test.each([
    ["missing key", null],
    ["corrupt JSON", "{not json"],
    ["non-finite savedAt", '{"data":{},"savedAt":"x"}'],
    ["absent savedAt", '{"data":{}}'],
  ])("%s loads as null", async (_label, raw) => {
    if (raw !== null) {
      await AsyncStorage.setItem(
        `adlawatt.monitoring.last.v1:${USER_ID}`,
        raw,
      );
    }

    await expect(
      loadCachedMonitoring(USER_ID),
    ).resolves.toBeNull();
  });

  test("cache is scoped per user", async () => {
    await saveCachedMonitoring(
      { battery_level: 80 } as never,
      USER_ID,
    );

    await expect(
      loadCachedMonitoring("other-user"),
    ).resolves.toBeNull();

    await expect(
      loadCachedMonitoring(null),
    ).resolves.toBeNull();
  });

  test("save without user never throws", async () => {
    await expect(
      saveCachedMonitoring(
        { battery_level: 80 } as never,
        null,
      ),
    ).resolves.toBeUndefined();
  });
});

describe("getMonitoringData write-through", () => {
  test("success writes the cache for the next cold open", async () => {
    chain.maybeSingle.mockResolvedValue({
      data: {
        battery_level: 77,
        battery_status: "Discharging",
      },
      error: null,
    });

    const data =
      await getMonitoringData();

    expect(data?.battery_level).toBe(77);

    const cached =
      await loadCachedMonitoring(USER_ID);

    expect(
      cached?.data.battery_level,
    ).toBe(77);
    expect(
      cached?.data.battery_status,
    ).toBe("Discharging");
  });

  test("error returns null without poisoning the cache", async () => {
    chain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "offline" },
    });

    await expect(
      getMonitoringData(),
    ).resolves.toBeNull();

    await expect(
      loadCachedMonitoring(USER_ID),
    ).resolves.toBeNull();
  });
});
