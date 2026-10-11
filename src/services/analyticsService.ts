import {
  Image,
  Platform,
} from "react-native";

import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";

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

function getReportLogo(): number {
  return require("@/assets/images/adlawatt-logo.png");
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
  battery_temperature: number | null;
  battery_temperature_status: string | null;
  solar_temperature: number | null;
  solar_temperature_status: string | null;
  interior_temp: number | null;
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

export type BatteryHealthStatus =
  | "Safe"
  | "Unsafe";

export interface HealthCell {
  date: Date;
  temperature: number;
  status: string;
}

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

  averageBatteryTemperature: number;
  maximumBatteryTemperature: number;

  averageSolarTemperature: number;
  maximumSolarTemperature: number;

  totalEnergyInputWh: number;
  totalEnergyOutputWh: number;

  latestBatteryLevel: number;
  latestBatteryStatus: string;
  latestSolarInput: number;
  latestSolarStatus: string;
  latestCurrentLoad: number;

  latestBatteryTemperature: number;
  latestBatteryTemperatureStatus: string;

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
  batteryTemperature: string;
  batteryTemperatureStatus: string;
  solarTemperature: string;
  solarTemperatureStatus: string;
  voltage: string;
  wattHours: string;
  energyInputWh: string;
  energyOutputWh: string;
}

export interface AnalyticsReportData {
  frequency: ReportFrequency;
  range: AnalyticsRange;

  monitoringHistory: MonitoringHistoryRow[];

  monitoringRows: ReportMonitoringRow[];

  summary: ReportSummary;

  reportTitle: string;
  reportSubtitle: string;
}



/* ============================================================
   CONSTANTS
   ============================================================ */

export const DEFAULT_DAYS = 366;

// PostgREST caps a single response (default 1000 rows), so
// long history ranges must be walked page by page.
export const ANALYTICS_PAGE_SIZE = 1000;

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

export function minimum(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.min(...values);
}

export function maximum(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values);
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

