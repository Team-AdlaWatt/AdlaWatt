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
import { memoryCache } from "@/services/memoryCache";
import type {
  MonitoringData,
  MonitoringRow,
} from "@/services/monitoringSchema";
import * as supabaseLib from "@/lib/supabase";

const USER_ID = "user-1";

const CACHE_KEY =
  `adlawatt.monitoring.last.v3:${USER_ID}`;

const DATA: MonitoringData = {
  battery_level: 80,
  battery_status: "Charging",
  time_remaining: "5h 00m",
  voltage: 12.6,
  watt_hours: 500,
  current_load: 50,
  device_status: "Online",
  solar_input: 100,
  solar_status: "Moderate",
  solar_timer: "00:00:00",
  solar_voltage: 18,
  solar_current: 5,
  total_energy: 1200,
  battery_temperature: 30,
  battery_temperature_status: "Nominal",
  dod_status: "Safe",
  solar_temperature: 35,
  solar_temperature_status: "Nominal",
  interior_temp: 28,
  interior_temp_status: "Nominal",
  last_seen: null,
};

const ROW: MonitoringRow = {
  monitor_id: 1,
  user_id: USER_ID,
  battery_level: 77,
  battery_status: "Discharging",
  time_remaining: "4h 30m",
  solar_input: 80,
  solar_timer: "00:00:00",
  solar_voltage: 17,
  solar_current: 4,
  total_energy: 1100,
  solar_status: "Moderate",
  current_load: 60,
  device_status: "Online",
  last_seen: "2026-11-12T10:00:00.000Z",
  battery_temperature: 31,
  battery_temperature_status: "Nominal",
  dod_status: "Safe",
  solar_temperature: 36,
  solar_temperature_status: "Nominal",
  interior_temp: 29,
  interior_temp_status: "Nominal",
  voltage: 12.4,
  watt_hours: 480,
  cumulative_energy_input_wh: 1000,
  cumulative_energy_output_wh: 900,
};

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
  memoryCache.clear();
});

describe("monitoring cache round-trip", () => {
  test("save then load preserves normalized data", async () => {
    await saveCachedMonitoring(
      {
        ...DATA,
        battery_level: 80,
        battery_status: "Charging",
      },
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
    expect(
      cached?.schemaVersion,
    ).toBe(3);
  });

  test("load re-normalizes untrusted shapes", async () => {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        schemaVersion: 3,
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
    ).toBeNull();
    expect(
      cached?.data.battery_status,
    ).toBeNull();
    expect(
      cached?.data.last_seen,
    ).toBeNull();
  });

  test("legacy v1 cache is ignored", async () => {
    await AsyncStorage.setItem(
      `adlawatt.monitoring.last.v1:${USER_ID}`,
      JSON.stringify({
        data: { battery_level: 80 },
        savedAt: 123,
      }),
    );

    await expect(
      loadCachedMonitoring(USER_ID),
    ).resolves.toBeNull();
  });

  test.each([
    ["missing key", null],
    ["corrupt JSON", "{not json"],
    ["non-finite savedAt", '{"schemaVersion":3,"data":{},"savedAt":"x"}'],
    ["absent savedAt", '{"schemaVersion":3,"data":{}}'],
    ["missing schemaVersion", '{"data":{},"savedAt":123}'],
  ])("%s loads as null", async (_label, raw) => {
    if (raw !== null) {
      await AsyncStorage.setItem(
        CACHE_KEY,
        raw,
      );
    }

    await expect(
      loadCachedMonitoring(USER_ID),
    ).resolves.toBeNull();
  });

  test("cache is scoped per user", async () => {
    await saveCachedMonitoring(
      DATA,
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
        DATA,
        null,
      ),
    ).resolves.toBeUndefined();
  });
});

describe("getMonitoringData write-through", () => {
  test("success writes the cache for the next cold open", async () => {
    chain.maybeSingle.mockResolvedValue({
      data: ROW,
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
    expect(
      cached?.data.last_seen,
    ).toBe("2026-11-12T10:00:00.000Z");
  });

  test("forceRefresh bypasses the memory cache", async () => {
    chain.maybeSingle.mockResolvedValue({
      data: ROW,
      error: null,
    });

    const first = await getMonitoringData();

    expect(first?.battery_level).toBe(77);

    chain.maybeSingle.mockResolvedValue({
      data: {
        ...ROW,
        battery_level: 55,
      },
      error: null,
    });

    const cached = await getMonitoringData();

    expect(cached?.battery_level).toBe(77);

    const fresh =
      await getMonitoringData({
        forceRefresh: true,
      });

    expect(fresh?.battery_level).toBe(55);
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
