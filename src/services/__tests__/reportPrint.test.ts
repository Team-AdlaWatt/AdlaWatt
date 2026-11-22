// Native report HTML tests.
//
// Locks the native PDF template to the shared canonical report
// schema: it must carry the derived KPIs and the aggregated
// periods, and its monitoring columns must match the curated set
// the web PDF uses (they previously diverged on Volt / In Wh /
// Out Wh).

import {
  PRINT_MAX_ROWS,
  buildReportHtml,
  openReportPdfFile,
} from "@/services/reportPrint";
import {
  prepareReportData,
  type MonitoringHistoryRow,
} from "@/services/analyticsService";
import * as Print from "expo-print";

jest.mock("jspdf", () => ({
  jsPDF: jest.fn(),
}));

jest.mock("jspdf-autotable", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn(),
  printAsync: jest.fn(async () => undefined),
}));

const row = (
  recorded_at: string,
  battery_level: number,
  extra: Partial<MonitoringHistoryRow> = {},
): MonitoringHistoryRow =>
  ({
    recorded_at,
    battery_level,
    battery_status: "Charging",
    time_remaining: null,
    solar_input: 250,
    solar_status: "Producing",
    solar_timer: "02:30:00",
    solar_voltage: 12.4,
    solar_current: 3.1,
    total_energy: 480,
    current_load: 90,
    device_status: "Online",
    last_seen: null,
    dod_status: "Safe",
    solar_temperature: 41,
    solar_temperature_status: "Nominal",
    interior_temp: 24,
    interior_temp_status: "Nominal",
    voltage: 12.2,
    watt_hours: 460,
    cumulative_energy_input_wh: 1200,
    cumulative_energy_output_wh: 900,
    energy_input_wh: 120,
    energy_output_wh: 95,
    ...extra,
  }) as MonitoringHistoryRow;

const reportData = prepareReportData(
  [
    row("2026-10-01T08:00:00", 80, {
      solar_temperature_status: "High",
    }),
    row("2026-10-01T20:00:00", 15, {
      device_status: "Offline",
      solar_input: 0,
    }),
    row("2026-10-02T08:00:00", 60),
  ],
  "Daily",
  {
    start: new Date("2026-10-01T00:00:00"),
    end: new Date("2026-10-02T23:59:59"),
  },
);

const html = buildReportHtml(
  reportData,
  null,
);

describe("buildReportHtml", () => {
  test("renders the four card-aligned export sections", () => {
    for (const title of [
      "SOLAR ENERGY",
      "LOAD ENERGY",
      "BATTERY ACTIVITY",
      "GENERATE REPORT",
    ]) {
      expect(html).toContain(title);
    }
  });

  test("uses the analytics card table headers", () => {
    for (const header of [
      "<th>Energy Collected (Wh)</th>",
      "<th>Peak Output (W)</th>",
      "<th>Peak Sun (h)</th>",
      "<th>Charge Start</th>",
      "<th>Energy Used (Wh)</th>",
      "<th>Average Load (W)</th>",
      "<th>Peak Load (W)</th>",
      "<th>Activity</th>",
      "<th>Samples</th>",
      "<th>Share (%)</th>",
      "<th>Field</th>",
      "<th>Value</th>",
    ]) {
      expect(html).toContain(header);
    }
  });

  test("omits the legacy summary, period, and monitoring blocks", () => {
    for (const legacyTitle of [
      "Summary",
      "Key Metrics",
      "Aggregated Periods",
      "Monitoring History",
      "BATTERY — VOLTAGE",
      "<th>Battery %</th>",
    ]) {
      expect(html).not.toContain(legacyTitle);
    }
  });

  test("caps oversized section rows at the print limit", () => {
    const many = {
      ...reportData,
      sections: reportData.sections.map((section) => ({
        ...section,
        rows: Array.from(
          { length: PRINT_MAX_ROWS + 5 },
          () => section.rows[0],
        ),
      })),
    };

    const capped = buildReportHtml(many, null);
    const renderedRows = capped.match(/<tr>/g) ?? [];

    expect(renderedRows).toHaveLength(
      reportData.sections.length * (PRINT_MAX_ROWS + 1),
    );
  });

  test("escapes report values before interpolation", () => {
    const hostile = {
      ...reportData,
      reportTitle: "<script>alert(1)</script>",
    };

    const out = buildReportHtml(hostile, null);

    expect(out).not.toContain("<script>");
    expect(out).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });
});

// The export flow hands the built file to an external app on
// Android (see reportOpen.test.ts). This is the non-Android
// fallback that the same open path uses.
describe("openReportPdfFile", () => {
  const pdf = {
    uri: "file:///cache/adlawatt_daily_report.pdf",
    filename: "adlawatt_daily_report.pdf",
    mimeType: "application/pdf",
  };

  test("hands the local PDF to the platform viewer", async () => {
    await openReportPdfFile(pdf);

    expect(Print.printAsync).toHaveBeenCalledWith({
      uri: pdf.uri,
    });
  });
});