export function createPresetRange(
  days: number,
): AnalyticsRange {
  const end =
    new Date();

  const start =
    new Date(end);

  start.setDate(
    start.getDate() -
      days,
  );

  return {
    start,
    end,
  };
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

      batteryTemperature:
        formatNumber(
          toNumber(
            row.battery_temperature,
          ),
        ),

      batteryTemperatureStatus:
        row.battery_temperature_status ??
        "Unknown",

      solarTemperature:
        formatNumber(
          toNumber(
            row.solar_temperature,
          ),
        ),

      solarTemperatureStatus:
        row.solar_temperature_status ??
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
  const batteryLevels =
    monitoringHistory.map(
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
    monitoringHistory.map(
      (row) =>
        Math.max(
          0,
          toNumber(
            row.solar_input,
          ),
        ),
    );

  const currentLoads =
    monitoringHistory.map(
      (row) =>
        Math.max(
          0,
          toNumber(
            row.current_load,
          ),
        ),
    );

  const batteryTemperatures =
    monitoringHistory.map(
      (row) =>
        toNumber(
          row.battery_temperature,
        ),
    );

  const solarTemperatures =
    monitoringHistory.map(
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

    averageBatteryTemperature:
      average(
        batteryTemperatures,
      ),

    maximumBatteryTemperature:
      maximum(
        batteryTemperatures,
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

    latestBatteryTemperature:
      latest
        ? toNumber(
            latest.battery_temperature,
          )
        : 0,

    latestBatteryTemperatureStatus:
      latest?.battery_temperature_status ??
      "No data",

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

  return {
    frequency:
      reportFrequency,

    range,

    monitoringHistory,

    monitoringRows,

    summary,

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
    // oldest rows. Pages walk forward until a short page.
    const monitoringRows: unknown[] = [];

    for (
      let pageStart = 0;
      ;
      pageStart += ANALYTICS_PAGE_SIZE
    ) {
      const {
        data:
          monitoringPage,
        error:
          monitoringError,
      } =
        await supabase
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
              "battery_temperature",
              "battery_temperature_status",
              "solar_temperature",
              "solar_temperature_status",
              "interior_temp",
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
              ascending: true,
            },
          )
          .range(
            pageStart,
            pageStart + ANALYTICS_PAGE_SIZE - 1,
          );

      if (
        monitoringError
      ) {
        console.error(
          "Analytics monitoring history error:",
          monitoringError.message,
        );

        break;
      }

      monitoringRows.push(
        ...(monitoringPage ?? []),
      );

      if (
        !monitoringPage ||
        monitoringPage.length < ANALYTICS_PAGE_SIZE
      ) {
        break;
      }
    }

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
  let idle = 0;

  groupedMonitoring.forEach(
    (bucket) => {
      bucket.rows.forEach(
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
        bucket.rows.map(
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
        bucket.rows.filter(
          (row) =>
            getDoDStatus(
              toNumber(row.battery_level),
            ) === "Unsafe",
        ).length;

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
          bucket.rows.map(
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

export function getBatteryTemperatureData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value:
        average(
          bucket.rows.map(
            (row) =>
              toNumber(
                row.battery_temperature,
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

export function getSolarTemperatureData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value:
        average(
          bucket.rows.map(
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
      const samples = bucket.rows
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
          bucket.rows.map(
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
        bucket.rows.map(
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
          bucket.rows.map(
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
          bucket.rows.map(
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
          bucket.rows.map(
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

      bucket.rows.forEach((row) => {
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

  rows.forEach((row) => {
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

const TEMPERATURE_STATUS_RANK: Record<
  string,
  number
> = {
  Nominal: 0,
  Elevated: 1,
  High: 2,
  Critical: 3,
};

export function getTemperatureHealthData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): HealthCell[] {
  return groupedMonitoring.map(
    (bucket) => {
      let status =
        "Nominal";

      bucket.rows.forEach(
        (row) => {
          const rowStatus =
            row.battery_temperature_status ??
            "Nominal";

          if (
            TEMPERATURE_STATUS_RANK[
              rowStatus
            ] >
            TEMPERATURE_STATUS_RANK[
              status
            ]
          ) {
            status = rowStatus;
          }
        },
      );

      return {
        date: bucket.date,
        temperature:
          average(
            bucket.rows.map(
              (row) =>
                toNumber(
                  row.battery_temperature,
                ),
            ),
          ),

        status,
      };
    },
  );
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
 * battery OR solar temperature status is High/Critical.
 */
export function getTemperatureAlertsData(
  groupedMonitoring: MonitoringBucket[],
  chartFrequency: ChartFrequency,
): ChartPoint[] {
  return groupedMonitoring.map(
    (bucket) => ({
      value: bucket.rows.filter(
        (row) =>
          ALERT_TEMPERATURE_STATUSES.has(
            String(row.battery_temperature_status ?? ""),
          ) ||
          ALERT_TEMPERATURE_STATUSES.has(
            String(row.solar_temperature_status ?? ""),
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
      const loads = bucket.rows.map(
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

  rows.forEach((row) => {
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

export function getChartLimits(
  solarChartData: ChartPoint[],
  energyInputChartData: ChartPoint[],
  energyOutputChartData: ChartPoint[],
  batteryTemperatureData: ChartPoint[],
  solarTemperatureData: ChartPoint[],
): {
  solarMax: number;
  energyInputMax: number;
  temperatureMax: number;
} {
  const solarMax =
    Math.max(
      100,
      ...solarChartData.map(
        (item) =>
          item.value,
      ),
    );

  const energyInputMax =
    Math.max(
      10,
      ...energyInputChartData.map(
        (item) =>
          item.value,
      ),
      ...energyOutputChartData.map(
        (item) =>
          item.value,
      ),
    );

  const temperatureMax =
    Math.max(
      40,
      ...batteryTemperatureData.map(
        (item) =>
          item.value,
      ),
      ...solarTemperatureData.map(
        (item) =>
          item.value,
      ),
    );

  return {
    solarMax,
    energyInputMax,
    temperatureMax,
  };
}

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

/**
 * Creates the complete AdlaWatt CSV report.
 *
 * CSV is used instead of pretending to create a native .xlsx file.
 * Excel, Google Sheets, and other spreadsheet applications can
 * open the resulting CSV file directly.
 */
export function generateAdlaWattCsv(
  reportData: AnalyticsReportData,
): string {
  const summaryHeaders = [
    "Metric",
    "Value",
  ];

  const summaryRows = [
    [
      "Report Frequency",
      reportData.frequency,
    ],

    [
      "Start Date",
      formatReportDate(
        reportData.range.start,
      ),
    ],

    [
      "End Date",
      formatReportDate(
        reportData.range.end,
      ),
    ],

    [
      "Monitoring Records",
      reportData.summary.sampleCount,
    ],

    [
      "Average Battery Level (%)",
      formatNumber(
        reportData.summary
          .averageBatteryLevel,
      ),
    ],

    [
      "Minimum Battery Level (%)",
      formatNumber(
        reportData.summary
          .minimumBatteryLevel,
      ),
    ],

    [
      "Maximum Battery Level (%)",
      formatNumber(
        reportData.summary
          .maximumBatteryLevel,
      ),
    ],

    [
      "Average Solar Input (W)",
      formatNumber(
        reportData.summary
          .averageSolarInput,
      ),
    ],

    [
      "Maximum Solar Input (W)",
      formatNumber(
        reportData.summary
          .maximumSolarInput,
      ),
    ],

    [
      "Average Current Load (W)",
      formatNumber(
        reportData.summary
          .averageCurrentLoad,
      ),
    ],

    [
      "Maximum Current Load (W)",
      formatNumber(
        reportData.summary
          .maximumCurrentLoad,
      ),
    ],

    [
      "Average Battery Temperature (C)",
      formatNumber(
        reportData.summary
          .averageBatteryTemperature,
      ),
    ],

    [
      "Maximum Battery Temperature (C)",
      formatNumber(
        reportData.summary
          .maximumBatteryTemperature,
      ),
    ],

    [
      "Average Solar Temperature (C)",
      formatNumber(
        reportData.summary
          .averageSolarTemperature,
      ),
    ],

    [
      "Maximum Solar Temperature (C)",
      formatNumber(
        reportData.summary
          .maximumSolarTemperature,
      ),
    ],

    [
      "Total Energy Input (Wh)",
      formatNumber(
        reportData.summary
          .totalEnergyInputWh,
      ),
    ],

    [
      "Total Energy Output (Wh)",
      formatNumber(
        reportData.summary
          .totalEnergyOutputWh,
      ),
    ],
  ];

  const monitoringHeaders = [
    "Recorded At",
    "Battery %",
    "Battery",
    "Solar W",
    "Load W",
    "Device",
    "Battery C",
    "Solar C",
    "Sol Timer",
    "Sol V",
    "Sol A",
    "Total Wh",
  ];

  const monitoringCsvRows =
    reportData.monitoringRows.map(
      (row) => [
        row.recordedAt,
        row.batteryLevel,
        row.batteryStatus,
        row.solarInput,
        row.currentLoad,
        row.deviceStatus,
        row.batteryTemperature,
        row.solarTemperature,
        row.solarTimer,
        row.solarVoltage,
        row.solarCurrent,
        row.totalEnergy,
      ],
    );

  /*
   * Every row is padded to a single uniform column count so the
   * CSV opens as one clean, aligned grid in spreadsheet apps.
   */
  const uniformColumnCount =
    monitoringHeaders.length;

  const padCsvRow = (
    row: (string | number)[],
  ): (string | number)[] => {
    const padded =
      [...row];

    while (
      padded.length <
      uniformColumnCount
    ) {
      padded.push("");
    }

    return padded;
  };

  const sections: (string | number)[][] = [];

  sections.push(
    [
      reportData.reportTitle,
    ],
    [
      reportData.reportSubtitle,
    ],
    [],
    summaryHeaders,
    ...summaryRows,
    [],
    [
      "MONITORING HISTORY",
    ],
    monitoringHeaders,
    ...monitoringCsvRows,
  );

  return sections
    .map((row) =>
      padCsvRow(row)
        .map(
          escapeCsvValue,
        )
        .join(","),
    )
    .join("\n");
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

const PDF_MUTED: [
  number,
  number,
  number,
] = [
  117,
  117,
  117,
];

const PDF_BORDER: [
  number,
  number,
  number,
] = [
  216,
  210,
  194,
];

function getPdfStatusColor(
  status: string,
): [number, number, number] {
  const normalized =
    status
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "alarming",
    ) ||
    normalized.includes(
      "offline",
    )
  ) {
    return [198, 40, 40];
  }

  if (
    normalized.includes(
      "moderate",
    )
  ) {
    return [245, 158, 11];
  }

  if (
    normalized.includes(
      "charging",
    ) ||
    normalized.includes(
      "online",
    ) ||
    normalized.includes(
      "normal",
    ) ||
    normalized.includes(
      "high",
    )
  ) {
    return [22, 163, 74];
  }

  return [100, 116, 139];
}

function addPdfStatusBox(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  /*
   * Summary cards follow the reference layout: a clean white
   * card with a subtle border, a small uppercase label and a
   * large bold value.
   */
  doc.setFillColor(
    PDF_BODY_FILL[0],
    PDF_BODY_FILL[1],
    PDF_BODY_FILL[2],
  );

  doc.setDrawColor(
    PDF_BORDER[0],
    PDF_BORDER[1],
    PDF_BORDER[2],
  );

  doc.setLineWidth(
    0.3,
  );

  doc.roundedRect(
    x,
    y,
    width,
    height,
    3,
    3,
    "FD",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    7.5,
  );

  doc.setTextColor(
    PDF_MUTED[0],
    PDF_MUTED[1],
    PDF_MUTED[2],
  );

  doc.text(
    label.toUpperCase(),
    x + 5,
    y + 8,
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  /*
   * Shrink the value until it fits the card so long status
   * strings never overflow the white card.
   */
  let valueFontSize =
    15;

  doc.setFontSize(
    valueFontSize,
  );

  doc.setTextColor(
    PDF_TEXT[0],
    PDF_TEXT[1],
    PDF_TEXT[2],
  );

  while (
    valueFontSize > 8 &&
    doc.getTextWidth(value) >
      width - 10
  ) {
    valueFontSize -= 0.5;

    doc.setFontSize(
      valueFontSize,
    );
  }

  doc.text(
    value,
    x + 5,
    y + 19,
  );
}

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

/**
 * Generates the actual AdlaWatt analytics PDF document.
 *
 * PDF branding:
 *
 * Primary:
 *   #00A86B
 *
 * Secondary:
 *   #FFBF00
 *
 * Background:
 *   #F0EAD6
 *
 * White card/table body:
 *   rgba(255, 255, 255, 0.50)
 */
export async function generateAdlaWattPdf(
  reportData: AnalyticsReportData,
): Promise<jsPDF> {
  const JsPDF = getJsPDFClass();
  const adlawattLogo = getReportLogo();

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

  /* ==========================================================
     PDF DESIGN AREA
     ========================================================== */

  /*
   * A4 page:
   *
   * Width  = 210 mm
   * Height = 297 mm
   *
   * 18 mm left + 18 mm right margins
   * leave 174 mm of usable content width.
   */
  const horizontalMargin =
    18;

  const contentWidth =
    pageWidth -
    horizontalMargin * 2;

  /* ----------------------------------------------------------
     PAGE BACKGROUND
     ---------------------------------------------------------- */

  paintPdfPageBase(
    doc,
    pageWidth,
    pageHeight,
  );

  /* ----------------------------------------------------------
     HEADER
     ---------------------------------------------------------- */

  /*
   * Main header uses AdlaWatt primary green.
   */
  const headerHeight =
    38;

  doc.setFillColor(
    PDF_PRIMARY[0],
    PDF_PRIMARY[1],
    PDF_PRIMARY[2],
  );

  doc.rect(
    0,
    0,
    pageWidth,
    headerHeight,
    "F",
  );

  /*
   * Secondary yellow accent line.
   */
  doc.setFillColor(
    PDF_SECONDARY[0],
    PDF_SECONDARY[1],
    PDF_SECONDARY[2],
  );

  doc.rect(
    0,
    headerHeight - 2,
    pageWidth,
    2,
    "F",
  );

  /* ----------------------------------------------------------
     ADLAWATT LOGO
     ---------------------------------------------------------- */

  /*
   * Resolve the bundled Expo image into a URI first.
   *
   * The PDF generator is currently used by the web export path,
   * so the resolved asset is fetched and converted into a data
   * URL before being passed to jsPDF.
   */
  let logoDataUrl:
    string | null = null;

  /* 
   * Resolve the bundled logo URI with fallbacks.
   *
   * Metro on web can return either an asset number needed by
   * Image.resolveAssetSource, or an object that already carries
   * a uri directly, so both paths are attempted.
   */
  const resolveLogoUri =
    (): string | null => {
      try {
        const source =
          Image.resolveAssetSource(
            adlawattLogo,
          );

        if (source?.uri) {
          return source.uri;
        }
      } catch (error) {
        console.warn(
          "Image.resolveAssetSource failed:",
          error,
        );
      }

      const directUri =
        (
          adlawattLogo as unknown as {
            uri?: string;
          } | null
        )?.uri;

      if (directUri) {
        return directUri;
      }

      return null;
    };

  try {
    const resolvedUri =
      resolveLogoUri();

    if (resolvedUri) {
      let response =
        await fetch(
          resolvedUri,
        );

      if (!response.ok) {
        /*
         * Retry once with a cache-buster query.
         */
        response =
          await fetch(
            resolvedUri +
              (resolvedUri.includes("?")
                ? "&"
                : "?") +
              "t=" +
              Date.now(),
          );
      }

      if (response.ok) {
        const blob =
          await response.blob();

        logoDataUrl =
          await new Promise<
            string | null
          >(
            (
              resolve,
              reject,
            ) => {
              const reader =
                new FileReader();

              reader.onloadend =
                () => {
                  const result =
                    reader.result;

                  if (
                    typeof result ===
                    "string"
                  ) {
                    resolve(
                      result,
                    );
                  } else {
                    resolve(
                      null,
                    );
                  }
                };

              reader.onerror =
                () => {
                  reject(
                    new Error(
                      "Failed to read AdlaWatt logo.",
                    ),
                  );
                };

              reader.readAsDataURL(
                blob,
              );
            },
          );
      }
    }
  } catch (error) {
    console.warn(
      "AdlaWatt logo could not be loaded:",
      error,
    );
  }

  /*
   * Logo dimensions.
   *
   * The logo sits on the left side of the header.
   */
  const logoWidth =
    40;

  const logoHeight =
    25;

  const logoX =
    horizontalMargin;

  const logoY =
    6;

  let logoRendered =
    false;

  if (
    logoDataUrl
  ) {
    try {
      doc.addImage(
        logoDataUrl,
        "PNG",
        logoX,
        logoY,
        logoWidth,
        logoHeight,
        undefined,
        "FAST",
      );

      logoRendered =
        true;
    } catch (error) {
      console.warn(
        "AdlaWatt logo could not be added to PDF:",
        error,
      );
    }
  }

  /*
   * Branding fallback.
   *
   * If the image logo could not be loaded, draw the AdlaWatt
   * wordmark in white so the header branding always appears.
   */
  if (!logoRendered) {
    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(
      13,
    );

    doc.setTextColor(
      255,
      255,
      255,
    );

    doc.text(
      "AdlaWatt",
      logoX,
      logoY + 14,
    );
  }

  /* ----------------------------------------------------------
     HEADER TITLE
     ---------------------------------------------------------- */

  /*
   * The logo already provides the AdlaWatt branding.
   *
   * Therefore the title is only:
   *
   *   Analytics Report
   */
  const headerTextX =
    logoX +
    logoWidth +
    7;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    18,
  );

  doc.setTextColor(
    255,
    255,
    255,
  );

  doc.text(
    "Analytics Report",
    headerTextX,
    13,
  );

  /*
   * Report frequency.
   */
  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(
    8.5,
  );

  doc.text(
    `${reportData.frequency} Report`,
    headerTextX,
    20,
  );

  /*
   * Report period.
   */
  doc.text(
    `${formatReportDate(
      reportData.range.start,
    )} - ${formatReportDate(
      reportData.range.end,
    )}`,
    headerTextX,
    26,
  );

  /* ----------------------------------------------------------
     COVER
     ---------------------------------------------------------- */

  let currentY =
    56;

  /*
   * Light pill containing the report type.
   */
  const pillWidth =
    66;

  const pillHeight =
    9;

  const pillX =
    (pageWidth - pillWidth) / 2;

  doc.setFillColor(
    224,
    245,
    236,
  );

  doc.roundedRect(
    pillX,
    currentY,
    pillWidth,
    pillHeight,
    4.5,
    4.5,
    "F",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    8,
  );

  doc.setTextColor(
    PDF_PRIMARY[0],
    PDF_PRIMARY[1],
    PDF_PRIMARY[2],
  );

  doc.text(
    `${reportData.frequency.toUpperCase()} ANALYTICS REPORT`,
    pageWidth / 2,
    currentY + 6,
    {
      align: "center",
    },
  );

  currentY +=
    pillHeight + 9;

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(
    14,
  );

  doc.setTextColor(
    PDF_MUTED[0],
    PDF_MUTED[1],
    PDF_MUTED[2],
  );

  doc.text(
    "Energy Monitoring",
    pageWidth / 2,
    currentY,
    {
      align: "center",
    },
  );

  currentY +=
    11;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    24,
  );

  doc.setTextColor(
    PDF_PRIMARY[0],
    PDF_PRIMARY[1],
    PDF_PRIMARY[2],
  );

  doc.text(
    "& System Analytics",
    pageWidth / 2,
    currentY,
    {
      align: "center",
    },
  );

  currentY +=
    12;

  /*
   * Four-column information card.
   */
  const infoCardY =
    currentY;

  const infoCardHeight =
    30;

  doc.setFillColor(
    PDF_BODY_FILL[0],
    PDF_BODY_FILL[1],
    PDF_BODY_FILL[2],
  );

  doc.setDrawColor(
    PDF_BORDER[0],
    PDF_BORDER[1],
    PDF_BORDER[2],
  );

  doc.setLineWidth(
    0.3,
  );

  doc.roundedRect(
    horizontalMargin,
    infoCardY,
    contentWidth,
    infoCardHeight,
    3,
    3,
    "FD",
  );

  const infoColumns = [
    {
      label: "REPORT TYPE",
      value: `${reportData.frequency} Report`,
    },

    {
      label: "PERIOD",
      value: `${formatReportDate(
        reportData.range.start,
      )} - ${formatReportDate(
        reportData.range.end,
      )}`,
    },

    {
      label: "GENERATED",
      value: formatReportDateTime(
        new Date(),
      ),
    },

    {
      label: "SYSTEM",
      value: "AdlaWatt IoT v1.0",
    },
  ];

  const infoColumnWidth =
    contentWidth /
    infoColumns.length;

  infoColumns.forEach(
    (
      column,
      index,
    ) => {
      const columnX =
        horizontalMargin +
        infoColumnWidth * index +
        6;

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(
        8,
      );

      doc.setTextColor(
        PDF_MUTED[0],
        PDF_MUTED[1],
        PDF_MUTED[2],
      );

      doc.text(
        column.label,
        columnX,
        infoCardY + 11,
      );

      doc.setFontSize(
        9,
      );

      doc.setTextColor(
        PDF_TEXT[0],
        PDF_TEXT[1],
        PDF_TEXT[2],
      );

      const valueLines =
        doc.splitTextToSize(
          column.value,
          infoColumnWidth - 12,
        );

      doc.text(
        valueLines.slice(
          0,
          2,
        ),
        columnX,
        infoCardY + 19,
      );

      if (index > 0) {
        doc.setDrawColor(
          PDF_BORDER[0],
          PDF_BORDER[1],
          PDF_BORDER[2],
        );

        doc.setLineWidth(
          0.3,
        );

        doc.line(
          horizontalMargin +
            infoColumnWidth * index,
          infoCardY + 6,
          horizontalMargin +
            infoColumnWidth * index,
          infoCardY +
            infoCardHeight -
            6,
        );
      }
    },
  );

  currentY =
    infoCardY +
    infoCardHeight +
    12;

  doc.setFont(
    "helvetica",
    "italic",
  );

  doc.setFontSize(
    8,
  );

  doc.setTextColor(
    PDF_MUTED[0],
    PDF_MUTED[1],
    PDF_MUTED[2],
  );

  doc.text(
    doc.splitTextToSize(
      "This report provides a comprehensive overview of the AdlaWatt off-grid solar backup power monitoring system. All metrics are recorded at 5-minute intervals. Data source: AdlaWatt Mobile App and IoT hardware sensors.",
      contentWidth,
    ),
    horizontalMargin,
    currentY,
  );

  /*
   * Summary sections begin on a fresh page, matching the
   * reference report structure.
   */
  doc.addPage();

  paintPdfPageBase(
    doc,
    pageWidth,
    pageHeight,
  );

  currentY =
    20;

  /* ----------------------------------------------------------
     SYSTEM SUMMARY
     ---------------------------------------------------------- */

  currentY =
    addPdfSectionTitle(
      doc,
      "SYSTEM SUMMARY",
      currentY,
    );

  /*
   * Three equal cards across the full content width.
   */
  const boxGap =
    5;

  const boxWidth =
    (
      contentWidth -
      boxGap * 2
    ) / 3;

  const boxHeight =
    23;

  const firstRowY =
    currentY;

  const secondRowY =
    firstRowY +
    boxHeight +
    6;

  const thirdRowY =
    secondRowY +
    boxHeight +
    6;

  const fourthRowY =
    thirdRowY +
    boxHeight +
    6;

  /* ----------------------------------------------------------
     SYSTEM SUMMARY - ROW 1
     ---------------------------------------------------------- */

  addPdfStatusBox(
    doc,
    "Battery Level",
    `${formatNumber(
      reportData.summary
        .latestBatteryLevel,
    )}%`,
    horizontalMargin,
    firstRowY,
    boxWidth,
    boxHeight,
  );

  addPdfStatusBox(
    doc,
    "Solar Input",
    `${formatNumber(
      reportData.summary
        .latestSolarInput,
    )} W`,
    horizontalMargin +
      boxWidth +
      boxGap,
    firstRowY,
    boxWidth,
    boxHeight,
  );

  addPdfStatusBox(
    doc,
    "Current Load",
    `${formatNumber(
      reportData.summary
        .latestCurrentLoad,
    )} W`,
    horizontalMargin +
      (
        boxWidth +
        boxGap
      ) *
        2,
    firstRowY,
    boxWidth,
    boxHeight,
  );

  /* ----------------------------------------------------------
     SYSTEM SUMMARY - ROW 2
     ---------------------------------------------------------- */

  addPdfStatusBox(
    doc,
    "Battery Status",
    reportData.summary
      .latestBatteryStatus,
    horizontalMargin,
    secondRowY,
    boxWidth,
    boxHeight,
  );

  addPdfStatusBox(
    doc,
    "Solar Status",
    reportData.summary
      .latestSolarStatus,
    horizontalMargin +
      boxWidth +
      boxGap,
    secondRowY,
    boxWidth,
    boxHeight,
  );

  addPdfStatusBox(
    doc,
    "Device Status",
    reportData.summary
      .latestDeviceStatus,
    horizontalMargin +
      (
        boxWidth +
        boxGap
      ) *
        2,
    secondRowY,
    boxWidth,
    boxHeight,
  );

  /* ----------------------------------------------------------
     SYSTEM SUMMARY - ROW 3
     ---------------------------------------------------------- */

  addPdfStatusBox(
    doc,
    "Solar Timer",
    reportData.summary
      .latestSolarTimer,
    horizontalMargin,
    thirdRowY,
    boxWidth,
    boxHeight,
  );

  addPdfStatusBox(
    doc,
    "Solar Voltage",
    `${formatNumber(
      reportData.summary
        .latestSolarVoltage,
    )} V`,
    horizontalMargin +
      boxWidth +
      boxGap,
    thirdRowY,
    boxWidth,
    boxHeight,
  );

  addPdfStatusBox(
    doc,
    "Solar Current",
    `${formatNumber(
      reportData.summary
        .latestSolarCurrent,
    )} A`,
    horizontalMargin +
      (
        boxWidth +
        boxGap
      ) *
        2,
    thirdRowY,
    boxWidth,
    boxHeight,
  );

  /* ----------------------------------------------------------
     SYSTEM SUMMARY - ROW 4
     ---------------------------------------------------------- */

  addPdfStatusBox(
    doc,
    "Total Energy",
    `${formatNumber(
      reportData.summary
        .latestTotalEnergy,
    )} Wh`,
    horizontalMargin,
    fourthRowY,
    boxWidth,
    boxHeight,
  );

  addPdfStatusBox(
    doc,
    "Time Remaining",
    reportData.summary
      .latestTimeRemaining,
    horizontalMargin +
      boxWidth +
      boxGap,
    fourthRowY,
    boxWidth,
    boxHeight,
  );

  currentY =
    fourthRowY +
    boxHeight +
    10;

  /*
   * The SYSTEM SUMMARY now renders four rows of cards, so
   * guard the ENERGY SUMMARY against running off the page.
   */
  if (
    currentY >
    pageHeight - 95
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

  /* ----------------------------------------------------------
     ENERGY SUMMARY
     ---------------------------------------------------------- */

  currentY =
    addPdfSectionTitle(
      doc,
      "ENERGY SUMMARY",
      currentY,
    );

  const energyTableStartPage =
    doc.getCurrentPageInfo().pageNumber;

  getAutoTable()(
    doc,
    {
      startY:
        currentY,

      /*
       * Same width used by every other report table.
       */
      tableWidth:
        contentWidth,

      margin: {
        left:
          horizontalMargin,

        right:
          horizontalMargin,
      },

      head: [
        [
          "Metric",
          "Value",
        ],
      ],

      body: [
        [
          "Total Energy Input",
          `${formatNumber(
            reportData.summary
              .totalEnergyInputWh,
          )} Wh`,
        ],

        [
          "Total Energy Output",
          `${formatNumber(
            reportData.summary
              .totalEnergyOutputWh,
          )} Wh`,
        ],

        [
          "Average Solar Input",
          `${formatNumber(
            reportData.summary
              .averageSolarInput,
          )} W`,
        ],

        [
          "Average Current Load",
          `${formatNumber(
            reportData.summary
              .averageCurrentLoad,
          )} W`,
        ],
      ],

      theme:
        "plain",

      styles: {
        font:
          "helvetica",

        fontSize:
          8,

        cellPadding:
          3,

        textColor: [
          31,
          41,
          55,
        ],

        fillColor: [
          248,
          245,
          234,
        ],
      },

      /*
       * Primary green table header.
       */
      headStyles: {
        fillColor: [
          0,
          168,
          107,
        ],

        textColor: [
          255,
          255,
          255,
        ],

        fontStyle:
          "bold",
      },

      /*
       * Every body cell uses the white-card appearance.
       */
      bodyStyles: {
        fillColor: [
          255,
          255,
          255,
        ],
      },

      alternateRowStyles: {
        fillColor: [
          248,
          245,
          234,
        ],
      },

      willDrawPage:
        (
          hookData,
        ) => {
          paintPdfContinuationPage(
            doc,
            hookData.pageNumber,
            energyTableStartPage,
            pageWidth,
            pageHeight,
          );
        },

      columnStyles: {
        0: {
          cellWidth:
            contentWidth *
            0.70,
        },

        1: {
          cellWidth:
            contentWidth *
            0.30,
        },
      },
    },
  );

  currentY =
    (
      doc as unknown as {
        lastAutoTable?: {
          finalY?: number;
        };
      }
    ).lastAutoTable
      ?.finalY ??
    currentY + 30;

  currentY +=
    10;

  /* ----------------------------------------------------------
     TEMPERATURE SUMMARY
     ---------------------------------------------------------- */

  currentY =
    addPdfSectionTitle(
      doc,
      "TEMPERATURE SUMMARY",
      currentY,
    );

  const temperatureTableStartPage =
    doc.getCurrentPageInfo().pageNumber;

  getAutoTable()(
    doc,
    {
      startY:
        currentY,

      /*
       * Same overall width as Energy Summary.
       */
      tableWidth:
        contentWidth,

      margin: {
        left:
          horizontalMargin,

        right:
          horizontalMargin,
      },

      head: [
        [
          "Temperature Metric",
          "Average",
          "Maximum",
          "Latest",
          "Status",
        ],
      ],

      body: [
        [
          "Battery Temperature",

          `${formatNumber(
            reportData.summary
              .averageBatteryTemperature,
          )} C`,

          `${formatNumber(
            reportData.summary
              .maximumBatteryTemperature,
          )} C`,

          `${formatNumber(
            reportData.summary
              .latestBatteryTemperature,
          )} C`,

          reportData.summary
            .latestBatteryTemperatureStatus,
        ],

        [
          "Solar Temperature",

          `${formatNumber(
            reportData.summary
              .averageSolarTemperature,
          )} C`,

          `${formatNumber(
            reportData.summary
              .maximumSolarTemperature,
          )} C`,

          `${formatNumber(
            reportData.summary
              .latestSolarTemperature,
          )} C`,

          reportData.summary
            .latestSolarTemperatureStatus,
        ],
      ],

      theme:
        "plain",

      styles: {
        font:
          "helvetica",

        fontSize:
          7.5,

        cellPadding:
          2.8,

        textColor: [
          31,
          41,
          55,
        ],

        fillColor: [
          248,
          245,
          234,
        ],
      },

      headStyles: {
        fillColor: [
          0,
          168,
          107,
        ],

        textColor: [
          255,
          255,
          255,
        ],

        fontStyle:
          "bold",
      },

      bodyStyles: {
        fillColor: [
          255,
          255,
          255,
        ],
      },

      alternateRowStyles: {
        fillColor: [
          248,
          245,
          234,
        ],
      },

      willDrawPage:
        (
          hookData,
        ) => {
          paintPdfContinuationPage(
            doc,
            hookData.pageNumber,
            temperatureTableStartPage,
            pageWidth,
            pageHeight,
          );
        },

      /*
       * The proportions total exactly 100%.
       */
      columnStyles: {
        0: {
          cellWidth:
            contentWidth *
            0.28,
        },

        1: {
          cellWidth:
            contentWidth *
            0.18,
        },

        2: {
          cellWidth:
            contentWidth *
            0.18,
        },

        3: {
          cellWidth:
            contentWidth *
            0.18,
        },

        4: {
          cellWidth:
            contentWidth *
            0.18,
        },
      },

      /*
       * Keep temperature status colors meaningful while
       * preserving the white body cell background.
       */
      didParseCell:
        (
          hookData,
        ) => {
          if (
            hookData.section ===
              "body" &&
            hookData.column.index ===
              4
          ) {
            const status =
              String(
                hookData.cell.raw ??
                  "",
              );

            hookData.cell.styles.textColor =
              getPdfStatusColor(
                status,
              );
          }
        },
    },
  );

  currentY =
    (
      doc as unknown as {
        lastAutoTable?: {
          finalY?: number;
        };
      }
    ).lastAutoTable
      ?.finalY ??
    currentY + 30;

  currentY +=
    10;

  /* ----------------------------------------------------------
     MONITORING HISTORY
     ---------------------------------------------------------- */

  /*
   * Monitoring History always begins on a fresh page so the
   * dense data grid stays consistent, matching the reference.
   */
  doc.addPage();

  paintPdfPageBase(
    doc,
    pageWidth,
    pageHeight,
  );

  currentY =
    20;

  currentY =
    addPdfSectionTitle(
      doc,
      "MONITORING HISTORY",
      currentY,
    );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(
    8,
  );

  doc.setTextColor(
    PDF_MUTED[0],
    PDF_MUTED[1],
    PDF_MUTED[2],
  );

  doc.text(
    "5-minute interval readings",
    horizontalMargin,
    currentY,
  );

  currentY +=
    4;

  if (
    reportData.monitoringRows
      .length >
    0
  ) {
    /*
     * Monitoring History uses exactly the same overall table
     * width as Energy Summary and Temperature Summary.
     *
     * 210 mm A4 width
     * - 18 mm left margin
     * - 18 mm right margin
     * = 174 mm table width
     */
    const monitoringTableStartPage =
      doc.getCurrentPageInfo().pageNumber;

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
          [
            "Recorded At",
            "Battery %",
            "Battery",
            "Solar W",
            "Load W",
            "Device",
            "Battery C",
            "Solar C",
            "Sol Timer",
            "Sol V",
            "Sol A",
            "Total Wh",
          ],
        ],

        body:
          reportData.monitoringRows.map(
            (row) => [
              row.recordedAt,
              row.batteryLevel,
              row.batteryStatus,
              row.solarInput,
              row.currentLoad,
              row.deviceStatus,
              row.batteryTemperature,
              row.solarTemperature,
              row.solarTimer,
              row.solarVoltage,
              row.solarCurrent,
              row.totalEnergy,
            ],
          ),

        theme:
          "plain",

        styles: {
          font:
            "helvetica",

          fontSize:
            6.5,

          cellPadding:
            2,

          overflow:
            "linebreak",

          textColor: [
            31,
            41,
            55,
          ],

          fillColor: [
            248,
            245,
            234,
          ],
        },

        headStyles: {
          fillColor: [
            0,
            168,
            107,
          ],

          textColor: [
            255,
            255,
            255,
          ],

          fontStyle:
            "bold",

          fontSize:
            6.5,
        },

        bodyStyles: {
          fillColor: [
            255,
            255,
            255,
          ],
        },

        alternateRowStyles: {
          fillColor: [
            248,
            245,
            234,
          ],
        },

        willDrawPage:
          (
            hookData,
          ) => {
            paintPdfContinuationPage(
              doc,
              hookData.pageNumber,
              monitoringTableStartPage,
              pageWidth,
              pageHeight,
            );
          },

        /*
         * The column proportions total 100%.
         *
         * This keeps the monitoring table inside the exact
         * same 174 mm content width as the other tables.
         */
        columnStyles: {
          0: {
            cellWidth:
              contentWidth *
              0.17,
          },

          1: {
            cellWidth:
              contentWidth *
              0.075,
          },

          2: {
            cellWidth:
              contentWidth *
              0.11,
          },

          3: {
            cellWidth:
              contentWidth *
              0.075,
          },

          4: {
            cellWidth:
              contentWidth *
              0.075,
          },

          5: {
            cellWidth:
              contentWidth *
              0.095,
          },

          6: {
            cellWidth:
              contentWidth *
              0.07,
          },

          7: {
            cellWidth:
              contentWidth *
              0.07,
          },

          8: {
            cellWidth:
              contentWidth *
              0.07,
          },

          9: {
            cellWidth:
              contentWidth *
              0.06,
          },

          10: {
            cellWidth:
              contentWidth *
              0.06,
          },

          11: {
            cellWidth:
              contentWidth *
              0.07,
          },
        },

        didParseCell:
          (
            hookData,
          ) => {
            /*
             * Battery status remains semantically colored.
             */
            if (
              hookData.section ===
                "body" &&
              hookData.column.index ===
                2
            ) {
              const status =
                String(
                  hookData.cell.raw ??
                    "",
                );

              hookData.cell.styles.textColor =
                getPdfStatusColor(
                  status,
                );
            }
          },
      },
    );
  } else {
    doc.setFillColor(
      248,
      245,
      234,
    );

    doc.setDrawColor(
      203,
      213,
      225,
    );

    doc.roundedRect(
      horizontalMargin,
      currentY,
      contentWidth,
      15,
      3,
      3,
      "FD",
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(
      8,
    );

    doc.setTextColor(
      71,
      85,
      105,
    );

    doc.text(
      "No monitoring history available for this report period.",
      horizontalMargin + 6,
      currentY + 9,
    );
  }

  /* ----------------------------------------------------------
     FOOTER
     ---------------------------------------------------------- */

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