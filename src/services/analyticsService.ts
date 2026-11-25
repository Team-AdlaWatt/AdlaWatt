import {
  Platform,
} from "react-native";

import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";

import { withTimeout } from "@/lib/withTimeout";

import { CAUTION_SOC } from "@/services/recommendation";

import type { jsPDF } from "jspdf";
import type autoTableType from "jspdf-autotable";

// Browser-only libs (jspdf, autotable, logo asset) are
// required lazily inside the web export flow only — never at
// module top. Static evaluation throws on native Hermes (no
// DOM) at Analytics route mount while web tolerates it, which
// grey-screens the tab on release APKs. The loaders below run
// exclusively on the web export press path.
function getJsPDFClass(): new (
  options?: Record<string, unknown>,
) => jsPDF {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- press-time lazy bind, never on native mount
  return require("jspdf").jsPDF;
}

function getAutoTable(): typeof autoTableType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- press-time lazy bind, never on native mount
  const mod = require("jspdf-autotable");

  return mod.default ?? mod;
}

/* ==========================================================
   TYPES
   ========================================================== */

export type ChartFrequency =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Yearly";

export type ReportFrequency =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Yearly";

export type ReportType =
  | "CSV"
  | "PDF";

export interface MonitoringHistoryRow {
  recorded_at: string;
  battery_level: number | null;
  battery_status: string | null;
  time_remaining: string | null;
  solar_input: number | null;
  solar_status: string | null;
  solar_timer: string | null;
  solar_voltage: number | null;
  solar_current: number | null;
  total_energy: number | null;
  current_load: number | null;
  device_status: string | null;
  last_seen: string | null;
  dod_status: string | null;
  solar_temperature: number | null;
  solar_temperature_status: string | null;
  interior_temp: number | null;
  interior_temp_status: string | null;
  voltage: number | null;
  watt_hours: number | null;
  cumulative_energy_input_wh: number | null;
  cumulative_energy_output_wh: number | null;
  energy_input_wh: number | null;
  energy_output_wh: number | null;
}

export interface ChartPoint {
  value: number;
  label?: string;
}

export interface AnalyticsRange {
  start: Date;
  end: Date;
}

export interface MonitoringBucket {
  key: string;
  date: Date;
  rows: MonitoringHistoryRow[];
}

export interface AnalyticsMetricPoint {
  label: string;
  value: number;
}

export interface SolarAnalyticsPoint
  extends AnalyticsMetricPoint {
  energyWh: number;
  solarInputW: number;
  peakW: number;
  peakHours: number;
  chargeStart: string | null;
}

export interface LoadAnalyticsPoint
  extends AnalyticsMetricPoint {
  energyWh: number;
  avgW: number;
  peakW: number;
  avgVoltage: number;
}

export interface BatteryAnalyticsPoint
  extends AnalyticsMetricPoint {
  avgVoltage: number;
  minVoltage: number;
  maxVoltage: number;
}

export interface AnalyticsCardData {
  frequency: ChartFrequency;
  range: AnalyticsRange;
  solar: SolarAnalyticsPoint[];
  load: LoadAnalyticsPoint[];
  activity: BatteryActivitySlice[];
}

export interface AnalyticsReportSection {
  key: "solar" | "load" | "activity" | "report";
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export type BatteryHealthStatus =
  | "Safe"
  | "Unsafe";

/* ============================================================
   REPORT TYPES
   ============================================================ */

export interface ReportSummary {
  sampleCount: number;

  averageBatteryLevel: number;
  minimumBatteryLevel: number;
  maximumBatteryLevel: number;

  averageSolarInput: number;
  maximumSolarInput: number;

  averageCurrentLoad: number;
  maximumCurrentLoad: number;

  averageSolarTemperature: number;
  maximumSolarTemperature: number;

  totalEnergyInputWh: number;
  totalEnergyOutputWh: number;

  latestBatteryLevel: number;
  latestBatteryStatus: string;
  latestSolarInput: number;
  latestSolarStatus: string;
  latestCurrentLoad: number;

  latestSolarTemperature: number;
  latestSolarTemperatureStatus: string;

  latestSolarTimer: string;
  latestSolarVoltage: number;
  latestSolarCurrent: number;
  latestTotalEnergy: number;

  latestDeviceStatus: string;
  latestTimeRemaining: string;
}

export interface ReportMonitoringRow {
  recordedAt: string;
  batteryLevel: string;
  batteryStatus: string;
  timeRemaining: string;
  solarInput: string;
  solarStatus: string;
  solarTimer: string;
  solarVoltage: string;
  solarCurrent: string;
  totalEnergy: string;
  currentLoad: string;
  deviceStatus: string;
  lastSeen: string;
  dodStatus: string;
  solarTemperature: string;
  solarTemperatureStatus: string;
  interiorTemp: string;
  interiorTempStatus: string;
  voltage: string;
  wattHours: string;
  energyInputWh: string;
  energyOutputWh: string;
  cumulativeEnergyInputWh: string;
  cumulativeEnergyOutputWh: string;
}

export interface AnalyticsReportData {
  frequency: ReportFrequency;
  range: AnalyticsRange;

  monitoringHistory: MonitoringHistoryRow[];

  monitoringRows: ReportMonitoringRow[];

  /*
   * Chart-aligned per-bucket aggregates. Same bucketing and same
   * math as the analytics cards, so a report can never drift
   * from what the screen shows.
   */
  periods: ReportPeriodRow[];

  summary: ReportSummary;

  /*
   * Derived analytics KPIs (solar coverage, uptime, unsafe
   * discharge, best sun day, ...). Surfaced in both exports so
   * the files carry insight, not just raw columns.
   */
  kpis: ReportKpi[];

  /*
   * Four-section export model shared by CSV, web PDF and native
   * PDF: Solar Energy, Load Energy, Battery Activity and the
   * Generate Report metadata block.
   */
  sections: AnalyticsReportSection[];

  reportTitle: string;
  reportSubtitle: string;
}

/* ============================================================
   CANONICAL REPORT SCHEMA
   ------------------------------------------------------------
   One schema feeds BOTH exports — CSV keeps full raw parity,
   PDF shows a curated subset — and both mirror the on-screen
   analytics. Layers, outermost first:
     kpis           derived range-level analytics
     periods        per-bucket aggregates (chart-aligned)
     summary        range-level raw aggregates
     monitoringRows raw per-sample rows (CSV detail)
   ============================================================ */

export interface ReportKpi {
  /** Stable id; also the CSV row key. */
  key: string;
  label: string;
  /** Pre-formatted value (already rounded/units applied). */
  value: string;
  /** Optional unit suffix for the PDF value cell. */
  unit?: string;
  /** Optional secondary note, e.g. which day was best. */
  hint?: string;
}

export interface ReportPeriodRow {
  /** Bucket label matching the charts (e.g. "Oct 16"). */
  periodLabel: string;
  sampleCount: number;

  avgBatteryLevel: number;
  minBatteryLevel: number;
  maxBatteryLevel: number;

  avgSolarInput: number;
  maxSolarInput: number;

  energyInputWh: number;
  energyOutputWh: number;
  netEnergyWh: number;
  runningBalanceWh: number;
  solarCoveragePct: number;

  avgLoadW: number;
  peakLoadW: number;

  uptimePct: number;
  unsafeSampleCount: number;
  temperatureAlertCount: number;
  sunHours: number;

