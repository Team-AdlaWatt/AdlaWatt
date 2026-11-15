// Analytics grouping unit tests (pure bucketing + range
// shaping — no Supabase calls; rows are built inline).
//
// Locks the chart pipeline contract: invalid rows never reach
// a bucket, buckets sort chronologically, and range points
// carry clamped avg/min/max.

import {
  getBatteryChartRangeData,
  getUnsafeDischargeChartData,
  groupMonitoringHistory,
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
    battery_temperature: null,
    battery_temperature_status: null,
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
