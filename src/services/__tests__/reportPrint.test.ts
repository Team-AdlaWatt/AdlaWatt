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
  readReportFileText,
} from "@/services/reportPrint";
import {
  prepareReportData,
  type MonitoringHistoryRow,
} from "@/services/analyticsService";
import { File } from "expo-file-system";
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

// File is swapped out so the text reader can be exercised without
// touching the native filesystem; the rest of the module (Paths)
// stays real for the HTML tests.
jest.mock("expo-file-system", () => ({
  ...jest.requireActual("expo-file-system"),
  File: jest.fn(),
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
    battery_temperature: 27,
    battery_temperature_status: "Nominal",
    solar_temperature: 41,
    solar_temperature_status: "Nominal",
    interior_temp: 24,
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
      battery_temperature_status: "High",
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
  test("renders the shared schema sections", () => {
    expect(html).toContain("Summary");
    expect(html).toContain("Key Metrics");
    expect(html).toContain("Aggregated Periods");
    expect(html).toContain("Monitoring History");
  });

  test("carries the derived analytics KPIs", () => {
    expect(html).toContain("Solar coverage");
    expect(html).toContain("Device uptime");
    expect(html).toContain(
      "Unsafe discharge samples",
    );
    expect(html).toContain("Best sun day");
    expect(html).toContain("Temperature alerts");
  });

  test("aggregated periods table mirrors the schema columns", () => {
    expect(html).toContain("<th>Period</th>");
    expect(html).toContain("<th>Coverage %</th>");
    expect(html).toContain("<th>Uptime %</th>");
    expect(html).toContain("<th>Sun h</th>");
  });

  test("monitoring columns match the web PDF curated set", () => {
    for (const header of [
      "<th>Battery %</th>",
      "<th>Solar W</th>",
      "<th>Load W</th>",
      "<th>Sol Timer</th>",
      "<th>Sol V</th>",
      "<th>Sol A</th>",
      "<th>Total Wh</th>",
    ]) {
      expect(html).toContain(header);
    }

    // The previously divergent native-only headers are gone.
    expect(html).not.toContain("<th>Volt</th>");
    expect(html).not.toContain("<th>In Wh</th>");
    expect(html).not.toContain("<th>Out Wh</th>");
  });

  test("footnotes the row count and truncates past the cap", () => {
    expect(html).toContain(
      `${reportData.monitoringRows.length} records in this period.`,
    );

    const many = {
      ...reportData,
      monitoringRows: Array.from(
        { length: PRINT_MAX_ROWS + 5 },
        () => reportData.monitoringRows[0],
      ),
    };

    const capped = buildReportHtml(many, null);

    expect(capped).toContain(
      `Showing first ${PRINT_MAX_ROWS} of ${PRINT_MAX_ROWS + 5} records`,
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

// The export flow never opens a share chooser: the PDF is handed
// to the system document preview and the CSV is read back for the
// in-app viewer. These lock those two exit paths.
describe("report exit helpers", () => {
  const pdf = {
    uri: "file:///cache/adlawatt_daily_report.pdf",
    filename: "adlawatt_daily_report.pdf",
    mimeType: "application/pdf",
  };

  const csv = {
    uri: "file:///cache/adlawatt_daily_report.csv",
    filename: "adlawatt_daily_report.csv",
    mimeType: "text/csv",
  };

  test("openReportPdfFile hands the local PDF to the system preview", async () => {
    await openReportPdfFile(pdf);

    expect(Print.printAsync).toHaveBeenCalledWith(
      {
        uri: pdf.uri,
      },
    );
  });

  test("readReportFileText returns the exported CSV text", async () => {
    const text = "Period,Value\nDaily,1";

    (File as unknown as jest.Mock).mockImplementation(
      () => ({
        text: jest.fn(async () => text),
      }),
    );

    await expect(
      readReportFileText(csv),
    ).resolves.toBe(text);
  });
});