  avgSolarTemperature: number;
}



/* ============================================================
   CONSTANTS
   ============================================================ */

/*
 * Default analytics window. Kept intentionally short: every
 * chart card and the CSV/PDF export derive from the same
 * in-memory row array, and a full year of 5-minute samples
 * (~100k rows) is what greyscreens low-memory Android devices
 * and OOMs the export string.
 */
export const DEFAULT_DAYS = 30;

// PostgREST caps a single response (default 1000 rows), so
// long history ranges must be walked page by page.
export const ANALYTICS_PAGE_SIZE = 1000;

/*
 * Upper bound on rows written into a CSV export. A full-year
 * range can be ~100k rows and the joined string is the single
 * largest allocation in the export path, so it is capped here
 * (with a truncation notice) instead of risking an OOM crash.
 * The on-screen summary always reflects the full range.
 */
export const CSV_MAX_ROWS = 20000;

/*
 * Upper bound on rows pulled into the Analytics tab. A 1Y
 * range at 5-minute cadence is ~105k rows; holding them all in
 * JS memory and running ~15 grouping passes over them ANRs /
 * OOMs Hermes on low-end phones. Keep the most recent window
 * (fetched newest-first) and restore ascending order for the
 * charts. On-screen numbers therefore reflect the kept window.
 */
export const ANALYTICS_MAX_ROWS = 20000;

export const FREQUENCIES: ChartFrequency[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
];

export const REPORT_FREQUENCIES: ReportFrequency[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
];

/*
 * Each frequency controls both its rolling window and how its
 * X axis is bucketed: days, weeks, months, or years.
 */
export const ANALYTICS_RANGE_DAYS: Record<
  ChartFrequency,
  number
> = {
  Daily: 30,
  Weekly: 90,
  Monthly: 365,
  Yearly: 1825,
};

export const ANALYTICS_BUCKET_FREQUENCIES: Record<
  ChartFrequency,
  ChartFrequency
> = {
  Daily: "Daily",
  Weekly: "Weekly",
  Monthly: "Monthly",
  Yearly: "Yearly",
};

/* ============================================================
   BASIC DATA HELPERS
   ============================================================ */

export function toNumber(
  value: unknown,
): number {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

export function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

export function average(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / values.length
  );
}

/*
 * Inline reduce instead of Math.min(...values): spreading a
 * full-year history (~100k entries) into arguments overflows
 * the Hermes call stack with RangeError. reduce is O(n) with
 * constant stack.
 */
export function minimum(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((lowest, value) =>
    value < lowest ? value : lowest,
  );
}

export function maximum(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((highest, value) =>
    value > highest ? value : highest,
  );
}

/*
 * Averages, min/max, peaks and status counts must use Online
 * snapshots only: Offline rows hold stale values. Energy totals
 * and uptime still use every row.
 */
function isOnlineRow(
  row: MonitoringHistoryRow,
): boolean {
  return row.device_status === "Online";
}

function getOnlineRows(
  rows: MonitoringHistoryRow[],
): MonitoringHistoryRow[] {
  return rows.filter(isOnlineRow);
}

function finiteNonNegativeValues(
  values: (number | null)[],
): number[] {
  return values
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value),
    )
    .map((value) => Math.max(0, value));
}

/*
 * The database is authoritative for depth of discharge. Fall back
 * to the SOC heuristic only for legacy rows where dod_status is
 * missing, so old history still counts unsafe events.
 */
export function isUnsafeDischarge(
  row: MonitoringHistoryRow,
): boolean {
  if (row.dod_status === "Unsafe") {
    return true;
  }

  if (row.dod_status === "Safe") {
    return false;
  }

  return (
    getDoDStatus(
      toNumber(row.battery_level),
    ) === "Unsafe"
  );
}

export function formatNumber(
  value: number,
  decimals = 1,
): string {
  return value.toFixed(decimals);
}

/* ============================================================
   DATE HELPERS
   ============================================================ */

export function formatDateLabel(
  date: Date,
  frequency: ChartFrequency,
): string {
  if (frequency === "Monthly") {
    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
      },
    );
  }

  if (frequency === "Yearly") {
    return date
      .getFullYear()
      .toString();
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  );
}

export function formatReportDate(
  date: Date,
): string {
  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

export function formatReportDateTime(
  date: Date,
): string {
  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

export function getDateKey(
  date: Date,
  frequency: ChartFrequency,
): string {
  if (frequency === "Daily") {
    return [
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ].join("-");
  }

  if (frequency === "Weekly") {
    const copy = new Date(date);

    const day =
      copy.getDay();

    const difference =
      day === 0
        ? -6
        : 1 - day;

    copy.setDate(
      copy.getDate() +
        difference,
    );

    return [
      copy.getFullYear(),
      copy.getMonth(),
      copy.getDate(),
    ].join("-");
  }

  if (frequency === "Yearly") {
    return date
      .getFullYear()
      .toString();
  }

  return [
    date.getFullYear(),
    date.getMonth(),
  ].join("-");
}

export function getBucketDate(
  date: Date,
  frequency: ChartFrequency,
): Date {
  const result =
    new Date(date);

  if (frequency === "Daily") {
    result.setHours(
      0,
      0,
      0,
      0,
    );

    return result;
  }

  if (frequency === "Weekly") {
    const day =
      result.getDay();

    const difference =
      day === 0
        ? -6
        : 1 - day;

    result.setDate(
      result.getDate() +
        difference,
    );

    result.setHours(
      0,
      0,
      0,
      0,
    );

    return result;
  }

  if (frequency === "Yearly") {
    result.setMonth(
      0,
      1,
    );

    result.setDate(1);

    result.setHours(
      0,
      0,
      0,
      0,
    );

    return result;
  }

  result.setDate(1);

  result.setHours(
    0,
    0,
    0,
    0,
  );

  return result;
}

export function getNextBucketDate(
  date: Date,
  frequency: ChartFrequency,
): Date {
  const result =
    new Date(date);

  if (frequency === "Daily") {
    result.setDate(
      result.getDate() + 1,
    );
  } else if (
    frequency === "Weekly"
  ) {
    result.setDate(
      result.getDate() + 7,
    );
  } else if (
    frequency === "Monthly"
  ) {
    result.setMonth(
      result.getMonth() + 1,
    );
  } else {
    result.setFullYear(
      result.getFullYear() + 1,
    );
  }

  return result;
}

export function getDefaultRange():
  AnalyticsRange {
  const end =
    new Date();

  const start =
    new Date(end);

  start.setDate(
    start.getDate() -
      DEFAULT_DAYS,
  );

  return {
    start,
    end,
  };
}

export function getAnalyticsDayAnchor(
  date: Date,
): Date {
  const anchor = new Date(date);
  anchor.setHours(0, 0, 0, 0);
  return anchor;
}

export function createFrequencyRange(
  frequency: ChartFrequency,
  now: Date = new Date(),
): AnalyticsRange {
  const end =
    new Date(now);

  const start =
    new Date(end);

  start.setDate(
    start.getDate() -
      ANALYTICS_RANGE_DAYS[
        frequency
      ],
  );

  return {
    start,
    end,
  };
}

export function filterMonitoringHistoryByRange(
  monitoringHistory: MonitoringHistoryRow[],
  range: AnalyticsRange,
): MonitoringHistoryRow[] {
  const start = range.start.getTime();
  const end = getInclusiveRangeEnd(range).getTime();

  return monitoringHistory.filter((row) => {
    const recorded = new Date(
      row.recorded_at,
    ).getTime();

    return (
      Number.isFinite(recorded) &&
      recorded >= start &&
      recorded <= end
    );
  });
}

export function formatAnalyticsBucketLabel(
  date: Date,
  frequency: ChartFrequency,
): string {
  return formatDateLabel(
    date,
    frequency,
  );
}

export function groupMonitoringHistoryForAnalytics(
  monitoringHistory: MonitoringHistoryRow[],
  frequency: ChartFrequency,
): MonitoringBucket[] {
  return groupMonitoringHistory(
    monitoringHistory,
    ANALYTICS_BUCKET_FREQUENCIES[
      frequency
    ],
  );
}

function formatChargeStartTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function findChargeStart(
  rows: MonitoringHistoryRow[],
): string | null {
  let wasCharging = false;

  const ordered = [...rows].sort(
    (a, b) =>
      new Date(
        a.recorded_at,
      ).getTime() -
      new Date(
        b.recorded_at,
      ).getTime(),
  );

  for (const row of ordered) {
    const charging =
      String(
        row.battery_status ?? "",
      )
        .toLowerCase()
        .includes("charg");

    if (charging && !wasCharging) {
      return row.recorded_at;
    }

    wasCharging = charging;
  }

  return null;
}

export function buildAnalyticsCardData(
  monitoringHistory: MonitoringHistoryRow[],
  frequency: ChartFrequency,
  range: AnalyticsRange,
): AnalyticsCardData {
  const buckets =
    groupMonitoringHistoryForAnalytics(
      monitoringHistory,
      frequency,
    );

  const solar: SolarAnalyticsPoint[] =
    buckets.map((bucket) => {
      const onlineRows =
        getOnlineRows(bucket.rows);

      const solarInputs =
        finiteNonNegativeValues(
          onlineRows.map((row) =>
            row.solar_input,
          ),
        );

      const solarInputW =
        average(solarInputs);

      const peakHours =
        onlineRows.reduce(
          (peak, row) =>
            Math.max(
              peak,
              parseSolarTimerHours(
                row.solar_timer,
              ),
            ),
          0,
        );

      const chargeStart =
        findChargeStart(bucket.rows);

      const energyWh = bucket.rows.reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            toNumber(
              row.energy_input_wh,
            ),
          ),
        0,
      );

      const peakW = maximum(solarInputs);

      const label =
        formatAnalyticsBucketLabel(
          bucket.date,
          frequency,
        );

      return {
        label,
        value: solarInputW,
        energyWh,
        solarInputW,
        peakW,
        peakHours,
        chargeStart:
          chargeStart
            ? formatChargeStartTime(
                chargeStart,
              )
            : null,
      };
    });

  const load: LoadAnalyticsPoint[] =
    buckets.map((bucket) => {
      const onlineRows =
        getOnlineRows(bucket.rows);

      const energyWh = bucket.rows.reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            toNumber(
              row.energy_output_wh,
            ),
          ),
        0,
      );

      const loads =
        finiteNonNegativeValues(
          onlineRows.map((row) =>
            row.current_load,
          ),
        );

      const avgW = average(loads);

      const avgVoltage = average(
        finiteNonNegativeValues(
          onlineRows.map((row) =>
            row.voltage,
          ),
        ),
      );

      const label =
        formatAnalyticsBucketLabel(
          bucket.date,
          frequency,
        );

      return {
        label,
        value: avgW,
        energyWh,
        avgW,
        peakW: maximum(loads),
        avgVoltage,
      };
    });

  return {
    frequency,
    range,
    solar,
    load,
    activity: getBatteryActivityData(buckets),
  };
}

