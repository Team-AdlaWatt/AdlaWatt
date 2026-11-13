import monitoringColumnList from "@/services/monitoringColumns.json";

declare const __DEV__: boolean | undefined;

// ============================================================
// MONITORING SCHEMA CONTRACT
// ============================================================
//
// Single app-side source of truth for the live
// `public.monitoring` table. The column list lives in
// `monitoringColumns.json` so the runtime drift script can
// read the same list without importing TypeScript.
//
// Keep `MonitoringRow` in sync with the database. The Jest
// contract test builds a full `MonitoringRow` fixture and
// asserts the JSON list matches its keys exactly, so adding,
// removing, or renaming a column fails typecheck or tests.
// ============================================================

export const MONITORING_SCHEMA_VERSION = 3;

// The database allows a distinct set of status values per
// temperature sensor. The battery sensor cannot have a rapid
// rise, while the solar and interior sensors can.

export type BatteryTemperatureStatus =
  | "Nominal"
  | "Elevated"
  | "High"
  | "Critical"
  | "Critical (sensor fault)";

export type SolarTemperatureStatus =
  | "Nominal"
  | "Elevated"
  | "High"
  | "Critical"
  | "Critical (rapid rise)"
  | "Critical (sensor fault)";

export type InteriorTemperatureStatus = SolarTemperatureStatus;

// Shared alias for display helpers that accept any sensor.
export type TemperatureStatus =
  | BatteryTemperatureStatus
  | SolarTemperatureStatus;

export type DeviceStatus =
  | "Online"
  | "Offline";

export type BatteryStatus =
  | "Charging"
  | "Discharging"
  | "Idle";

export type SolarStatus =
  | "Low"
  | "Moderate"
  | "High";

export type DoDStatus =
  | "Safe"
  | "Unsafe";

export const BATTERY_TEMPERATURE_STATUS_VALUES = [
  "Nominal",
  "Elevated",
  "High",
  "Critical",
  "Critical (sensor fault)",
] as const satisfies readonly BatteryTemperatureStatus[];

export const SOLAR_TEMPERATURE_STATUS_VALUES = [
  "Nominal",
  "Elevated",
  "High",
  "Critical",
  "Critical (rapid rise)",
  "Critical (sensor fault)",
] as const satisfies readonly SolarTemperatureStatus[];

export const INTERIOR_TEMPERATURE_STATUS_VALUES =
  SOLAR_TEMPERATURE_STATUS_VALUES;

// Union of every temperature status value. Kept for the
// runtime drift script and shared display logic.
export const TEMPERATURE_STATUS_VALUES = [
  "Nominal",
  "Elevated",
  "High",
  "Critical",
  "Critical (rapid rise)",
  "Critical (sensor fault)",
] as const satisfies readonly TemperatureStatus[];

export const DEVICE_STATUS_VALUES = [
  "Online",
  "Offline",
] as const satisfies readonly DeviceStatus[];

export const BATTERY_STATUS_VALUES = [
  "Charging",
  "Discharging",
  "Idle",
] as const satisfies readonly BatteryStatus[];

export const SOLAR_STATUS_VALUES = [
  "Low",
  "Moderate",
  "High",
] as const satisfies readonly SolarStatus[];

export const DOD_STATUS_VALUES = [
  "Safe",
  "Unsafe",
] as const satisfies readonly DoDStatus[];

// ============================================================
// RAW ROW (all 25 live columns)
// ============================================================

export interface MonitoringRow {
  monitor_id: number;
  user_id: string;
  battery_level: number | null;
  battery_status: string | null;
  time_remaining: string | null;
  solar_input: number | null;
  solar_timer: string | null;
  solar_voltage: number | null;
  solar_current: number | null;
  total_energy: number | null;
  solar_status: string | null;
  current_load: number | null;
  device_status: string | null;
  last_seen: string | null;
  battery_temperature: number | null;
  battery_temperature_status: string | null;
  dod_status: string | null;
  solar_temperature: number | null;
  solar_temperature_status: string | null;
  interior_temp: number | null;
  interior_temp_status: string | null;
  voltage: number | null;
  watt_hours: number | null;
  cumulative_energy_input_wh: number | null;
  cumulative_energy_output_wh: number | null;
}

export type MonitoringColumn = keyof MonitoringRow;

export const MONITORING_COLUMNS: readonly MonitoringColumn[] =
  monitoringColumnList as MonitoringColumn[];

export const MONITORING_SELECT =
  MONITORING_COLUMNS.join(",");

// ============================================================
// NORMALIZED UI MODEL
// ============================================================

export interface MonitoringData {
  battery_level: number | null;
  battery_status: BatteryStatus | null;
  time_remaining: string | null;
  voltage: number | null;
  watt_hours: number | null;
  current_load: number | null;
  device_status: DeviceStatus | null;

  solar_input: number | null;
  solar_status: SolarStatus | null;
  solar_timer: string | null;
  solar_voltage: number | null;
  solar_current: number | null;
  total_energy: number | null;

  battery_temperature: number | null;
  battery_temperature_status: BatteryTemperatureStatus | null;

  dod_status: DoDStatus | null;

  solar_temperature: number | null;
  solar_temperature_status: SolarTemperatureStatus | null;

  interior_temp: number | null;
  interior_temp_status: InteriorTemperatureStatus | null;

  last_seen: string | null;
}

// Columns that are intentionally not part of the UI model.
// They stay in the raw row so the app still reads and
// validates every database column.

