// Threshold safety-rule unit tests.
//
// The three rules (high load, voltage min/max) consume fixed
// engineering constants — the admin dashboard is a
// non-functional shell with no publishing role — while the
// rule functions take injected values and stay unit-testable.
// Supabase is spied (no network, no DB).
//
// Covers: pinned constant values, upward/downward crossing
// fires once, no repeat without re-crossing, boundary
// equality.

import {
  BATTERY_VOLTAGE_MAX,
  BATTERY_VOLTAGE_MIN,
  checkBatteryVoltageTooHigh,
  checkBatteryVoltageTooLow,
  checkHighCurrentLoad,
  HIGH_LOAD_WATTS,
  startMonitoringNotificationWatcher,
  stopMonitoringNotificationWatcher,
} from "@/services/notificationService";
import * as supabaseLib from "@/lib/supabase";
import type { MonitoringData } from "@/services/monitoringService";

const USER_ID = "user-1";

const mon = (
  overrides: Partial<MonitoringData>,
): MonitoringData =>
  ({
    battery_level: 80,
    battery_status: "Charging",
    time_remaining: "5h 00m",
    voltage: 12.6,
    watt_hours: 500,
    solar_input: 100,
    solar_status: "Moderate",
    solar_timer: "00:00:00",
    solar_voltage: 18.0,
    solar_current: 5.0,
    total_energy: 1200,
    current_load: 50,
    device_status: "Online",
    battery_temperature: 30,
    battery_temperature_status: "Nominal",
    dod_status: "Safe",
    solar_temperature: 35,
    solar_temperature_status: "Nominal",
    interior_temp: 28,
    interior_temp_status: "Nominal",
    ...overrides,
  }) as unknown as MonitoringData;

// Chainable query-builder stub recording inserts.
const inserts: Record<string, unknown>[] =
  [];

const chain: Record<string, jest.Mock> = {
  select: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  update: jest.fn(),
  maybeSingle: jest.fn(),
  insert: jest.fn(),
};

const channelStub = {
  on: jest.fn(),
  subscribe: jest.fn(),
};

const resetChain = () => {
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue({
    data: null,
    error: null,
  });
  chain.insert.mockImplementation(
    async (row: Record<string, unknown>) => {
      inserts.push(row);

      return { error: null };
    },
  );
};

beforeAll(() => {
  resetChain();

  jest
    .spyOn(supabaseLib, "getAuthenticatedUserSafe")
    .mockResolvedValue({
      id: USER_ID,
      email: "test@adlawatt.test",
    } as never);

  jest
    .spyOn(supabaseLib.supabase.auth, "getSession")
    .mockResolvedValue({
      data: {
        session: {
          user: {
            id: USER_ID,
            email: "test@adlawatt.test",
          },
        },
      },
    } as never);

  jest
    .spyOn(supabaseLib.supabase, "from")
    .mockImplementation((() => chain) as never);

  jest
    .spyOn(supabaseLib.supabase, "channel")
    .mockImplementation((() => {
      channelStub.on.mockReturnValue(
        channelStub,
      );
      channelStub.subscribe.mockReturnValue(
        channelStub,
      );

      return channelStub;
    }) as never);

  jest
    .spyOn(
      supabaseLib.supabase,
      "removeChannel",
    )
    .mockResolvedValue({} as never);

  jest
    .spyOn(
      supabaseLib.supabase.functions,
      "invoke",
    )
    .mockResolvedValue({} as never);
});

afterAll(async () => {
  await stopMonitoringNotificationWatcher();
  jest.restoreAllMocks();
});

describe("fixed safety thresholds", () => {
  test("constants pin the engineering values", () => {
    expect(HIGH_LOAD_WATTS).toBe(480);
    expect(BATTERY_VOLTAGE_MIN).toBe(11.6);
    expect(BATTERY_VOLTAGE_MAX).toBe(14.6);
  });
});

describe("safety rules with injected thresholds", () => {
  beforeAll(async () => {
    // Arms currentUserId through the real starter; the
    // initial missing-record insert is discarded (insert
    // already records into `inserts` by default).
    await startMonitoringNotificationWatcher();
    inserts.length = 0;
  });

  beforeEach(() => {
    inserts.length = 0;
  });

  test("high load crossing fires once with threshold values", async () => {
    await checkHighCurrentLoad(
      USER_ID,
      mon({ current_load: 900 }),
      mon({ current_load: 100 }),
      480,
    );

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      user_id: USER_ID,
      title: "High Current Load",
      type: "alert",
    });
    expect(
      String(inserts[0].description),
    ).toMatch(/480W/);
  });

  test("high load without re-crossing does not refire", async () => {
    await checkHighCurrentLoad(
      USER_ID,
      mon({ current_load: 900 }),
      mon({ current_load: 850 }),
      480,
    );

    expect(inserts).toHaveLength(0);
  });

  test("load below threshold never fires", async () => {
    await checkHighCurrentLoad(
      USER_ID,
      mon({ current_load: 100 }),
      mon({ current_load: 50 }),
      480,
    );

    expect(inserts).toHaveLength(0);
  });

  test("voltage dipping below minimum fires", async () => {
    await checkBatteryVoltageTooLow(
      USER_ID,
      mon({ voltage: 11.2 }),
      mon({ voltage: 12.0 }),
      11.6,
    );

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      title: "Battery Voltage Too Low",
      type: "alert",
    });
  });

  test("voltage already below minimum does not refire", async () => {
    await checkBatteryVoltageTooLow(
      USER_ID,
      mon({ voltage: 11.2 }),
      mon({ voltage: 11.3 }),
      11.6,
    );

    expect(inserts).toHaveLength(0);
  });

  test("voltage exceeding maximum fires", async () => {
    await checkBatteryVoltageTooHigh(
      USER_ID,
      mon({ voltage: 15.0 }),
      mon({ voltage: 14.0 }),
      14.6,
    );

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      title: "Battery Voltage Too High",
      type: "alert",
    });
  });

  test("voltage at exactly the maximum does not fire", async () => {
    await checkBatteryVoltageTooHigh(
      USER_ID,
      mon({ voltage: 14.6 }),
      mon({ voltage: 14.0 }),
      14.6,
    );

    expect(inserts).toHaveLength(0);
  });
});