export function buildReportSections(
  data: AnalyticsCardData,
): AnalyticsReportSection[] {
  return [
    {
      key: "solar",
      title: "SOLAR ENERGY",
      headers: [
        "Period",
        "Energy Collected (Wh)",
        "Peak Output (W)",
        "Peak Sun (h)",
        "Charge Start",
      ],
      rows: data.solar.map((point) => [
        point.label,
        formatNumber(point.energyWh),
        formatNumber(point.peakW),
        formatNumber(point.peakHours),
        point.chargeStart ?? "—",
      ]),
    },
    {
      key: "load",
      title: "LOAD ENERGY",
      headers: [
        "Period",
        "Energy Used (Wh)",
        "Average Load (W)",
        "Peak Load (W)",
      ],
      rows: data.load.map((point) => [
        point.label,
        formatNumber(point.energyWh),
        formatNumber(point.avgW),
        formatNumber(point.peakW),
      ]),
    },
    {
      key: "activity",
      title: "BATTERY ACTIVITY",
      headers: ["Activity", "Samples", "Share (%)"],
      rows: data.activity.map((slice) => [
        slice.label,
        slice.value,
        `${slice.percent}%`,
      ]),
    },
    {
      key: "report",
      title: "GENERATE REPORT",
      headers: ["Field", "Value"],
      rows: [
        ["Frequency", data.frequency],
        ["From Date", formatReportDate(data.range.start)],
        ["To Date", formatReportDate(data.range.end)],
      ],
    },
  ];
}

/*
 * Returns a Date set to the very end of the range's To date so
 * a selected date period includes all of its final day.
 *
 * The AnalyticsCard date range feature produces midnight-anchored
 * From/To dates, so a raw `lte(end.toISOString())` query would
 * silently drop every record recorded after midnight on the To
 * date. Both the exported PDF/CSV and the charts share the same
 * loaded data, so this keeps every report period inclusive.
 */
export function getInclusiveRangeEnd(
  range: AnalyticsRange,
): Date {
  const end =
    new Date(
      range.end,
    );

  end.setHours(
    23,
    59,
    59,
    999,
  );

  return end;
}

/* ============================================================
   CSV AND REPORT DATA PROCESSING
   ============================================================ */

export function escapeCsvValue(
  value: unknown,
): string {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(
      /"/g,
      '""',
    )}"`;
  }

  return text;
}

/* ============================================================
   REPORT ROW FORMATTING
   ============================================================ */

export function formatMonitoringReportRows(
  rows: MonitoringHistoryRow[],
): ReportMonitoringRow[] {
  return rows.map(
    (row) => ({
      recordedAt:
        formatReportDateTime(
          new Date(
            row.recorded_at,
          ),
        ),

      batteryLevel:
        formatNumber(
          clamp(
            toNumber(
              row.battery_level,
            ),
            0,
            100,
          ),
        ),

      batteryStatus:
        row.battery_status ??
        "Unknown",

      dodStatus:
        row.dod_status ??
        "Unknown",

      timeRemaining:
        row.time_remaining ??
        "N/A",

      solarInput:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.solar_input,
            ),
          ),
        ),

      solarStatus:
        row.solar_status ??
        "Unknown",

      solarTimer:
        formatSolarTimer(
          row.solar_timer,
        ),

      solarVoltage:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.solar_voltage,
            ),
          ),
        ),

      solarCurrent:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.solar_current,
            ),
          ),
        ),

      totalEnergy:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.total_energy,
            ),
          ),
        ),

      currentLoad:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.current_load,
            ),
          ),
        ),

      deviceStatus:
        row.device_status ??
        "Unknown",

      lastSeen: row.last_seen
        ? formatReportDateTime(
            new Date(row.last_seen),
          )
        : "N/A",

      solarTemperature:
        formatNumber(
          toNumber(
            row.solar_temperature,
          ),
        ),

      solarTemperatureStatus:
        row.solar_temperature_status ??
        "Unknown",

      interiorTemp:
        formatNumber(
          toNumber(
            row.interior_temp,
          ),
        ),

      interiorTempStatus:
        row.interior_temp_status ??
        "Unknown",

      voltage:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.voltage,
            ),
          ),
        ),

      wattHours:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.watt_hours,
            ),
          ),
        ),

      energyInputWh:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.energy_input_wh,
            ),
          ),
        ),

      energyOutputWh:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.energy_output_wh,
            ),
          ),
        ),

      cumulativeEnergyInputWh:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.cumulative_energy_input_wh,
            ),
          ),
        ),

      cumulativeEnergyOutputWh:
        formatNumber(
          Math.max(
            0,
            toNumber(
              row.cumulative_energy_output_wh,
            ),
          ),
        ),
    }),
  );
}

/* ============================================================
   REPORT SUMMARY
   ============================================================ */

function getLatestMonitoringRow(
  rows: MonitoringHistoryRow[],
): MonitoringHistoryRow | null {
  if (rows.length === 0) {
    return null;
  }

  return rows.reduce(
    (
      latest,
      current,
    ) => {
      const latestTime =
        new Date(
          latest.recorded_at,
        ).getTime();

      const currentTime =
        new Date(
          current.recorded_at,
        ).getTime();

      return currentTime >
        latestTime
        ? current
        : latest;
    },
  );
}

export function createReportSummary(
  monitoringHistory: MonitoringHistoryRow[],
): ReportSummary {
  const onlineHistory =
    getOnlineRows(
      monitoringHistory,
    );

  const batteryLevels =
    onlineHistory.map(
      (row) =>
        clamp(
          toNumber(
            row.battery_level,
          ),
          0,
          100,
        ),
    );

  const solarInputs =
    onlineHistory.map(
      (row) =>
        Math.max(
          0,
          toNumber(
            row.solar_input,
          ),
        ),
    );

  const currentLoads =
    onlineHistory.map(
      (row) =>
        Math.max(
          0,
          toNumber(
            row.current_load,
          ),
        ),
    );

  const solarTemperatures =
    onlineHistory.map(
      (row) =>
        toNumber(
          row.solar_temperature,
        ),
    );

  const totalEnergyInputWh =
    monitoringHistory.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          toNumber(
            row.energy_input_wh,
          ),
        ),
      0,
    );

  const totalEnergyOutputWh =
    monitoringHistory.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          toNumber(
            row.energy_output_wh,
          ),
        ),
      0,
    );

  const latest =
    getLatestMonitoringRow(
      monitoringHistory,
    );

  return {
    sampleCount:
      monitoringHistory.length,

    averageBatteryLevel:
      average(
        batteryLevels,
      ),

    minimumBatteryLevel:
      minimum(
        batteryLevels,
      ),

    maximumBatteryLevel:
      maximum(
        batteryLevels,
      ),

    averageSolarInput:
      average(
        solarInputs,
      ),

    maximumSolarInput:
      maximum(
        solarInputs,
      ),

    averageCurrentLoad:
      average(
        currentLoads,
      ),

    maximumCurrentLoad:
      maximum(
        currentLoads,
      ),

    averageSolarTemperature:
      average(
        solarTemperatures,
      ),

    maximumSolarTemperature:
      maximum(
        solarTemperatures,
      ),

    totalEnergyInputWh,

    totalEnergyOutputWh,

    latestBatteryLevel:
      latest
        ? clamp(
            toNumber(
              latest.battery_level,
            ),
            0,
            100,
          )
        : 0,

    latestBatteryStatus:
      latest?.battery_status ??
      "No data",

    latestSolarInput:
      latest
        ? Math.max(
            0,
            toNumber(
              latest.solar_input,
            ),
          )
        : 0,

    latestSolarStatus:
      latest?.solar_status ??
      "No data",

    latestCurrentLoad:
      latest
        ? Math.max(
            0,
            toNumber(
              latest.current_load,
            ),
          )
        : 0,

    latestSolarTemperature:
      latest
        ? toNumber(
            latest.solar_temperature,
          )
        : 0,

    latestSolarTemperatureStatus:
      latest?.solar_temperature_status ??
      "No data",

    latestSolarTimer:
      formatSolarTimer(
        latest?.solar_timer ??
          null,
      ),

    latestSolarVoltage:
      latest
        ? Math.max(
            0,
            toNumber(
              latest.solar_voltage,
            ),
          )
        : 0,

    latestSolarCurrent:
      latest
        ? Math.max(
            0,
            toNumber(
              latest.solar_current,
            ),
          )
        : 0,

    latestTotalEnergy:
      latest
        ? Math.max(
            0,
            toNumber(
              latest.total_energy,
            ),
          )
        : 0,

    latestDeviceStatus:
      latest?.device_status ??
      "No data",

    latestTimeRemaining:
      latest?.time_remaining ??
      "No data",
  };
}

