// Canonical report schema tests.
//
// Locks the contract between the analytics charts and the report
// exports: buildReportPeriods must reuse the same chart helpers
// (so numbers can never diverge), and buildReportKpis must apply
// the documented definitions (CAUTION_SOC=20 for unsafe,
// "Online" for uptime, High/Critical for temperature alerts,
// per-day max solar_timer for sun hours).

import {
  buildReportKpis,
  buildReportPeriods,
  generateAdlaWattCsv,
  getOnlineShareData,
  getUnsafeDischargeChartData,
  groupMonitoringHistory,
  prepareReportData,
  type MonitoringHistoryRow,
} from "@/services/analyticsService";

// jspdf's ESM bundle cannot run under Jest; stub it so importing
// the service only exercises the pure report math.
jest.mock("jspdf", () => ({
  jsPDF: jest.fn(),
}));

jest.mock("jspdf-autotable", () => ({
  __esModule: true,
  default: jest.fn(),
}));

interface RowOverrides {
  recorded_at: string;
  battery_level?: number | null;
  battery_status?: string | null;
  solar_input?: number | null;
  solar_timer?: string | null;
  current_load?: number | null;
  device_status?: string | null;
  battery_temperature?: number | null;
  battery_temperature_status?: string | null;
  solar_temperature?: number | null;
  solar_temperature_status?: string | null;
  energy_input_wh?: number | null;
  energy_output_wh?: number | null;
}

const row = (overrides: RowOverrides): MonitoringHistoryRow =>
  ({
    recorded_at: overrides.recorded_at,
    battery_level: overrides.battery_level ?? 0,
    battery_status: overrides.battery_status ?? "Charging",
    time_remaining: null,
    solar_input: overrides.solar_input ?? 0,
    solar_status: null,
    solar_timer: overrides.solar_timer ?? null,
    solar_voltage: null,
    solar_current: null,
    total_energy: null,
    current_load: overrides.current_load ?? 0,
    device_status: overrides.device_status ?? "Online",
    last_seen: null,
    battery_temperature:
      overrides.battery_temperature ?? 0,
    battery_temperature_status:
      overrides.battery_temperature_status ?? null,
    solar_temperature: overrides.solar_temperature ?? 0,
    solar_temperature_status:
      overrides.solar_temperature_status ?? null,
    interior_temp: null,
    voltage: null,
    watt_hours: null,
    cumulative_energy_input_wh: null,
    cumulative_energy_output_wh: null,
    energy_input_wh: overrides.energy_input_wh ?? 0,
    energy_output_wh: overrides.energy_output_wh ?? 0,
  }) as MonitoringHistoryRow;

// Two days of data with deliberately distinct aggregates per day.
const twoDayRows: MonitoringHistoryRow[] = [
  // Day 1: healthy, mixed online, one temperature alert.
  row({
    recorded_at: "2026-10-01T08:00:00",
    battery_level: 80,
    solar_input: 300,
    solar_timer: "02:00:00",
    current_load: 50,
    device_status: "Online",
    battery_temperature: 25,
    battery_temperature_status: "Nominal",
    solar_temperature: 40,
    solar_temperature_status: "Nominal",
    energy_input_wh: 100,
    energy_output_wh: 80,
  }),
  row({
    recorded_at: "2026-10-01T20:00:00",
    battery_level: 70,
    solar_input: 200,
    solar_timer: "01:00:00",
    current_load: 120,
    device_status: "Offline",
    battery_temperature: 30,
    battery_temperature_status: "High",
    solar_temperature: 45,
    solar_temperature_status: "Nominal",
    energy_input_wh: 120,
    energy_output_wh: 90,
  }),
  // Day 2: unsafe discharge, fully online, one critical alert.
  row({
    recorded_at: "2026-10-02T08:00:00",
    battery_level: 15,
    solar_input: 500,
    solar_timer: "03:00:00",
    current_load: 40,
    device_status: "Online",
    battery_temperature: 20,
    battery_temperature_status: "Nominal",
    solar_temperature: 30,
    solar_temperature_status: "Nominal",
    energy_input_wh: 0,
    energy_output_wh: 50,
  }),
  row({
    recorded_at: "2026-10-02T20:00:00",
    battery_level: 10,
    solar_input: 400,
    solar_timer: "04:00:00",
    current_load: 60,
    device_status: "Online",
    battery_temperature: 22,
    battery_temperature_status: "Nominal",
    solar_temperature: 35,
    solar_temperature_status: "Critical",
    energy_input_wh: 0,
    energy_output_wh: 50,
  }),
];

