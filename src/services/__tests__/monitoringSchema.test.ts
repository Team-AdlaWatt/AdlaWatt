// Monitoring schema contract tests.
//
// The typed row below is the canary: TypeScript fails if a
// database column is added to MonitoringRow without updating
// the list, and the first test fails if the JSON column list
// and MonitoringRow keys diverge.

import {
  BATTERY_STATUS_VALUES,
  BATTERY_TEMPERATURE_STATUS_VALUES,
  DEVICE_STATUS_VALUES,
  DOD_STATUS_VALUES,
  INTERNAL_MONITORING_COLUMNS,
  MONITORING_COLUMNS,
  MONITORING_CONTRACT_COMPLETE,
  MONITORING_DATA_KEYS_VALID,
  MONITORING_SCHEMA_VERSION,
  MONITORING_SELECT,
  NON_UI_MONITORING_COLUMNS,
  SOLAR_STATUS_VALUES,
  SOLAR_TEMPERATURE_STATUS_VALUES,
  TEMPERATURE_STATUS_VALUES,
  getMissingMonitoringColumns,
  isMonitoringRow,
  normalizeMonitoringRow,
  type MonitoringRow,
} from "@/services/monitoringSchema";

const row: MonitoringRow = {
  monitor_id: 1,
  user_id: "user-1",
  battery_level: 80,
  battery_status: "Charging",
  time_remaining: "5h 00m",
  solar_input: 100,
  solar_timer: "00:00:00",
  solar_voltage: 18,
  solar_current: 5,
  total_energy: 1200,
  solar_status: "Moderate",
  current_load: 50,
  device_status: "Online",
  last_seen: "2026-11-12T10:00:00.000Z",
  battery_temperature: 30,
  battery_temperature_status: "Nominal",
  dod_status: "Safe",
  solar_temperature: 35,
  solar_temperature_status: "Nominal",
  interior_temp: 28,
  interior_temp_status: "Nominal",
  voltage: 12.6,
  watt_hours: 500,
  cumulative_energy_input_wh: 1000,
  cumulative_energy_output_wh: 900,
};

describe("monitoring column contract", () => {
  test("JSON column list matches MonitoringRow exactly", () => {
    expect(
      [...MONITORING_COLUMNS].sort(),
    ).toEqual(
      Object.keys(row).sort(),
    );
  });

  test("all 25 columns are selected", () => {
    expect(MONITORING_COLUMNS).toHaveLength(25);
    expect(
      MONITORING_SELECT.split(","),
    ).toHaveLength(25);
  });

  test("every column is displayed or explicitly excluded", () => {
    const accounted = new Set<string>([
      ...Object.keys(normalizeMonitoringRow(row)),
      ...INTERNAL_MONITORING_COLUMNS,
      ...NON_UI_MONITORING_COLUMNS,
    ]);

    for (const column of MONITORING_COLUMNS) {
      expect(accounted.has(column)).toBe(true);
    }

    expect(MONITORING_CONTRACT_COMPLETE).toBe(true);
    expect(MONITORING_DATA_KEYS_VALID).toBe(true);
  });

  test("pins the allowed status values", () => {
    expect(DEVICE_STATUS_VALUES).toEqual([
      "Online",
      "Offline",
    ]);
    expect(BATTERY_STATUS_VALUES).toEqual([
      "Charging",
      "Discharging",
      "Idle",
    ]);
    expect(SOLAR_STATUS_VALUES).toEqual([
      "Low",
      "Moderate",
      "High",
    ]);
    expect(TEMPERATURE_STATUS_VALUES).toEqual([
      "Nominal",
      "Elevated",
      "High",
      "Critical",
      "Critical (rapid rise)",
      "Critical (sensor fault)",
    ]);
    expect(
      BATTERY_TEMPERATURE_STATUS_VALUES,
    ).toEqual([
      "Nominal",
      "Elevated",
      "High",
      "Critical",
      "Critical (sensor fault)",
    ]);
    expect(
      SOLAR_TEMPERATURE_STATUS_VALUES,
    ).toEqual([
      "Nominal",
      "Elevated",
      "High",
      "Critical",
      "Critical (rapid rise)",
      "Critical (sensor fault)",
    ]);
    expect(DOD_STATUS_VALUES).toEqual([
      "Safe",
      "Unsafe",
    ]);
    expect(MONITORING_SCHEMA_VERSION).toBe(3);
  });
});

describe("row guard", () => {
  test("accepts a complete row", () => {
    expect(isMonitoringRow(row)).toBe(true);
    expect(
      getMissingMonitoringColumns(row),
    ).toEqual([]);
  });

  test("reports missing columns", () => {
    const {
      last_seen: _lastSeen,
      cumulative_energy_input_wh:
        _input,
      ...partial
    } = row;

    expect(isMonitoringRow(partial)).toBe(
      false,
    );
    expect(
      getMissingMonitoringColumns(partial),
    ).toEqual([
      "last_seen",
      "cumulative_energy_input_wh",
    ]);
  });

  test("non-objects report every column missing", () => {
    expect(
      getMissingMonitoringColumns(null),
    ).toHaveLength(25);
  });
});

describe("normalization", () => {
  test("empty input preserves nulls", () => {
    expect(
      normalizeMonitoringRow({}),
    ).toEqual({
      battery_level: null,
      battery_status: null,
      time_remaining: null,
      voltage: null,
      watt_hours: null,
      current_load: null,
      device_status: null,
      solar_input: null,
      solar_status: null,
      solar_timer: null,
      solar_voltage: null,
      solar_current: null,
      total_energy: null,
      battery_temperature: null,
      battery_temperature_status: null,
      dod_status: null,
      solar_temperature: null,
      solar_temperature_status: null,
      interior_temp: null,
      interior_temp_status: null,
      last_seen: null,
    });
  });

  test("coerces numeric strings and keeps valid statuses", () => {
    const normalized =
      normalizeMonitoringRow({
        ...row,
        battery_level: "42",
        interior_temp: "31.5",
      });

    expect(normalized.battery_level).toBe(42);
    expect(normalized.interior_temp).toBe(31.5);
    expect(normalized.battery_status).toBe(
      "Charging",
    );
    expect(
      normalized.interior_temp_status,
    ).toBe("Nominal");
  });

  test("accepts the new critical temperature variants", () => {
    const normalized =
      normalizeMonitoringRow({
        ...row,
        battery_temperature_status:
          "Critical (sensor fault)",
        solar_temperature_status:
          "Critical (rapid rise)",
        interior_temp_status:
          "Critical (sensor fault)",
      });

    expect(
      normalized.battery_temperature_status,
    ).toBe("Critical (sensor fault)");
    expect(
      normalized.solar_temperature_status,
    ).toBe("Critical (rapid rise)");
    expect(
      normalized.interior_temp_status,
    ).toBe("Critical (sensor fault)");
  });

  test("falls back to null on invalid statuses and timestamps", () => {
    jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const normalized =
      normalizeMonitoringRow({
        ...row,
        battery_status: "Bogus",
        device_status: "Unknown",
        battery_temperature_status: "Hot",
        last_seen: "not-a-date",
      });

    expect(normalized.battery_status).toBeNull();
    expect(normalized.device_status).toBeNull();
    expect(
      normalized.battery_temperature_status,
    ).toBeNull();
    expect(normalized.last_seen).toBeNull();
  });

  test("preserves a missing DoD instead of deriving it", () => {
    expect(
      normalizeMonitoringRow({
        ...row,
        dod_status: null,
        battery_level: 10,
      }).dod_status,
    ).toBeNull();
  });
});