/* ============================================================
   REPORT DATA PREPARATION
   ============================================================ */

/*
 * Chart-aligned period aggregates. Delegates to the SAME helper
 * functions the analytics cards use, so the report cannot show a
 * different number than the chart for the same bucket. Arrays
 * come back index-aligned with `buckets`, so zipping is safe.
 */
export function buildReportPeriods(
  monitoringHistory: MonitoringHistoryRow[],
  reportFrequency: ReportFrequency,
): ReportPeriodRow[] {
  const buckets = groupMonitoringHistory(
    monitoringHistory,
    reportFrequency,
  );

  if (buckets.length === 0) {
    return [];
  }

  const battery = getBatteryChartRangeData(
    buckets,
    reportFrequency,
  );

  const solar = getSolarChartData(
    buckets,
    reportFrequency,
  );

  const peakSolar = getBestSunDaysData(
    buckets,
    reportFrequency,
  );

  const energyInput = getEnergyInputChartData(
    buckets,
    reportFrequency,
  );

  const energyOutput =
    getEnergyOutputChartData(
      buckets,
      reportFrequency,
    );

  const netEnergy = getNetEnergyData(
    buckets,
    reportFrequency,
  );

  const runningBalance =
    getRunningBalanceData(
      buckets,
      reportFrequency,
    );

  const solarCoverage = getSolarCoverageData(
    buckets,
    reportFrequency,
  );

  const load = getLoadVsPeakData(
    buckets,
    reportFrequency,
  );

  const uptime = getUptimeData(
    buckets,
    reportFrequency,
  );

  const unsafe = getUnsafeDischargeChartData(
    buckets,
    reportFrequency,
  );

  const alerts = getTemperatureAlertsData(
    buckets,
    reportFrequency,
  );

  const sunHours = getSunHoursData(
    buckets,
    reportFrequency,
  );

  const solarTemperature =
    getSolarTemperatureData(
      buckets,
      reportFrequency,
    );

  return buckets.map((bucket, index) => ({
    periodLabel: formatDateLabel(
      bucket.date,
      reportFrequency,
    ),
    sampleCount: bucket.rows.length,

    avgBatteryLevel: battery[index]?.value ?? 0,
    minBatteryLevel: battery[index]?.min ?? 0,
    maxBatteryLevel: battery[index]?.max ?? 0,

    avgSolarInput: solar[index]?.value ?? 0,
    maxSolarInput: peakSolar[index]?.value ?? 0,

    energyInputWh: energyInput[index]?.value ?? 0,
    energyOutputWh:
      energyOutput[index]?.value ?? 0,
    netEnergyWh: netEnergy[index]?.value ?? 0,
    runningBalanceWh:
      runningBalance[index]?.value ?? 0,
    solarCoveragePct:
      solarCoverage[index]?.value ?? 0,

    avgLoadW: load[index]?.avg ?? 0,
    peakLoadW: load[index]?.peak ?? 0,

    uptimePct: uptime[index]?.value ?? 0,
    unsafeSampleCount:
      unsafe[index]?.value ?? 0,
    temperatureAlertCount:
      alerts[index]?.value ?? 0,
    sunHours: sunHours[index]?.value ?? 0,

    avgSolarTemperature:
      solarTemperature[index]?.value ?? 0,
  }));
}

/*
 * Derived range-level KPIs. Everything here is reducible from
 * the raw rows + summary, and matches the analytics definitions
 * (CAUTION_SOC for unsafe, "Online" for uptime, High/Critical
 * for temperature alerts, per-day max solar_timer for sun hours).
 */
export function buildReportKpis(
  monitoringHistory: MonitoringHistoryRow[],
  summary: ReportSummary,
): ReportKpi[] {
  const sampleCount = monitoringHistory.length;

  let totalInputWh = 0;
  let totalOutputWh = 0;
  let onlineSamples = 0;
  let unsafeSamples = 0;
  let alertSamples = 0;
  let peakLoadW = 0;

  // Per-day reductions for the "best sun day" + sun-hours KPIs.
  const sunHoursByDay = new Map<string, number>();
  const peakSolarByDay = new Map<string, number>();

  monitoringHistory.forEach((row) => {
    totalInputWh += Math.max(
      0,
      toNumber(row.energy_input_wh),
    );

    totalOutputWh += Math.max(
      0,
      toNumber(row.energy_output_wh),
    );

    if (row.device_status !== "Online") {
      return;
    }

    onlineSamples += 1;

    if (isUnsafeDischarge(row)) {
      unsafeSamples += 1;
    }

    if (
      ALERT_TEMPERATURE_STATUSES.has(
        String(
          row.solar_temperature_status ??
            "",
        ),
      ) ||
      ALERT_TEMPERATURE_STATUSES.has(
        String(
          row.interior_temp_status ??
            "",
        ),
      )
    ) {
      alertSamples += 1;
    }

    peakLoadW = Math.max(
      peakLoadW,
      Math.max(
        0,
        toNumber(row.current_load),
      ),
    );

    const dayKey = String(
      row.recorded_at ?? "",
    ).slice(0, 10);

    if (!dayKey) {
      return;
    }

    const sunHours =
      parseSolarTimerHours(row.solar_timer);

    sunHoursByDay.set(
      dayKey,
      Math.max(
        sunHoursByDay.get(dayKey) ?? 0,
        sunHours,
      ),
    );

    peakSolarByDay.set(
      dayKey,
      Math.max(
        peakSolarByDay.get(dayKey) ?? 0,
        Math.max(
          0,
          toNumber(row.solar_input),
        ),
      ),
    );
  });

  const totalSunHours = Array.from(
    sunHoursByDay.values(),
  ).reduce((sum, hours) => sum + hours, 0);

  let bestSunDayKey = "";
  let bestSunDayPeak = 0;

  peakSolarByDay.forEach((peak, dayKey) => {
    if (peak > bestSunDayPeak) {
      bestSunDayPeak = peak;
      bestSunDayKey = dayKey;
    }
  });

  const netEnergyWh =
    totalInputWh - totalOutputWh;

  const solarCoveragePct =
    totalOutputWh > 0
      ? Math.max(
          0,
          (totalInputWh / totalOutputWh) *
            100,
        )
      : 0;

  const uptimePct =
    sampleCount > 0
      ? (onlineSamples / sampleCount) * 100
      : 0;

  const unsafePct =
    sampleCount > 0
      ? (unsafeSamples / sampleCount) * 100
      : 0;

  return [
    {
      key: "samples",
      label: "Samples analysed",
      value: String(sampleCount),
    },
    {
      key: "avgBatteryLevel",
      label: "Average battery level",
      value: formatNumber(
        summary.averageBatteryLevel,
      ),
      unit: "%",
    },
    {
      key: "minBatteryLevel",
      label: "Lowest battery level",
      value: formatNumber(
        summary.minimumBatteryLevel,
      ),
      unit: "%",
    },
    {
      key: "unsafeDischarge",
      label: "Unsafe discharge samples",
      value: String(unsafeSamples),
      unit: "% of samples",
      hint: `${formatNumber(
        unsafePct,
      )}% of samples`,
    },
    {
      key: "energyInput",
      label: "Total energy in",
      value: formatNumber(totalInputWh),
      unit: "Wh",
    },
    {
      key: "energyOutput",
      label: "Total energy out",
      value: formatNumber(totalOutputWh),
      unit: "Wh",
    },
    {
      key: "netEnergy",
      label: "Net energy",
      value: formatNumber(netEnergyWh),
      unit: "Wh",
    },
    {
      key: "solarCoverage",
      label: "Solar coverage",
      value: formatNumber(
        solarCoveragePct,
      ),
      unit: "%",
    },
    {
      key: "uptime",
      label: "Device uptime",
      value: formatNumber(uptimePct),
      unit: "%",
    },
    {
      key: "temperatureAlerts",
      label: "Temperature alerts",
      value: String(alertSamples),
      unit: "samples",
    },
    {
      key: "sunHours",
      label: "Total sun hours",
      value: formatNumber(totalSunHours),
      unit: "h",
    },
    {
      key: "bestSunDay",
      label: "Best sun day",
      value: bestSunDayKey || "N/A",
      hint: bestSunDayKey
        ? `peak ${formatNumber(
            bestSunDayPeak,
          )} W`
        : undefined,
    },
    {
      key: "peakLoad",
      label: "Peak load",
      value: formatNumber(peakLoadW),
      unit: "W",
    },
  ];
}

