// Monitoring schema contract tests.
//
// The typed row below is the canary: TypeScript fails if a
// database column is added to MonitoringRow without updating
// the list, and the first test fails if the JSON column list
// and MonitoringRow keys diverge.

import {
  BATTERY_STATUS_VALUES,
  DEVICE_STATUS_VALUES,
  DOD_STATUS_VALUES,
  INTERNAL_MONITORING_COLUMNS,
  MONITORING_COLUMNS,
  MONITORING_CONTRACT_COMPLETE,
  MONITORING_DATA_KEYS_VALID,
  MONITORING_RAW_TO_UI,
  MONITORING_SCHEMA_VERSION,
  MONITORING_SELECT,
  NON_UI_MONITORING_COLUMNS,
  SOLAR_STATUS_VALUES,
  SOLAR_TEMPERATURE_STATUS_VALUES,
  TEMPERATURE_STATUS_VALUES,
  getMissingMonitoringColumns,
  isBatteryReadingError,
  isMonitoringRow,
  normalizeMonitoringRow,
  type MonitoringRow,
} from "@/services/monitoringSchema";

const row: MonitoringRow = {
  monitor_id: 1,
  user_id: "user-1",
  "INA219 Voltage Percentage": 80,
  "INA219 Load Battery status": "Charging",
  "INA219 Load battery time remaining": "5h 00m",
  "INA219 Solar Side input": 100,
  "INA219 Solar Side timer": "00:00:00",
  "INA219 Solar Side voltage": 18,
  "INA219 Solar Side current": 5,
  "INA219 Load Side total energy": 1200,
  "INA219 Solar Side solar status": "Moderate",
  "INA219 Load Side battery load": 50,
  "ESP32S3 Status": "Online",
  "ESP32S3 Last seen": "2026-11-12T10:00:00.000Z",
  "INA219 Load Side dod_status": "Safe",
  "DS18B20 2 Solar Temp": 35,
  "DS18B20 2 Solar Temp Status": "Nominal",
  "DHT22 Interior Temp": 28,
  "DHT22 Interior Temp Status": "Nominal",
  "INA219 Voltage": 12.6,
  "INA219 Load Side battery watt_hour": 500,
  cumulative_energy_input_wh: 1000,
  cumulative_energy_output_wh: 900,
  heartbeat_expires_at:
    "2026-11-12T10:00:10.000Z",
  "ESP32S3 Sampled at":
    "2026-11-12T10:00:00.000Z",
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
      ...Object.keys(MONITORING_RAW_TO_UI),
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
      "Cycle",
      "Idle",
      "Reading Error",
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
    expect(MONITORING_SCHEMA_VERSION).toBe(7);
  });

  test("recognizes the Reading Error battery status", () => {
    expect(
      isBatteryReadingError("Reading Error"),
    ).toBe(true);
    expect(
      isBatteryReadingError("Discharging"),
    ).toBe(false);
    expect(
      isBatteryReadingError(null),
    ).toBe(false);
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
      "ESP32S3 Last seen": _lastSeen,
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
      "ESP32S3 Last seen",
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
      dod_status: null,
      solar_temperature: null,
      solar_temperature_status: null,
      interior_temp: null,
      interior_temp_status: null,
      last_seen: null,
      heartbeat_expires_at: null,
    });
  });

  test("coerces numeric strings and keeps valid statuses", () => {
    const normalized =
      normalizeMonitoringRow({
        ...row,
        "INA219 Voltage Percentage": "42",
        "DHT22 Interior Temp": "31.5",
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

  test("keeps the Reading Error battery status", () => {
    const normalized =
      normalizeMonitoringRow({
        ...row,
        "INA219 Load Battery status":
          "Reading Error",
      });

    expect(normalized.battery_status).toBe(
      "Reading Error",
    );
  });

  test("keeps the Cycle battery status", () => {
    const normalized =
      normalizeMonitoringRow({
        ...row,
        "INA219 Load Battery status": "Cycle",
      });

    expect(normalized.battery_status).toBe(
      "Cycle",
    );
  });

  test("accepts critical solar and interior variants", () => {
    const normalized =
      normalizeMonitoringRow({
        ...row,
        "DS18B20 2 Solar Temp Status":
          "Critical (rapid rise)",
        "DHT22 Interior Temp Status":
          "Critical (sensor fault)",
      });

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
        "INA219 Load Battery status": "Bogus",
        "ESP32S3 Status": "Unknown",
        "DS18B20 2 Solar Temp Status": "Hot",
        "ESP32S3 Last seen": "not-a-date",
        heartbeat_expires_at: "not-a-date",
      });

    expect(normalized.battery_status).toBeNull();
    expect(normalized.device_status).toBeNull();
    expect(
      normalized.solar_temperature_status,
    ).toBeNull();
    expect(normalized.last_seen).toBeNull();
    expect(
      normalized.heartbeat_expires_at,
    ).toBeNull();
  });

  test("preserves a missing DoD instead of deriving it", () => {
    expect(
      normalizeMonitoringRow({
        ...row,
        "INA219 Load Side dod_status": null,
        "INA219 Voltage Percentage": 10,
      }).dod_status,
    ).toBeNull();
  });
});