export const INTERNAL_MONITORING_COLUMNS = [
  "monitor_id",
  "user_id",
] as const satisfies readonly MonitoringColumn[];

export const NON_UI_MONITORING_COLUMNS = [
  "cumulative_energy_input_wh",
  "cumulative_energy_output_wh",
] as const satisfies readonly MonitoringColumn[];

// ============================================================
// COMPILE-TIME CONTRACT CHECKS
// ============================================================

type AccountedColumn =
  | keyof MonitoringData
  | (typeof INTERNAL_MONITORING_COLUMNS)[number]
  | (typeof NON_UI_MONITORING_COLUMNS)[number];

type UnaccountedColumn =
  Exclude<MonitoringColumn, AccountedColumn>;

type InvalidDataColumn =
  Exclude<keyof MonitoringData, MonitoringColumn>;

// These constants are typed `true` only while every raw
// column is either displayed or explicitly excluded, and
// every displayed field exists in the raw row.

export const MONITORING_CONTRACT_COMPLETE:
  [UnaccountedColumn] extends [never]
    ? true
    : false = true;

export const MONITORING_DATA_KEYS_VALID:
  [InvalidDataColumn] extends [never]
    ? true
    : false = true;

// ============================================================
// ROW GUARDS
// ============================================================

const isDevelopment = (): boolean =>
  typeof __DEV__ !== "undefined" && __DEV__ === true;

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value);

export const getMissingMonitoringColumns = (
  value: unknown,
): MonitoringColumn[] => {
  if (!isRecord(value)) {
    return [...MONITORING_COLUMNS];
  }

  return MONITORING_COLUMNS.filter(
    (column) => !(column in value),
  );
};

export const isMonitoringRow = (
  value: unknown,
): value is MonitoringRow =>
  isRecord(value) &&
  getMissingMonitoringColumns(value).length === 0;

// ============================================================
// NORMALIZATION
// ============================================================

const normalizeNumber = (
  value: unknown,
  field: string,
): number | null => {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (isDevelopment() && value != null) {
    console.warn(
      `[monitoring] Invalid numeric value for ${field}:`,
      value,
    );
  }

  return null;
};

const normalizeText = (
  value: unknown,
  field: string,
): string | null => {
  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    return value;
  }

  if (isDevelopment() && value != null) {
    console.warn(
      `[monitoring] Invalid text value for ${field}:`,
      value,
    );
  }

  return null;
};

const normalizeStatus = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | null => {
  if (
    typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
  ) {
    return value as T;
  }

  if (isDevelopment() && value != null) {
    console.warn(
      `[monitoring] Unexpected ${field} value:`,
      value,
    );
  }

  return null;
};

const normalizeTimestamp = (
  value: unknown,
  field: string,
): string | null => {
  if (value == null || value === "") {
    return null;
  }

  if (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value))
  ) {
    return value;
  }

  if (isDevelopment()) {
    console.warn(
      `[monitoring] Invalid timestamp for ${field}:`,
      value,
    );
  }

  return null;
};

export const normalizeMonitoringRow = (
  value: unknown,
): MonitoringData => {
  const row = isRecord(value) ? value : {};

  return {
    battery_level: normalizeNumber(
      row.battery_level,
      "battery_level",
    ),

    battery_status: normalizeStatus(
      row.battery_status,
      BATTERY_STATUS_VALUES,
      "battery_status",
    ),

    time_remaining: normalizeText(
      row.time_remaining,
      "time_remaining",
    ),

    voltage: normalizeNumber(
      row.voltage,
      "voltage",
    ),

    watt_hours: normalizeNumber(
      row.watt_hours,
      "watt_hours",
    ),

    current_load: normalizeNumber(
      row.current_load,
      "current_load",
    ),

    device_status: normalizeStatus(
      row.device_status,
      DEVICE_STATUS_VALUES,
      "device_status",
    ),

    solar_input: normalizeNumber(
      row.solar_input,
      "solar_input",
    ),

    solar_status: normalizeStatus(
      row.solar_status,
      SOLAR_STATUS_VALUES,
      "solar_status",
    ),

    solar_timer: normalizeText(
      row.solar_timer,
      "solar_timer",
    ),

    solar_voltage: normalizeNumber(
      row.solar_voltage,
      "solar_voltage",
    ),

    solar_current: normalizeNumber(
      row.solar_current,
      "solar_current",
    ),

    total_energy: normalizeNumber(
      row.total_energy,
      "total_energy",
    ),

    battery_temperature: normalizeNumber(
      row.battery_temperature,
      "battery_temperature",
    ),

    battery_temperature_status: normalizeStatus(
      row.battery_temperature_status,
      BATTERY_TEMPERATURE_STATUS_VALUES,
      "battery_temperature_status",
    ),

    dod_status: normalizeStatus(
      row.dod_status,
      DOD_STATUS_VALUES,
      "dod_status",
    ),

    solar_temperature: normalizeNumber(
      row.solar_temperature,
      "solar_temperature",
    ),

    solar_temperature_status: normalizeStatus(
      row.solar_temperature_status,
      SOLAR_TEMPERATURE_STATUS_VALUES,
      "solar_temperature_status",
    ),

    interior_temp: normalizeNumber(
      row.interior_temp,
      "interior_temp",
    ),

    interior_temp_status: normalizeStatus(
      row.interior_temp_status,
      INTERIOR_TEMPERATURE_STATUS_VALUES,
      "interior_temp_status",
    ),

    last_seen: normalizeTimestamp(
      row.last_seen,
      "last_seen",
    ),
  };
};