export function prepareReportData(
  monitoringHistory: MonitoringHistoryRow[],
  reportFrequency: ReportFrequency,
  range: AnalyticsRange,
): AnalyticsReportData {
  const monitoringRows =
    formatMonitoringReportRows(
      monitoringHistory,
    );

  const summary =
    createReportSummary(
      monitoringHistory,
    );

  const periods = buildReportPeriods(
    monitoringHistory,
    reportFrequency,
  );

  const kpis = buildReportKpis(
    monitoringHistory,
    summary,
  );

  const cardData =
    buildAnalyticsCardData(
      monitoringHistory,
      reportFrequency,
      range,
    );

  const sections =
    buildReportSections(cardData);

  return {
    frequency:
      reportFrequency,

    range,

    monitoringHistory,

    monitoringRows,

    periods,

    summary,

    kpis,

    sections,

    reportTitle:
      "AdlaWatt Analytics Report",

    reportSubtitle:
      `${reportFrequency} report from ${formatReportDate(
        range.start,
      )} to ${formatReportDate(
        range.end,
      )}`,
  };
}

/* ============================================================
   DURATION PROCESSING
   ============================================================ */

export function formatDuration(
  seconds: number,
): string {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0h 0m";
  }

  const hours =
    Math.floor(
      seconds / 3600,
    );

  const minutes =
    Math.floor(
      (seconds % 3600) /
        60,
    );

  return `${hours}h ${minutes}m`;
}

/* ============================================================
   SOLAR TIMER FORMATTER
   ============================================================ */

export function formatSolarTimer(
  timer: string | null,
): string {
  const value =
    String(timer ?? "")
      .trim();

  if (!value) {
    return "00:00:00";
  }

  // PostgreSQL interval values can be returned as
  // HH:MM:SS, H:MM:SS, or values containing days.

  const dayMatch =
    value.match(
      /(-?\d+)\s+days?/i,
    );

  const timeMatch =
    value.match(
      /(\d{1,3}):(\d{2}):(\d{2})/,
    );

  if (timeMatch) {
    const days = dayMatch
      ? Number(dayMatch[1])
      : 0;

    const hours =
      Number(timeMatch[1]) +
      days * 24;

    const minutes =
      Number(timeMatch[2]);

    const seconds =
      Number(timeMatch[3]);

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");
  }

  return value;
}

/* ============================================================
   SUPABASE ANALYTICS DATA LOADING
   ============================================================ */


   
export async function loadAnalyticsData(
  range: AnalyticsRange,
): Promise<{
  monitoringHistory: MonitoringHistoryRow[];
}> {
  try {
    const user = await getAuthenticatedUserSafe();

    if (!user) {
      return {
        monitoringHistory: [],
      };
    }

    // Paginated fetch: without paging, the server caps a
    // single response and the chart silently truncates to the
    // oldest rows. Pages walk newest-first so the row cap keeps
    // the latest window, then reverse back to ascending order
    // (charts and the report assume chronological rows).
    const monitoringRows: unknown[] = [];

    for (
      let pageStart = 0;
      pageStart < ANALYTICS_MAX_ROWS;
      pageStart += ANALYTICS_PAGE_SIZE
    ) {
      let monitoringPage: unknown[] = [];
      let monitoringError: {
        message: string;
      } | null = null;

      try {
        const page = await withTimeout(
          supabase
            .from(
              "monitoring_history",
            )
            .select(
              [
                "recorded_at",
                "battery_level",
                "battery_status",
                "time_remaining",
                "solar_input",
                "solar_status",
                "solar_timer",
                "solar_voltage",
                "solar_current",
                "total_energy",
                "current_load",
                "device_status",
                "last_seen",
                "dod_status",
                "solar_temperature",
                "solar_temperature_status",
                "interior_temp",
                "interior_temp_status",
                "voltage",
                "watt_hours",
                "cumulative_energy_input_wh",
                "cumulative_energy_output_wh",
                "energy_input_wh",
                "energy_output_wh",
              ].join(","),
            )
            .eq(
              "user_id",
              user.id,
            )
            .gte(
              "recorded_at",
              range.start.toISOString(),
            )
            .lte(
              "recorded_at",
              getInclusiveRangeEnd(
                range,
              ).toISOString(),
            )
            .order(
              "recorded_at",
              {
                ascending: false,
              },
            )
            .range(
              pageStart,
              pageStart + ANALYTICS_PAGE_SIZE - 1,
            ),
          undefined,
          "Analytics history request timed out.",
        );

        monitoringPage = (page.data ??
          []) as unknown[];
        monitoringError = page.error;
      } catch (error) {
        // Timeout / transport failure: keep the pages already
        // collected instead of blanking the whole screen.
        console.error(
          "Analytics monitoring history error:",
          error instanceof Error
            ? error.message
            : error,
        );

        break;
      }

      if (monitoringError) {
        console.error(
          "Analytics monitoring history error:",
          monitoringError.message,
        );

        break;
      }

      monitoringRows.push(
        ...monitoringPage,
      );

      if (
        monitoringPage.length <
        ANALYTICS_PAGE_SIZE
      ) {
        break;
      }
    }

    if (
      monitoringRows.length >=
      ANALYTICS_MAX_ROWS
    ) {
      console.warn(
        `[analytics] History capped at ${ANALYTICS_MAX_ROWS} recent rows for this range.`,
      );
    }

    monitoringRows.reverse();

    return {
      monitoringHistory:
        (monitoringRows ??
          []) as unknown as MonitoringHistoryRow[],
    };
  } catch (error) {
    console.error(
      "Analytics load error:",
      error,
    );

    return {
      monitoringHistory: [],
    };
  }

  
}

/* ============================================================
   MONITORING HISTORY GROUPING
   ============================================================ */

export function groupMonitoringHistory(
  monitoringHistory: MonitoringHistoryRow[],
  chartFrequency: ChartFrequency,
): MonitoringBucket[] {
  const buckets =
    new Map<
      string,
      MonitoringHistoryRow[]
    >();

  monitoringHistory.forEach(
    (row) => {
      const date =
        new Date(
          row.recorded_at,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return;
      }

      const key =
        getDateKey(
          date,
          chartFrequency,
        );

      const current =
        buckets.get(key) ??
        [];

      current.push(row);

      buckets.set(
        key,
        current,
      );
    },
  );

  return Array.from(
    buckets.entries(),
  )
    .map(
      ([
        key,
        rows,
      ]) => {
        const date =
          getBucketDate(
            new Date(
              rows[0].recorded_at,
            ),
            chartFrequency,
          );

        return {
          key,
          date,
          rows,
        };
      },
    )
    .sort(
      (a, b) =>
        a.date.getTime() -
        b.date.getTime(),
    );
}

/* ============================================================
   MONITORING CHART DATA PROCESSING
   ============================================================ */

export interface BatteryRangePoint {
  value: number;
  min: number;
  max: number;
  label?: string;
}

export interface UnsafeBarPoint {
  value: number;
  label: string;
}

export type BatteryActivityKey =
  | "charging"
  | "discharging"
  | "cycle"
  | "idle";

export interface BatteryActivitySlice {
  key: BatteryActivityKey;
  label: string;
  value: number;
  percent: number;
}

export function getBatteryActivityData(
  groupedMonitoring: MonitoringBucket[],
): BatteryActivitySlice[] {
  let charging = 0;
  let discharging = 0;
  let cycle = 0;
  let idle = 0;

  groupedMonitoring.forEach(
    (bucket) => {
      getOnlineRows(bucket.rows).forEach(
        (row) => {
          const status =
            String(
              row.battery_status ??
                "",
            )
              .trim()
              .toLowerCase();

          if (
            status === "charging"
          ) {
            charging += 1;
          } else if (
            status ===
            "discharging"
          ) {
            discharging += 1;
          } else if (
            status === "cycle"
          ) {
            cycle += 1;
          } else if (
            status === "idle"
          ) {
            idle += 1;
          }
        },
      );
    },
  );

  const total =
    charging +
    discharging +
    cycle +
    idle;

  const toPercent = (
    count: number,
  ): number =>
    total > 0
      ? Math.round(
          (count / total) *
            100,
        )
      : 0;

  return [
    {
      key: "charging",
      label: "Charging",
      value: charging,
      percent:
        toPercent(charging),
    },
    {
      key: "discharging",
      label: "Discharging",
      value: discharging,
      percent: toPercent(
        discharging,
      ),
    },
    {
      key: "cycle",
      label: "Cycle",
      value: cycle,
      percent: toPercent(cycle),
    },
    {
      key: "idle",
      label: "Idle",
      value: idle,
      percent: toPercent(idle),
    },
  ];
}