describe("buildReportPeriods", () => {
  test("bucket count matches groupMonitoringHistory", () => {
    const periods = buildReportPeriods(
      twoDayRows,
      "Daily",
    );

    expect(periods).toHaveLength(
      groupMonitoringHistory(twoDayRows, "Daily")
        .length,
    );
  });

  test("aggregates battery avg/min/max per bucket", () => {
    const [day1, day2] = buildReportPeriods(
      twoDayRows,
      "Daily",
    );

    expect(day1.sampleCount).toBe(2);
    expect(day1.avgBatteryLevel).toBeCloseTo(
      75,
      5,
    );
    expect(day1.minBatteryLevel).toBe(70);
    expect(day1.maxBatteryLevel).toBe(80);

    expect(day2.avgBatteryLevel).toBeCloseTo(
      12.5,
      5,
    );
    expect(day2.minBatteryLevel).toBe(10);
    expect(day2.maxBatteryLevel).toBe(15);
  });

  test("sums energy and tracks signed net + running balance", () => {
    const [day1, day2] = buildReportPeriods(
      twoDayRows,
      "Daily",
    );

    expect(day1.energyInputWh).toBe(220);
    expect(day1.energyOutputWh).toBe(170);
    expect(day1.netEnergyWh).toBe(50);
    expect(day1.runningBalanceWh).toBe(50);

    expect(day2.energyInputWh).toBe(0);
    expect(day2.energyOutputWh).toBe(100);
    expect(day2.netEnergyWh).toBe(-100);
    // 50 (day 1) + -100 (day 2) = -50
    expect(day2.runningBalanceWh).toBe(-50);
  });

  test("solar coverage is input/output % and never divides by zero", () => {
    const [day1, day2] = buildReportPeriods(
      twoDayRows,
      "Daily",
    );

    expect(day1.solarCoveragePct).toBeCloseTo(
      (220 / 170) * 100,
      5,
    );

    // Day 2 has output but no input -> 0, not Infinity/NaN.
    expect(day2.solarCoveragePct).toBe(0);
  });

  test("coverage is 0 for an output-less bucket (guard)", () => {
    const [only] = buildReportPeriods(
      [
        row({
          recorded_at: "2026-10-03T10:00:00",
          energy_input_wh: 120,
          energy_output_wh: 0,
        }),
      ],
      "Daily",
    );

    expect(only.solarCoveragePct).toBe(0);
  });

  test("avg/peak load, uptime, unsafe and alert counts per bucket", () => {
    const [day1, day2] = buildReportPeriods(
      twoDayRows,
      "Daily",
    );

    expect(day1.avgLoadW).toBeCloseTo(85, 5);
    expect(day1.peakLoadW).toBe(120);
    expect(day1.uptimePct).toBeCloseTo(50, 5);
    expect(day1.unsafeSampleCount).toBe(0);
    expect(day1.temperatureAlertCount).toBe(1);

    expect(day2.avgLoadW).toBeCloseTo(50, 5);
    expect(day2.peakLoadW).toBe(60);
    expect(day2.uptimePct).toBeCloseTo(100, 5);
    expect(day2.unsafeSampleCount).toBe(2);
    expect(day2.temperatureAlertCount).toBe(1);
  });

  test("sun hours uses per-day max solar_timer", () => {
    const [day1, day2] = buildReportPeriods(
      twoDayRows,
      "Daily",
    );

    // Day 1: max(2h, 1h) = 2h. Day 2: max(3h, 4h) = 4h.
    expect(day1.sunHours).toBeCloseTo(2, 5);
    expect(day2.sunHours).toBeCloseTo(4, 5);
  });

  test("returns [] for empty history", () => {
    expect(
      buildReportPeriods([], "Monthly"),
    ).toEqual([]);
  });

  test("Monthly buckets aggregate across months", () => {
    const periods = buildReportPeriods(
      [
        row({
          recorded_at: "2026-10-15T12:00:00",
          battery_level: 50,
        }),
        row({
          recorded_at: "2026-11-15T12:00:00",
          battery_level: 60,
        }),
      ],
      "Monthly",
    );

    expect(periods).toHaveLength(2);
    expect(periods[0].periodLabel).toBe("Oct");
    expect(periods[1].periodLabel).toBe("Nov");
  });
});

