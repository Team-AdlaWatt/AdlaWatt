import React, { useEffect } from "react";

import { act, create } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";

import * as supabaseLib from "@/lib/supabase";
import { memoryCache } from "@/services/memoryCache";
import {
  subscribeResilientChannel,
} from "@/services/realtimeResubscribe";
import { MONITORING_SCHEMA_VERSION } from "@/services/monitoringSchema";
import type { MonitoringRow } from "@/services/monitoringSchema";
import {
  subscribeToDeviceStatus,
  useMonitoring,
} from "@/services/monitoringService";

jest.mock("@/lib/supabase", () => ({
  getAuthenticatedUserSafe: jest.fn(),
  supabase: { from: jest.fn() },
}));

jest.mock("@/services/realtimeResubscribe", () => ({
  subscribeResilientChannel: jest.fn(),
}));

const USER_ID = "user-1";
const MEMORY_KEY =
  `monitoring:v${MONITORING_SCHEMA_VERSION}:${USER_ID}`;
const OLD = "2026-11-12T10:00:00.000Z";
const CURRENT = "2026-11-12T10:00:02.000Z";
const NEWER = "2026-11-12T10:00:04.000Z";
const NEWEST = "2026-11-12T10:00:06.000Z";

const makeRow = (
  lastSeen: string,
  batteryLevel: number,
): MonitoringRow => ({
  monitor_id: 1,
  user_id: USER_ID,
  "INA219 Voltage Percentage": batteryLevel,
  "INA219 Load Battery status": "Discharging",
  "INA219 Load battery time remaining": "4h 30m",
  "INA219 Solar Side input": 80,
  "INA219 Solar Side timer": "00:00:00",
  "INA219 Solar Side voltage": 17,
  "INA219 Solar Side current": 4,
  "INA219 Load Side total energy": 1100,
  "INA219 Solar Side solar status": "Moderate",
  "INA219 Load Side battery load": 60,
  "ESP32S3 Status": "Online",
  "ESP32S3 Last seen": lastSeen,
  "INA219 Load Side dod_status": "Safe",
  "DS18B20 2 Solar Temp": 36,
  "DS18B20 2 Solar Temp Status": "Nominal",
  "DHT22 Interior Temp": 29,
  "DHT22 Interior Temp Status": "Nominal",
  "INA219 Voltage": 12.4,
  "INA219 Load Side battery watt_hour": 480,
  cumulative_energy_input_wh: 1000,
  cumulative_energy_output_wh: 900,
  heartbeat_expires_at: "2026-11-12T10:00:12.000Z",
  "ESP32S3 Sampled at": lastSeen,
});

const chain: Record<string, jest.Mock> = {
  select: jest.fn(),
  eq: jest.fn(),
  maybeSingle: jest.fn(),
};

const mockGetUser =
  supabaseLib.getAuthenticatedUserSafe as jest.Mock;

const mockSubscribe =
  subscribeResilientChannel as jest.Mock;

const mockFrom =
  supabaseLib.supabase.from as jest.Mock;

let emitRealtime: (payload: unknown) => void;
let latest: ReturnType<typeof useMonitoring> | null;
let root: ReturnType<typeof create> | null;

function Probe() {
  const state = useMonitoring();

  useEffect(() => {
    latest = state;
  }, [state]);

  return null;
}

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const mount = async () => {
  await act(async () => {
    root = create(React.createElement(Probe));
  });
  await flush();
  await flush();
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  memoryCache.clear();

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue({
    data: makeRow(CURRENT, 77),
    error: null,
  });

  mockGetUser.mockResolvedValue({ id: USER_ID });
  mockFrom.mockReturnValue(chain);

  mockSubscribe.mockImplementation((options: any) => {
    const base: { on: jest.Mock } = {
      on: jest.fn(() => base),
    };
    options.build(base);
    emitRealtime = base.on.mock.calls[0][2];

    return { stop: jest.fn() };
  });

  latest = null;
  root = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
});

describe("monitoring realtime synchronization", () => {
  test("a late refetch cannot roll back a newer realtime row", async () => {
    await mount();
    expect(latest?.monitoring?.last_seen).toBe(CURRENT);

    await act(async () => {
      emitRealtime({
        eventType: "UPDATE",
        new: makeRow(NEWER, 77),
      });
    });

    expect(latest?.monitoring?.last_seen).toBe(NEWER);

    chain.maybeSingle.mockResolvedValueOnce({
      data: makeRow(OLD, 10),
      error: null,
    });

    await act(async () => {
      await latest?.refresh();
    });

    expect(latest?.monitoring?.last_seen).toBe(NEWER);
    expect(
      memoryCache.get<any>(MEMORY_KEY)?.last_seen,
    ).toBe(NEWER);
  });

  test("a partial heartbeat merges without refetching", async () => {
    await mount();
    chain.maybeSingle.mockClear();

    await act(async () => {
      emitRealtime({
        eventType: "UPDATE",
        new: {
          "ESP32S3 Last seen": NEWER,
          "INA219 Voltage Percentage": 50,
        },
      });
    });

    expect(latest?.monitoring?.last_seen).toBe(NEWER);
    expect(latest?.monitoring?.battery_level).toBe(50);
    expect(chain.maybeSingle).not.toHaveBeenCalled();
  });

  test("a partial with no current snapshot triggers one coalesced refetch", async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await mount();
    expect(latest?.monitoring).toBeNull();
    chain.maybeSingle.mockClear();

    let resolveFetch: (value: unknown) => void = () => {};
    chain.maybeSingle.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    await act(async () => {
      emitRealtime({
        eventType: "UPDATE",
        new: { "ESP32S3 Last seen": NEWER },
      });
      emitRealtime({
        eventType: "UPDATE",
        new: { "ESP32S3 Last seen": NEWEST },
      });
    });

    expect(chain.maybeSingle).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch({
        data: makeRow(NEWEST, 60),
        error: null,
      });
      await flush();
    });

    expect(latest?.monitoring?.last_seen).toBe(NEWEST);
  });

  test("device status reacts to status-only payloads", async () => {
    const onChange = jest.fn();
    let emitDeviceStatus: (payload: unknown) => void = () => {};

    mockSubscribe.mockImplementation((options: any) => {
      const base: { on: jest.Mock } = {
        on: jest.fn(() => base),
      };
      options.build(base);
      emitDeviceStatus = base.on.mock.calls[0][2];

      return { stop: jest.fn() };
    });

    const handle = await subscribeToDeviceStatus(onChange);

    await act(async () => {
      emitDeviceStatus({
        eventType: "UPDATE",
        new: { "ESP32S3 Status": "Offline" },
      });
    });
    expect(onChange).toHaveBeenCalledWith("Offline");

    await act(async () => {
      emitDeviceStatus({
        eventType: "UPDATE",
        new: { "ESP32S3 Status": "Online" },
      });
    });
    expect(onChange).toHaveBeenCalledWith("Online");

    (handle as { stop?: () => void } | null)?.stop?.();
  });
});
