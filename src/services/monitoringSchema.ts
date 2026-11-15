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
  "INA219 Voltage Percentage": number | null;
  "INA228 Load Battery status": string | null;
  "INA228 Load battery time remaining": string | null;
  "INA228 Solar Side input": number | null;
  "INA228 Solar Side timer": string | null;
  "INA228 Solar Side voltage": number | null;
  "INA228 Solar Side current": number | null;
  "INA228 Load Side total energy": number | null;
  "INA228 Solar Side solar status": string | null;
  "INA228 Load Side battery load": number | null;
  "ESP32S3 Status": string | null;
  "ESP32S3 Last seen": string | null;
  "DS18B20 1 Battery Temp": number | null;
  "DS18B20 1 Battery Temp Status": string | null;
  "INA228 Load Side dod_status": string | null;
  "DS18B20 2 Solar Temp": number | null;
  "DS18B20 2 Solar Temp Status": string | null;
  "DHT22 Interior Temp": number | null;
  "DHT22 Interior Temp Status": string | null;
  "INA219 Voltage": number | null;
  "INA228 Load Side battery watt_hour": number | null;
  cumulative_energy_input_wh: number | null;
  cumulative_energy_output_wh: number | null;
}

export type MonitoringColumn = keyof MonitoringRow;

export const MONITORING_COLUMNS: readonly MonitoringColumn[] =
  monitoringColumnList as MonitoringColumn[];

const quoteMonitoringColumn = (
  column: string,
): string =>
  `"${column.replace(/"/g, '""')}"`;

export const MONITORING_SELECT = MONITORING_COLUMNS.map(
  quoteMonitoringColumn,
).join(",");

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

type InternalMonitoringColumn =
  (typeof INTERNAL_MONITORING_COLUMNS)[number];

type NonUiMonitoringColumn =
  (typeof NON_UI_MONITORING_COLUMNS)[number];

// Raw database column names no longer match the UI field
// names, so the renamed columns are mapped explicitly here.

type RenamedMonitoringColumn = Exclude<
  MonitoringColumn,
  InternalMonitoringColumn | NonUiMonitoringColumn
>;

export const MONITORING_RAW_TO_UI = {
  "INA219 Voltage Percentage": "battery_level",
  "INA228 Load Battery status": "battery_status",
  "INA228 Load battery time remaining": "time_remaining",
  "INA228 Solar Side input": "solar_input",
  "INA228 Solar Side timer": "solar_timer",
  "INA228 Solar Side voltage": "solar_voltage",
  "INA228 Solar Side current": "solar_current",
  "INA228 Load Side total energy": "total_energy",
  "INA228 Solar Side solar status": "solar_status",
  "INA228 Load Side battery load": "current_load",
  "ESP32S3 Status": "device_status",
  "ESP32S3 Last seen": "last_seen",
  "DS18B20 1 Battery Temp": "battery_temperature",
  "DS18B20 1 Battery Temp Status": "battery_temperature_status",
  "INA228 Load Side dod_status": "dod_status",
  "DS18B20 2 Solar Temp": "solar_temperature",
  "DS18B20 2 Solar Temp Status": "solar_temperature_status",
  "DHT22 Interior Temp": "interior_temp",
  "DHT22 Interior Temp Status": "interior_temp_status",
  "INA219 Voltage": "voltage",
  "INA228 Load Side battery watt_hour": "watt_hours",
} as const satisfies Record<
  RenamedMonitoringColumn,
  keyof MonitoringData
>;

// ============================================================
// COMPILE-TIME CONTRACT CHECKS
// ============================================================

type AccountedColumn =
  | keyof typeof MONITORING_RAW_TO_UI
  | InternalMonitoringColumn
  | NonUiMonitoringColumn;

type UnaccountedColumn =
  Exclude<MonitoringColumn, AccountedColumn>;

type MappedUiColumn =
  (typeof MONITORING_RAW_TO_UI)[RenamedMonitoringColumn];

type InvalidDataColumn =
  Exclude<keyof MonitoringData, MappedUiColumn>;

// These constants are typed `true` only while every raw
// column is either mapped or explicitly excluded, and
// every displayed field is mapped from a raw column.

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

const normalizeMonitoringDataFields = (
  row: Record<string, unknown>,
): MonitoringData => ({
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
});

// Normalizes a cached canonical `MonitoringData` object. The
// cache stores UI-shaped data, so it must not go through the
// raw-column mapping.
export const normalizeMonitoringData = (
  value: unknown,
): MonitoringData =>
  normalizeMonitoringDataFields(
    isRecord(value) ? value : {},
  );

// Normalizes a raw `public.monitoring` row by translating the
// renamed database columns into the canonical UI fields.
export const normalizeMonitoringRow = (
  value: unknown,
): MonitoringData => {
  const row = isRecord(value) ? value : {};
  const canonical: Record<string, unknown> = {};

  for (const [rawColumn, uiField] of Object.entries(
    MONITORING_RAW_TO_UI,
  )) {
    canonical[uiField] = row[rawColumn];
  }

  return normalizeMonitoringDataFields(canonical);
};