describe("buildReportKpis", () => {
  const kpi = (
    list: ReturnType<typeof buildReportKpis>,
    key: string,
  ) => list.find((entry) => entry.key === key);

  const buildList = () =>
    buildReportKpis(
      twoDayRows,
      // Mirrors createReportSummary for the values the KPIs reuse.
      {
        sampleCount: twoDayRows.length,
        averageBatteryLevel:
          (80 + 70 + 15 + 10) / 4,
        minimumBatteryLevel: 10,
        maximumBatteryLevel: 80,
        averageSolarInput: 350,
        maximumSolarInput: 500,
        averageCurrentLoad: 67.5,
        maximumCurrentLoad: 120,
        averageBatteryTemperature: 24.25,
        maximumBatteryTemperature: 30,
        averageSolarTemperature: 37.5,
        maximumSolarTemperature: 45,
        totalEnergyInputWh: 220,
        totalEnergyOutputWh: 270,
        latestBatteryLevel: 10,
        latestBatteryStatus: "Discharging",
        latestSolarInput: 400,
        latestSolarStatus: "Producing",
        latestCurrentLoad: 60,
        latestBatteryTemperature: 22,
        latestBatteryTemperatureStatus: "Nominal",
        latestSolarTemperature: 35,
        latestSolarTemperatureStatus: "Critical",
        latestSolarTimer: "04:00:00",
        latestSolarVoltage: 12,
        latestSolarCurrent: 3,
        latestTotalEnergy: 0,
        latestDeviceStatus: "Online",
        latestTimeRemaining: "N/A",
      },
    );

  test("reports derived range totals", () => {
    const list = buildList();

    expect(kpi(list, "samples")?.value).toBe("4");
    expect(kpi(list, "energyInput")?.value).toBe(
      "220.0",
    );
    expect(kpi(list, "energyOutput")?.value).toBe(
      "270.0",
    );
    expect(kpi(list, "netEnergy")?.value).toBe(
      "-50.0",
    );
  });

  test("solar coverage and uptime match the analytic definitions", () => {
    const list = buildList();

    expect(
      kpi(list, "solarCoverage")?.value,
    ).toBe("81.5"); // 220 / 270 * 100

    // 3 of 4 samples online -> 75%
    expect(kpi(list, "uptime")?.value).toBe("75.0");
  });

  test("unsafe discharge uses CAUTION_SOC (20)", () => {
    const list = buildList();

    expect(
      kpi(list, "unsafeDischarge")?.value,
    ).toBe("2");
    expect(
      kpi(list, "unsafeDischarge")?.hint,
    ).toBe("50.0% of samples");
  });

  test("temperature alerts count High|Critical on either sensor", () => {
    const list = buildList();

    expect(
      kpi(list, "temperatureAlerts")?.value,
    ).toBe("2");
  });

  test("sun hours total and best sun day tracked per day", () => {
    const list = buildList();

    expect(kpi(list, "sunHours")?.value).toBe(
      "6.0",
    );
    expect(kpi(list, "bestSunDay")?.value).toBe(
      "2026-10-02",
    );
    expect(
      kpi(list, "bestSunDay")?.hint,
    ).toBe("peak 500.0 W");
  });

  test("peak load is the range maximum", () => {
    const list = buildList();

    expect(kpi(list, "peakLoad")?.value).toBe(
      "120.0",
    );
  });

  test("degrades gracefully on empty history", () => {
    const list = buildReportKpis([], {
      sampleCount: 0,
      averageBatteryLevel: 0,
      minimumBatteryLevel: 0,
      maximumBatteryLevel: 0,
      averageSolarInput: 0,
      maximumSolarInput: 0,
      averageCurrentLoad: 0,
      maximumCurrentLoad: 0,
      averageBatteryTemperature: 0,
      maximumBatteryTemperature: 0,
      averageSolarTemperature: 0,
      maximumSolarTemperature: 0,
      totalEnergyInputWh: 0,
      totalEnergyOutputWh: 0,
      latestBatteryLevel: 0,
      latestBatteryStatus: "No data",
      latestSolarInput: 0,
      latestSolarStatus: "No data",
      latestCurrentLoad: 0,
      latestBatteryTemperature: 0,
      latestBatteryTemperatureStatus: "No data",
      latestSolarTemperature: 0,
      latestSolarTemperatureStatus: "No data",
      latestSolarTimer: "No data",
      latestSolarVoltage: 0,
      latestSolarCurrent: 0,
      latestTotalEnergy: 0,
      latestDeviceStatus: "No data",
      latestTimeRemaining: "No data",
    });

    expect(kpi(list, "samples")?.value).toBe("0");
    expect(kpi(list, "solarCoverage")?.value).toBe(
      "0.0",
    );
    expect(kpi(list, "uptime")?.value).toBe("0.0");
    expect(kpi(list, "bestSunDay")?.value).toBe(
      "N/A",
    );
  });
});

