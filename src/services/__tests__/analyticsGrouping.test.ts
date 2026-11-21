// Analytics grouping unit tests (pure bucketing + range
// shaping — no Supabase calls; rows are built inline).
//
// Locks the chart pipeline contract: invalid rows never reach
// a bucket, buckets sort chronologically, and range points
// carry clamped avg/min/max.

import {
  buildAnalyticsCardData,
  createFrequencyRange,
  getBatteryActivityData,
  getBatteryChartRangeData,
  getUnsafeDischargeChartData,
  groupMonitoringHistory,
  groupMonitoringHistoryForAnalytics,
  type MonitoringHistoryRow,
} from "@/services/analyticsService";

// PDF generation is not under test here, and jspdf's ESM
// bundle cannot run under Jest — stub both modules so the
// service import only exercises grouping + range shaping.
jest.mock("jspdf", () => ({
  jsPDF: jest.fn(),
}));

jest.mock("jspdf-autotable", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const row = (
  recorded_at: string,
  battery_level: number | null,
  battery_status: string | null = "Charging",
): MonitoringHistoryRow =>
  ({
    recorded_at,
    battery_level,
    battery_status,
    time_remaining: null,
    solar_input: null,
    solar_status: null,
    solar_timer: null,
    solar_voltage: null,
    solar_current: null,
    total_energy: null,
    current_load: null,
    device_status: "Online",
    last_seen: null,
    dod_status: null,
    solar_temperature: null,
    solar_temperature_status: null,
    interior_temp: null,
    interior_temp_status: null,
    voltage: null,
    watt_hours: null,
    cumulative_energy_input_wh: null,
    cumulative_energy_output_wh: null,
    energy_input_wh: null,
    energy_output_wh: null,
  }) as MonitoringHistoryRow;

const analyticsRow = (
  recorded_at: string,
  overrides: Partial<MonitoringHistoryRow> = {},
): MonitoringHistoryRow => ({
  ...row(recorded_at, 80, "Charging"),
  ...overrides,
});

describe("groupMonitoringHistory", () => {
  test("daily buckets split rows by calendar day", () => {
    const buckets = groupMonitoringHistory(
      [
        row("2026-10-01T08:00:00", 80),
        row("2026-10-01T20:00:00", 70),
        row("2026-10-02T08:00:00", 60),
      ],
      "Daily",
    );

    expect(buckets).toHaveLength(2);
    expect(
      buckets[0].rows,
    ).toHaveLength(2);
    expect(
      buckets[1].rows,
    ).toHaveLength(1);
  });

  test("buckets sort chronologically regardless of input order", () => {
    const buckets = groupMonitoringHistory(
      [
        row("2026-10-03T08:00:00", 60),
        row("2026-10-01T08:00:00", 80),
      ],
      "Daily",
    );

    expect(buckets).toHaveLength(2);
    expect(
      buckets[0].date.getTime(),
    ).toBeLessThan(
      buckets[1].date.getTime(),
    );
  });

  test("invalid recorded_at rows are skipped", () => {
    const buckets = groupMonitoringHistory(
      [
        row("not-a-date", 80),
        row("2026-10-01T08:00:00", 70),
      ],
      "Daily",
    );

    expect(buckets).toHaveLength(1);
    expect(
      buckets[0].rows,
    ).toHaveLength(1);
  });

  test("empty history yields no buckets", () => {
    expect(
      groupMonitoringHistory([], "Daily"),
    ).toEqual([]);
  });

  test("weekly buckets merge same-week days", () => {
    // 2026-10-05 is a Monday; both rows share its week.
    const buckets = groupMonitoringHistory(
      [
        row("2026-10-05T08:00:00", 80),
        row("2026-10-07T08:00:00", 70),
        row("2026-10-12T08:00:00", 60),
      ],
      "Weekly",
    );

    expect(buckets).toHaveLength(2);
    expect(
      buckets[0].rows,
    ).toHaveLength(2);
  });

  test("monthly buckets merge same-month days", () => {
    const buckets = groupMonitoringHistory(
      [
        row("2026-09-28T08:00:00", 80),
        row("2026-10-01T08:00:00", 70),
        row("2026-10-20T08:00:00", 60),
      ],
      "Monthly",
    );

    expect(buckets).toHaveLength(2);
  });
});

describe("getBatteryChartRangeData", () => {
  test("points carry clamped avg/min/max", () => {
    const buckets = groupMonitoringHistory(
      [
        row("2026-10-01T08:00:00", 80),
        row("2026-10-01T20:00:00", 60),
      ],
      "Daily",
    );

    const points = getBatteryChartRangeData(
      buckets,
      "Daily",
    );

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(70);
    expect(points[0].min).toBe(60);
    expect(points[0].max).toBe(80);
    expect(
      typeof points[0].label,
    ).toBe("string");
  });

  test("null levels count as zero, clamped to range", () => {
    const buckets = groupMonitoringHistory(
      [
        row("2026-10-01T08:00:00", null),
        row("2026-10-01T20:00:00", 150),
      ],
      "Daily",
    );

    const points = getBatteryChartRangeData(
      buckets,
      "Daily",
    );

    // avg(0,150)=75 stays in range; max clamps to 100.
    expect(points[0].value).toBe(75);
    expect(points[0].min).toBe(0);
    expect(points[0].max).toBe(100);
  });
});

describe("getUnsafeDischargeChartData", () => {
  test("counts sub-cutoff snapshots per bucket", () => {
    const buckets = groupMonitoringHistory(
      [
        row("2026-10-01T08:00:00", 80),
        row("2026-10-01T20:00:00", 15),
        row("2026-10-02T08:00:00", 10),
      ],
      "Daily",
    );

    const points = getUnsafeDischargeChartData(
      buckets,
      "Daily",
    );

    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(1);
    expect(points[1].value).toBe(1);
  });

  test("healthy days report zero, not absence", () => {
    const buckets = groupMonitoringHistory(
      [row("2026-10-01T08:00:00", 90)],
      "Daily",
    );

    const points = getUnsafeDischargeChartData(
      buckets,
      "Daily",
    );

    expect(points[0].value).toBe(0);
  });
});

describe("createFrequencyRange", () => {
  test("uses the documented rolling windows", () => {
    const now = new Date("2026-11-22T12:00:00");
    const dayMs = 24 * 60 * 60 * 1000;

    expect(
      Math.round(
        (createFrequencyRange("Daily", now).end.getTime() -
          createFrequencyRange("Daily", now).start.getTime()) /
          dayMs,
      ),
    ).toBe(1);

    expect(
      Math.round(
        (createFrequencyRange("Weekly", now).end.getTime() -
          createFrequencyRange("Weekly", now).start.getTime()) /
          dayMs,
      ),
    ).toBe(7);

    expect(
      Math.round(
        (createFrequencyRange("Monthly", now).end.getTime() -
          createFrequencyRange("Monthly", now).start.getTime()) /
          dayMs,
      ),
    ).toBe(30);

    expect(
      Math.round(
        (createFrequencyRange("Yearly", now).end.getTime() -
          createFrequencyRange("Yearly", now).start.getTime()) /
          dayMs,
      ),
    ).toBe(365);
  });
});

describe("buildAnalyticsCardData", () => {
  test("Daily groups by hour and exposes solar and load stats", () => {
    const rows = [
      analyticsRow("2026-10-01T08:00:00", {
        energy_input_wh: 100,
        solar_input: 250,
        solar_timer: "02:00:00",
        energy_output_wh: 40,
        current_load: 20,
        voltage: 12.5,
      }),
      analyticsRow("2026-10-01T08:30:00", {
        energy_input_wh: 50,
        solar_input: 300,
        solar_timer: "01:00:00",
        energy_output_wh: 60,
        current_load: 40,
        voltage: 12.1,
      }),
      analyticsRow("2026-10-01T09:00:00", {
        energy_input_wh: 25,
        energy_output_wh: 10,
        current_load: 10,
        voltage: 12.3,
      }),
    ];

    const data = buildAnalyticsCardData(rows, "Daily", {
      start: new Date("2026-10-01T00:00:00"),
      end: new Date("2026-10-01T23:59:59"),
    });

    expect(data.solar).toHaveLength(2);
    expect(data.solar[0].value).toBe(150);
    expect(data.solar[0].peakW).toBe(300);
    expect(data.solar[0].peakHours).toBe(2);
    expect(data.solar[0].chargeStart).toBeTruthy();

    expect(data.load[0].value).toBe(100);
    expect(data.load[0].avgW).toBeCloseTo(30, 5);
    expect(data.load[0].peakW).toBe(40);

    expect(data.battery[0].avgVoltage).toBeCloseTo(12.3, 5);
  });
});

describe("getBatteryActivityData", () => {
  test("counts charging, discharging, and idle samples for the shared range", () => {
    const slices = getBatteryActivityData(
      groupMonitoringHistoryForAnalytics(
        [
          row("2026-10-01T08:00:00", 80, "Charging"),
          row("2026-10-02T08:00:00", 70, "Discharging"),
          row("2026-10-03T08:00:00", 60, "Idle"),
        ],
        "Weekly",
      ),
    );

    expect(slices.map((slice) => slice.key)).toEqual([
      "charging",
      "discharging",
      "idle",
    ]);
    expect(slices.map((slice) => slice.value)).toEqual([1, 1, 1]);
  });
});