export function getBatteryChartRangeData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): BatteryRangePoint[] {
  return groupedMonitoring.map(
    (bucket) => {
      const levels =
        getOnlineRows(
          bucket.rows,
        ).map(
          (row) =>
            toNumber(
              row.battery_level,
            ),
        );

      return {
        value: clamp(
          average(levels),
          0,
          100,
        ),
        min: clamp(
          minimum(levels),
          0,
          100,
        ),
        max: clamp(
          maximum(levels),
          0,
          100,
        ),
        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

export function getUnsafeDischargeChartData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): UnsafeBarPoint[] {
  return groupedMonitoring.map(
    (bucket) => {
      const unsafeCount =
        getOnlineRows(bucket.rows)
          .filter(isUnsafeDischarge)
          .length;

      return {
        value: unsafeCount,
        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

export function getSolarChartData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value: Math.max(
        0,
        average(
          getOnlineRows(
            bucket.rows,
          ).map(
            (row) =>
              toNumber(
                row.solar_input,
              ),
          ),
        ),
      ),

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

export function getEnergyInputChartData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value: Math.max(
        0,
        bucket.rows.reduce(
          (
            sum,
            row,
          ) =>
            sum +
            toNumber(
              row.energy_input_wh,
            ),
          0,
        ),
      ),

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

export function getEnergyOutputChartData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value: Math.max(
        0,
        bucket.rows.reduce(
          (
            sum,
            row,
          ) =>
            sum +
            toNumber(
              row.energy_output_wh,
            ),
          0,
        ),
      ),

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

/* ============================================================
   ENERGY SECTION CHART DATA
   Pure app-side math over the per-bucket energy sums.
   No SQL changes.
   ============================================================ */

/*
 * Net energy: input minus output per bucket (signed —
 * positive is surplus, negative is deficit).
 */
export function getNetEnergyData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => {
      const input = bucket.rows.reduce(
        (sum, row) => sum + toNumber(row.energy_input_wh),
        0,
      );

      const output = bucket.rows.reduce(
        (sum, row) => sum + toNumber(row.energy_output_wh),
        0,
      );

      return {
        value: input - output,

        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

/*
 * Running balance: cumulative net energy across buckets in
 * range order — whether stored energy grows or shrinks.
 */
export function getRunningBalanceData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  let running = 0;

  return groupedMonitoring.map(
    (bucket) => {
      const input = bucket.rows.reduce(
        (sum, row) => sum + toNumber(row.energy_input_wh),
        0,
      );

      const output = bucket.rows.reduce(
        (sum, row) => sum + toNumber(row.energy_output_wh),
        0,
      );

      running += input - output;

      return {
        value: running,

        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

/*
 * Solar coverage: input / output x 100 per bucket — percent of
 * use the sun covered. Zero-output buckets yield 0 (never
 * divide by zero); over-100 values are kept (surplus shows).
 */
export function getSolarCoverageData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => {
      const input = bucket.rows.reduce(
        (sum, row) => sum + toNumber(row.energy_input_wh),
        0,
      );

      const output = bucket.rows.reduce(
        (sum, row) => sum + toNumber(row.energy_output_wh),
        0,
      );

      return {
        value:
          output > 0
            ? Math.max(0, (input / output) * 100)
            : 0,

        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

export function getSolarTemperatureData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value:
        average(
          getOnlineRows(
            bucket.rows,
          ).map(
            (row) =>
              toNumber(
                row.solar_temperature,
              ),
          ),
        ),

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

/*
 * Interior temperature: per-bucket average of interior_temp.
 * Rows predate the v8 column as NULL — toNumber maps those to 0,
 * so callers must check finiteness against the raw field, not
 * this average. See TemperaturesChart for the gap discipline.
 */
export function getInteriorTemperatureData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => {
      const samples = getOnlineRows(
        bucket.rows,
      )
        .map((row) => row.interior_temp)
        .filter(
          (value): value is number =>
            typeof value === "number" &&
            Number.isFinite(value),
        );

      return {
        value:
          samples.length > 0
            ? average(samples)
            : Number.NaN,

        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

/* ============================================================
   LIVE-SYSTEM CHART DATA PROCESSING
   ============================================================ */

export function getLoadChartData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value: Math.max(
        0,
        average(
          getOnlineRows(
            bucket.rows,
          ).map(
            (row) =>
              toNumber(
                row.current_load,
              ),
          ),
        ),
      ),

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

export function getVoltageChartData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value: average(
        getOnlineRows(
          bucket.rows,
        ).map(
          (row) =>
            toNumber(
              row.voltage,
            ),
        ),
      ),

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

/* ============================================================
   SOLAR SECTION CHART DATA
   No SQL changes: everything derives from monitoring_history
   rows already loaded for the range.
   ============================================================ */

export interface SolarVsLoadPoint {
  solar: number;
  load: number;
  label?: string;
}

/*
 * Solar vs load: paired per-bucket averages in one pass so the
 * two series can never misalign.
 */
export function getSolarVsLoadData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): SolarVsLoadPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      solar: Math.max(
        0,
        average(
          getOnlineRows(
            bucket.rows,
          ).map(
            (row) =>
              toNumber(
                row.solar_input,
              ),
          ),
        ),
      ),

      load: Math.max(
        0,
        average(
          getOnlineRows(
            bucket.rows,
          ).map(
            (row) =>
              toNumber(
                row.current_load,
              ),
          ),
        ),
      ),

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

/*
 * Best sun days: peak panel output per bucket.
 */
export function getBestSunDaysData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value: Math.max(
        0,
        maximum(
          getOnlineRows(
            bucket.rows,
          ).map(
            (row) =>
              toNumber(
                row.solar_input,
              ),
          ),
        ),
      ),

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

/*
 * Parse the device-reported solar_timer interval
 * (Postgres format: HH:MM:SS, H:MM:SS, or "N days HH:MM:SS")
 * into hours. Unparseable values contribute 0.
 */
export function parseSolarTimerHours(
  value: unknown,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0
      ? value / 3600
      : 0;
  }

  const text = String(value ?? "").trim();

  if (!text) {
    return 0;
  }

  const dayMatch = text.match(/(-?\d+)\s+days?/i);
  const days = dayMatch ? Math.max(0, Number(dayMatch[1])) : 0;

  const timeMatch = text.match(/(\d{1,3}):(\d{2}):(\d{2})/);

  if (!timeMatch) {
    return days * 24;
  }

  const hours =
    days * 24 +
    Number(timeMatch[1]) +
    Number(timeMatch[2]) / 60 +
    Number(timeMatch[3]) / 3600;

  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

/*
 * Sun hours: the device reports elapsed producing time in
 * solar_timer. Take the per-day max inside each bucket and sum,
 * so Daily reads the day's timer while Weekly/Monthly totals
 * stay correct. Assumption: solar_timer counts up while the
 * panel produces. If the device ever reports it as a countdown,
 * only this helper changes.
 */
export function getSunHoursData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => {
      const byDay = new Map<string, number>();

      getOnlineRows(
        bucket.rows,
      ).forEach((row) => {
        const dayKey = String(
          row.recorded_at ?? "",
        ).slice(0, 10);

        if (!dayKey) {
          return;
        }

        const hours = parseSolarTimerHours(row.solar_timer);

        byDay.set(
          dayKey,
          Math.max(byDay.get(dayKey) ?? 0, hours),
        );
      });

      let total = 0;

      byDay.forEach((hours) => {
        total += hours;
      });

      return {
        value: Math.max(0, total),

        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

const HOUR_LABELS = [
  "12AM",
  "1AM",
  "2AM",
  "3AM",
  "4AM",
  "5AM",
  "6AM",
  "7AM",
  "8AM",
  "9AM",
  "10AM",
  "11AM",
  "12PM",
  "1PM",
  "2PM",
  "3PM",
  "4PM",
  "5PM",
  "6PM",
  "7PM",
  "8PM",
  "9PM",
  "10PM",
  "11PM",
];

/*
 * Solar curve by hour: average solar_input per hour of day (0-23)
 * across the whole range. Takes raw rows (not buckets) because
 * hour-of-day cuts across dates. Always 24 points; the chart
 * shows a fixed subset of x-labels.
 */
export function getSolarCurveByHourData(
  rows: MonitoringHistoryRow[],
): ChartPoint[] {
  const sums = new Array<number>(24).fill(0);
  const counts = new Array<number>(24).fill(0);

  getOnlineRows(rows).forEach((row) => {
    const date = new Date(String(row.recorded_at ?? ""));

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const hour = date.getHours();

    sums[hour] += toNumber(row.solar_input);
    counts[hour] += 1;
  });

  return sums.map((sum, hour) => ({
    value:
      counts[hour] > 0
        ? Math.max(0, sum / counts[hour])
        : 0,

    label: HOUR_LABELS[hour],
  }));
}

export function getDoDStatus(
  batteryLevel: number,
): BatteryHealthStatus {
  return batteryLevel <
    CAUTION_SOC
    ? "Unsafe"
    : "Safe";
}

/* ============================================================
   HEALTH SECTION CHART DATA
   Pure app-side math over monitoring_history rows.
   No SQL changes.
   ============================================================ */

/*
 * Alert-level temperature statuses. Nominal and Elevated are
 * routine; only High and Critical count as alert days.
 */
const ALERT_TEMPERATURE_STATUSES = new Set([
  "High",
  "Critical",
]);

/*
 * Temperature alerts: per-bucket count of rows where the
 * solar OR interior temperature status is High/Critical.
 */
export function getTemperatureAlertsData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value: getOnlineRows(
        bucket.rows,
      ).filter(
        (row) =>
          ALERT_TEMPERATURE_STATUSES.has(
            String(row.solar_temperature_status ?? ""),
          ) ||
          ALERT_TEMPERATURE_STATUSES.has(
            String(row.interior_temp_status ?? ""),
          ),
      ).length,

      label:
        formatDateLabel(
          bucket.date,
          chartFrequency,
        ),
    }),
  );
}

/*
 * Device uptime: per-bucket share of rows reporting
 * device_status "Online", as a percent. Buckets with no rows
 * cannot occur here (grouping only creates non-empty buckets);
 * rows with other statuses count as offline time.
 */
export function getUptimeData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => {
      const online = bucket.rows.filter(
        (row) => row.device_status === "Online",
      ).length;

      return {
        value:
          bucket.rows.length > 0
            ? (online / bucket.rows.length) * 100
            : 0,

        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

export interface OnlineShare {
  online: number;
  offline: number;
}

/*
 * Online share: range-total online vs offline sample counts.
 * Grouping-invariant (sums are order-free), so the donut takes
 * a fixed bucketing and shows no frequency toggle.
 */
export function getOnlineShareData(
  groupedMonitoring: MonitoringBucket[],
): OnlineShare {
  let online = 0;
  let offline = 0;

  groupedMonitoring.forEach((bucket) => {
    bucket.rows.forEach((row) => {
      if (row.device_status === "Online") {
        online += 1;
      } else {
        offline += 1;
      }
    });
  });

  return { online, offline };
}

/* ============================================================
   USAGE SECTION CHART DATA
   Pure app-side math. No SQL changes.
   ============================================================ */

export interface LoadVsPeakPoint {
  avg: number;
  peak: number;
  label?: string;
}

/*
 * Average vs peak load: paired per-bucket avg + max in one pass
 * so the two series can never misalign.
 */
export function getLoadVsPeakData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): LoadVsPeakPoint[] {
  return groupedMonitoring.map(
    (bucket) => {
      const loads = getOnlineRows(
        bucket.rows,
      ).map(
        (row) => toNumber(row.current_load),
      );

      return {
        avg: Math.max(0, average(loads)),
        peak: Math.max(0, maximum(loads)),

        label:
          formatDateLabel(
            bucket.date,
            chartFrequency,
          ),
      };
    },
  );
}

/*
 * Power use by hour: average energy_output_wh per hour of day
 * (0-23) across the whole range. Takes raw rows (not buckets)
 * because hour-of-day cuts across dates. Always 24 points.
 */
export function getPowerByHourData(
  rows: MonitoringHistoryRow[],
): ChartPoint[] {
  const sums = new Array<number>(24).fill(0);
  const counts = new Array<number>(24).fill(0);

  getOnlineRows(rows).forEach((row) => {
    const date = new Date(String(row.recorded_at ?? ""));

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const hour = date.getHours();

    sums[hour] += toNumber(row.energy_output_wh);
    counts[hour] += 1;
  });

  return sums.map((sum, hour) => ({
    value:
      counts[hour] > 0
        ? Math.max(0, sum / counts[hour])
        : 0,

    label: HOUR_LABELS[hour],
  }));
}

/* ============================================================
   ANALYTICS RANGE PROCESSING
   ============================================================ */

/* ============================================================
   NEXT BUCKET HELPER
   ============================================================ */

export function getBucketRange(
  bucket: MonitoringBucket,
  frequency: ChartFrequency,
): AnalyticsRange {
  return {
    start:
      bucket.date,

    end:
      getNextBucketDate(
        bucket.date,
        frequency,
      ),
  };
}

/* ============================================================
   REPORT CSV GENERATION
   ============================================================ */



export function generateAdlaWattCsv(
  reportData: AnalyticsReportData,
): string {
  const renderBlock = (
    rows: (string | number)[][],
    width: number,
  ): string =>
    rows
      .map((row) => {
        const padded = [...row];

        while (
          padded.length < width
        ) {
          padded.push("");
        }

        return padded
          .map(escapeCsvValue)
          .join(",");
      })
      .join("\n");

  const blocks = [
    [
      reportData.reportTitle,
      reportData.reportSubtitle,
    ],
    ...reportData.sections.flatMap(
      (section) => [
        [section.title],
        section.headers,
        ...section.rows,
      ],
    ),
  ];

  const width = Math.max(
    ...blocks.map(
      (block) => block.length,
    ),
  );

  return renderBlock(
    blocks,
    width,
  );
}

/* ============================================================
   PDF HELPERS
   ============================================================ */

/*
 * Shared AdlaWatt PDF palette.
 *
 * Primary:    #00A86B
 * Secondary:  #FFBF00
 * Background: #F0EAD6
 * Body fill:  rgba(255, 255, 255, 0.50) -> #F8F5EA
 */
const PDF_PRIMARY: [
  number,
  number,
  number,
] = [
  0,
  168,
  107,
];

const PDF_SECONDARY: [
  number,
  number,
  number,
] = [
  255,
  191,
  0,
];

const PDF_BACKGROUND: [
  number,
  number,
  number,
] = [
  240,
  234,
  214,
];

const PDF_BODY_FILL: [
  number,
  number,
  number,
] = [
  255,
  255,
  255,
];

const PDF_TEXT: [
  number,
  number,
  number,
] = [
  31,
  41,
  55,
];


function addPdfSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
): number {
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    11.5,
  );

  doc.setTextColor(
    PDF_PRIMARY[0],
    PDF_PRIMARY[1],
    PDF_PRIMARY[2],
  );

  doc.text(
    title,
    18,
    y,
  );

  /*
   * Short secondary-colour accent bar under each section title
   * mirrors the reference report styling.
   */
  doc.setFillColor(
    PDF_SECONDARY[0],
    PDF_SECONDARY[1],
    PDF_SECONDARY[2],
  );

  doc.rect(
    18,
    y + 1.8,
    16,
    1,
    "F",
  );

  return y + 8;
}

/*
 * Paints the AdlaWatt page shell that must stay identical on
 * every page: the cream background and a thin primary green
 * top accent strip.
 */
function paintPdfPageBase(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
): void {
  doc.setFillColor(
    PDF_BACKGROUND[0],
    PDF_BACKGROUND[1],
    PDF_BACKGROUND[2],
  );

  doc.rect(
    0,
    0,
    pageWidth,
    pageHeight,
    "F",
  );

  doc.setFillColor(
    PDF_PRIMARY[0],
    PDF_PRIMARY[1],
    PDF_PRIMARY[2],
  );

  doc.rect(
    0,
    0,
    pageWidth,
    4,
    "F",
  );
}

/*
 * Called from autoTable's willDrawPage hook, which fires before
 * a table draws its head and body. Only pages created by the
 * table (beyond its start page) are repainted, so the section
 * content already drawn on the start page is never covered.
 *
 * hookData.pageNumber is relative to the table, so the
 * document's absolute current page is used instead.
 */
function paintPdfContinuationPage(
  doc: jsPDF,
  _pageNumber: number,
  tableStartPage: number,
  pageWidth: number,
  pageHeight: number,
): void {
  if (
    doc.getCurrentPageInfo().pageNumber >
    tableStartPage
  ) {
    paintPdfPageBase(
      doc,
      pageWidth,
      pageHeight,
    );
  }
}

function addPdfFooter(
  doc: jsPDF,
  periodLabel: string,
): void {
  const pageCount =
    doc.getNumberOfPages();

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const footerHeight =
    10;

  for (
    let page = 1;
    page <= pageCount;
    page += 1
  ) {
    doc.setPage(page);

    doc.setFillColor(
      PDF_PRIMARY[0],
      PDF_PRIMARY[1],
      PDF_PRIMARY[2],
    );

    doc.rect(
      0,
      pageHeight - footerHeight,
      pageWidth,
      footerHeight,
      "F",
    );

    const textY =
      pageHeight - 3.8;

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(
      7,
    );

    doc.setTextColor(
      255,
      255,
      255,
    );

    doc.text(
      "AdlaWatt Analytics Report",
      18,
      textY,
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setTextColor(
      PDF_SECONDARY[0],
      PDF_SECONDARY[1],
      PDF_SECONDARY[2],
    );

    doc.text(
      page === 1
        ? "Confidential | IoT Off-Grid Solar Backup Monitoring"
        : periodLabel,
      pageWidth / 2,
      textY,
      {
        align: "center",
      },
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setTextColor(
      255,
      255,
      255,
    );

    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - 18,
      textY,
      {
        align: "right",
      },
    );
  }
}
/* ============================================================
   PDF REPORT GENERATION
   ============================================================ */


export async function generateAdlaWattPdf(
  reportData: AnalyticsReportData,
): Promise<jsPDF> {
  const JsPDF =
    getJsPDFClass();

  const doc =
    new JsPDF({
      orientation:
        "portrait",

      unit:
        "mm",

      format:
        "a4",
    });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const horizontalMargin =
    18;

  const contentWidth =
    pageWidth -
    horizontalMargin * 2;

  paintPdfPageBase(
    doc,
    pageWidth,
    pageHeight,
  );

  doc.setFillColor(
    PDF_PRIMARY[0],
    PDF_PRIMARY[1],
    PDF_PRIMARY[2],
  );

  doc.rect(
    0,
    0,
    pageWidth,
    30,
    "F",
  );

  doc.setFillColor(
    PDF_SECONDARY[0],
    PDF_SECONDARY[1],
    PDF_SECONDARY[2],
  );

  doc.rect(
    0,
    28,
    pageWidth,
    2,
    "F",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    16,
  );

  doc.setTextColor(
    255,
    255,
    255,
  );

  doc.text(
    reportData.reportTitle,
    horizontalMargin,
    13,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(
    9,
  );

  doc.text(
    reportData.reportSubtitle,
    horizontalMargin,
    21,
  );

  let currentY =
    42;

  for (
    const section
      of reportData.sections
  ) {
    if (
      currentY >
      pageHeight - 90
    ) {
      doc.addPage();

      paintPdfPageBase(
        doc,
        pageWidth,
        pageHeight,
      );

      currentY =
        20;
    }

    currentY =
      addPdfSectionTitle(
        doc,
        section.title,
        currentY,
      );

    const tableStartPage =
      doc.getCurrentPageInfo()
        .pageNumber;

    getAutoTable()(
      doc,
      {
        startY:
          currentY,

        tableWidth:
          contentWidth,

        margin: {
          left:
            horizontalMargin,

          right:
            horizontalMargin,

          bottom:
            20,
        },

        head: [
          section.headers,
        ],

        body:
          section.rows,

        theme:
          "plain",

        styles: {
          font:
            "helvetica",

          fontSize:
            8,

          cellPadding:
            2,

          overflow:
            "linebreak",

          textColor: [
            PDF_TEXT[0],
            PDF_TEXT[1],
            PDF_TEXT[2],
          ],

          fillColor: [
            PDF_BODY_FILL[0],
            PDF_BODY_FILL[1],
            PDF_BODY_FILL[2],
          ],
        },

        headStyles: {
          fillColor: [
            PDF_PRIMARY[0],
            PDF_PRIMARY[1],
            PDF_PRIMARY[2],
          ],

          textColor: [
            255,
            255,
            255,
          ],

          fontStyle:
            "bold",
        },

        alternateRowStyles: {
          fillColor: [
            PDF_BACKGROUND[0],
            PDF_BACKGROUND[1],
            PDF_BACKGROUND[2],
          ],
        },

        willDrawPage: (
          hookData: {
            pageNumber: number;
          },
        ) =>
          paintPdfContinuationPage(
            doc,
            hookData.pageNumber,
            tableStartPage,
            pageWidth,
            pageHeight,
          ),
      },
    );

    currentY =
      (
        doc as jsPDF & {
          lastAutoTable?: {
            finalY: number;
          };
        }
      ).lastAutoTable?.finalY ??
      currentY +
        40;

    currentY +=
      12;
  }

  addPdfFooter(
    doc,
    `${formatReportDate(
      reportData.range.start,
    )} - ${formatReportDate(
      reportData.range.end,
    )}  |  ${reportData.frequency} Report`,
  );

  return doc;
}

/* ============================================================
   REPORT FILE CONTENT HELPERS
   ============================================================ */

/**
 * Returns a filename-safe date in YYYY-MM-DD form.
 */
export function getReportDateFilename(
  date: Date = new Date(),
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

/**
 * Returns the recommended CSV filename.
 */
export function getCsvReportFilename(
  reportData: AnalyticsReportData,
): string {
  return `adlawatt_${reportData.frequency.toLowerCase()}_report_${getReportDateFilename()}.csv`;
}

/* ============================================================
   WEB DOWNLOAD HELPERS
   ============================================================ */

/**
 * Downloads a CSV file directly through the browser.
 *
 * This is intentionally used only on web. It avoids
 * expo-sharing's browser Share dialog and uses the browser's
 * normal download mechanism instead.
 */
export function downloadCsvOnWeb(
  csv: string,
  filename: string,
): void {
  if (Platform.OS !== "web") {
    throw new Error(
      "downloadCsvOnWeb() can only be used on web.",
    );
  }

  const blob =
    new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(
    link,
  );

  link.click();

  document.body.removeChild(
    link,
  );

  URL.revokeObjectURL(
    url,
  );
}

/**
 * Downloads a generated jsPDF document directly through the
 * browser.
 *
 * jsPDF.save() uses the browser's file-download behavior on web.
 */
export function downloadPdfOnWeb(
  pdf: jsPDF,
  filename: string,
): void {
  if (Platform.OS !== "web") {
    throw new Error(
      "downloadPdfOnWeb() can only be used on web.",
    );
  }

  pdf.save(
    filename,
  );
}

/* ============================================================
   WEB REPORT EXPORT
   ============================================================ */

/**
 * Builds and downloads the selected CSV report on web.
 */
export async function exportCsvReportOnWeb(
  reportFrequency: ReportFrequency,
  range: AnalyticsRange,
): Promise<{
  filename: string;
  reportData: AnalyticsReportData;
}> {
  if (Platform.OS !== "web") {
    throw new Error(
      "exportCsvReportOnWeb() can only be used on web.",
    );
  }

  const {
    csv,
    filename,
    reportData,
  } =
    await buildCsvReport(
      reportFrequency,
      range,
    );

  downloadCsvOnWeb(
    csv,
    filename,
  );

  return {
    filename,
    reportData,
  };
}

/**
 * Builds and downloads the selected PDF report on web.
 */
export async function exportPdfReportOnWeb(
  reportFrequency: ReportFrequency,
  range: AnalyticsRange,
): Promise<{
  filename: string;
  reportData: AnalyticsReportData;
}> {
  if (Platform.OS !== "web") {
    throw new Error(
      "exportPdfReportOnWeb() can only be used on web.",
    );
  }

  const {
    pdf,
    filename,
    reportData,
  } =
    await buildPdfReport(
      reportFrequency,
      range,
    );

  downloadPdfOnWeb(
    pdf,
    filename,
  );

  return {
    filename,
    reportData,
  };
}

/**
 * Returns the recommended PDF filename.
 */
export function getPdfReportFilename(
  reportData: AnalyticsReportData,
): string {
  return `adlawatt_${reportData.frequency.toLowerCase()}_report_${getReportDateFilename()}.pdf`;
}

/* ============================================================
   COMPLETE REPORT BUILDERS
   ============================================================ */

/**
 * Loads the selected period and prepares the complete report.
 *
 * This is the main data-processing entry point for Analytics.
 */
export async function buildAnalyticsReport(
  reportFrequency: ReportFrequency,
  range: AnalyticsRange,
): Promise<AnalyticsReportData> {
  const {
    monitoringHistory,
  } =
    await loadAnalyticsData(
      range,
    );

  return prepareReportData(
    monitoringHistory,
    reportFrequency,
    range,
  );
}

/**
 * Builds a complete CSV report from the selected period.
 */
export async function buildCsvReport(
  reportFrequency: ReportFrequency,
  range: AnalyticsRange,
): Promise<{
  csv: string;
  filename: string;
  reportData: AnalyticsReportData;
}> {
  const reportData =
    await buildAnalyticsReport(
      reportFrequency,
      range,
    );

  const csv =
    generateAdlaWattCsv(
      reportData,
    );

  return {
    csv,

    filename:
      getCsvReportFilename(
        reportData,
      ),

    reportData,
  };
}

/**
 * Builds a complete PDF report from the selected period.
 */
export async function buildPdfReport(
  reportFrequency: ReportFrequency,
  range: AnalyticsRange,
): Promise<{
  pdf: jsPDF;
  filename: string;
  reportData: AnalyticsReportData;
}> {
  const reportData =
    await buildAnalyticsReport(
      reportFrequency,
      range,
    );

 const pdf =
  await generateAdlaWattPdf(
    reportData,
  );

  return {
    pdf,

    filename:
      getPdfReportFilename(
        reportData,
      ),

    reportData,
  };
}