describe("prepareReportData schema", () => {
  test("carries the full canonical schema", () => {
    const data = prepareReportData(
      twoDayRows,
      "Daily",
      {
        start: new Date("2026-10-01T00:00:00"),
        end: new Date("2026-10-02T23:59:59"),
      },
    );

    expect(data.monitoringRows).toHaveLength(4);
    expect(data.periods).toHaveLength(2);
    expect(data.kpis.length).toBeGreaterThan(0);
    expect(data.frequency).toBe("Daily");

    // Raw history retained for CSV depth.
    expect(data.monitoringHistory).toBe(
      twoDayRows,
    );
  });

  test("periods stay chart-aligned with the raw helpers", () => {
    const data = prepareReportData(
      twoDayRows,
      "Daily",
      {
        start: new Date("2026-10-01T00:00:00"),
        end: new Date("2026-10-02T23:59:59"),
      },
    );

    const grouped = groupMonitoringHistory(
      twoDayRows,
      "Daily",
    );

    const unsafe = getUnsafeDischargeChartData(
      grouped,
      "Daily",
    );

    const online = getOnlineShareData(grouped);

    expect(
      data.periods.map((p) => p.unsafeSampleCount),
    ).toEqual(unsafe.map((p) => p.value));

    // 3 online of 4 samples overall.
    expect(online.online).toBe(3);
    expect(online.offline).toBe(1);
  });
});

// Minimal RFC-4180-ish line splitter: date labels contain commas
// and are therefore quoted, so a naive split(",") miscounts.
const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);

  return cells;
};

describe("generateAdlaWattCsv", () => {
  const data = prepareReportData(
    twoDayRows,
    "Daily",
    {
      start: new Date("2026-10-01T00:00:00"),
      end: new Date("2026-10-02T23:59:59"),
    },
  );

  const csv = generateAdlaWattCsv(data);
  const lines = csv.split("\n");

  const titleIndex = (title: string) =>
    lines.findIndex((line) =>
      line.startsWith(title),
    );

  test("writes summary, KPI, period and history blocks", () => {
    expect(
      lines.some((line) =>
        line.startsWith("Metric,Value"),
      ),
    ).toBe(true);

    expect(
      titleIndex("DERIVED ANALYTICS KPIs"),
    ).toBeGreaterThan(-1);

    expect(
      titleIndex("AGGREGATED PERIODS"),
    ).toBeGreaterThan(-1);

    expect(
      titleIndex("MONITORING HISTORY"),
    ).toBeGreaterThan(-1);
  });

  test("monitoring block carries full monitoring_history parity", () => {
    const start = titleIndex(
      "MONITORING HISTORY",
    );

    const header = parseCsvLine(
      lines[start + 1],
    );

    expect(header).toHaveLength(24);
    expect(header).toContain("Time Remaining");
    expect(header).toContain("Solar Status");
    expect(header).toContain("Last Seen");
    expect(header).toContain("Interior C");
    expect(header).toContain("Watt Hours");
    expect(header).toContain("Cumulative In Wh");
    expect(header).toContain(
      "Cumulative Out Wh",
    );

    // Every data row matches the header width (no ragged grid).
    for (
      let i = start + 2;
      i < start + 2 + 4;
      i += 1
    ) {
      expect(
        parseCsvLine(lines[i]),
      ).toHaveLength(24);
    }
  });

  test("KPI block lists the derived analytics", () => {
    const start = titleIndex(
      "DERIVED ANALYTICS KPIs",
    );

    const block = lines
      .slice(
        start,
        start + 2 + data.kpis.length,
      )
      .join("\n");

    expect(block).toContain("Solar coverage");
    expect(block).toContain("Device uptime");
    expect(block).toContain(
      "Unsafe discharge samples",
    );
    expect(block).toContain("Best sun day");
  });

  test("period block is one aggregated row per bucket", () => {
    const start = titleIndex(
      "AGGREGATED PERIODS",
    );

    const header = parseCsvLine(
      lines[start + 1],
    );

    expect(header).toHaveLength(20);
    expect(header[0]).toBe("Period");

    const day1 = parseCsvLine(lines[start + 2]);
    const day2 = parseCsvLine(lines[start + 3]);

    expect(day1).toHaveLength(20);
    expect(day2).toHaveLength(20);

    // Net energy column (index 9): +50 Wh then -100 Wh.
    expect(day1[9]).toBe("50.0");
    expect(day2[9]).toBe("-100.0");
  });

  test("caps monitoring rows with a truncation notice", () => {
    const manyRows = Array.from(
      { length: 20005 },
      () => data.monitoringRows[0],
    );

    const oversized = {
      ...data,
      monitoringRows: manyRows,
    };

    const out = generateAdlaWattCsv(oversized);

    expect(out).toContain("Showing first 20000 of 20005 records");
  });
});

