// Monitoring display helper tests: null temperatures must read
// as a sensor fault, other nulls as "--", and last_seen must
// degrade gracefully to the unavailable copy.

import {
  DEVICE_ONLINE_WINDOW_MS,
  MISSING_VALUE,
  SENSOR_FAULT_VALUE,
  formatLastSeen,
  formatMetric,
  formatTemperature,
  hasTemperatureReading,
  isDeviceOnline,
} from "@/utils/monitoringDisplay";

const NOW = Date.parse(
  "2026-11-12T12:00:00.000Z",
);

describe("temperature display", () => {
  test("treats only null-like values as no reading", () => {
    expect(hasTemperatureReading(0)).toBe(true);
    expect(hasTemperatureReading(0.1)).toBe(true);
    expect(hasTemperatureReading(31)).toBe(true);
    expect(hasTemperatureReading(-1)).toBe(true);
    expect(hasTemperatureReading(null)).toBe(false);
    expect(
      hasTemperatureReading(undefined),
    ).toBe(false);
    expect(hasTemperatureReading(Number.NaN)).toBe(
      false,
    );
  });

  test("formats readings and reports null as a sensor fault", () => {
    expect(formatTemperature(31)).toBe("31°C");
    expect(formatTemperature(31.5)).toBe("31.5°C");
    expect(formatTemperature(-1)).toBe("-1°C");
    expect(formatTemperature(0)).toBe("0°C");
    expect(formatTemperature(null)).toBe(
      SENSOR_FAULT_VALUE,
    );
    expect(formatTemperature(undefined)).toBe(
      SENSOR_FAULT_VALUE,
    );
    expect(SENSOR_FAULT_VALUE).toBe("Sensor fault");
  });
});

describe("metric display", () => {
  test("renders values with units and null as --", () => {
    expect(formatMetric(12.6, "V")).toBe("12.6V");
    expect(formatMetric(0, "W")).toBe("0W");
    expect(formatMetric(1.234, "A", { decimals: 2 })).toBe(
      "1.23A",
    );
    expect(formatMetric(null, "Wh")).toBe(
      MISSING_VALUE,
    );
    expect(formatMetric(undefined, "W")).toBe(
      MISSING_VALUE,
    );
    expect(MISSING_VALUE).toBe("--");
  });
});

describe("device online", () => {
  test("requires a fresh last_seen and a non-Offline status", () => {
    const fresh = new Date(NOW - 10_000).toISOString();
    const stale = new Date(
      NOW - DEVICE_ONLINE_WINDOW_MS - 1,
    ).toISOString();

    expect(isDeviceOnline(fresh, "Online", NOW)).toBe(
      true,
    );
    expect(isDeviceOnline(fresh, null, NOW)).toBe(true);
    expect(isDeviceOnline(fresh, "Offline", NOW)).toBe(
      false,
    );
    expect(isDeviceOnline(stale, "Online", NOW)).toBe(
      false,
    );
    expect(isDeviceOnline(null, "Online", NOW)).toBe(
      false,
    );
    expect(isDeviceOnline("", "Online", NOW)).toBe(
      false,
    );
    expect(
      isDeviceOnline("not-a-date", "Online", NOW),
    ).toBe(false);
  });
});

describe("last seen display", () => {
  test("formats recent timestamps relatively", () => {
    expect(
      formatLastSeen(
        new Date(NOW - 30_000).toISOString(),
        NOW,
      ),
    ).toBe("just now");

    expect(
      formatLastSeen(
        new Date(NOW - 5 * 60_000).toISOString(),
        NOW,
      ),
    ).toBe("5m ago");

    expect(
      formatLastSeen(
        new Date(NOW - 3 * 60 * 60_000).toISOString(),
        NOW,
      ),
    ).toBe("3h ago");
  });

  test("formats older timestamps absolutely", () => {
    const formatted = formatLastSeen(
      new Date(
        NOW - 2 * 24 * 60 * 60_000,
      ).toISOString(),
      NOW,
    );

    expect(formatted).not.toBeNull();
    expect(formatted).not.toMatch(/ago$/);
    expect(formatted).toContain("2026");
  });

  test("returns null for missing or invalid timestamps", () => {
    expect(formatLastSeen(null, NOW)).toBeNull();
    expect(formatLastSeen("", NOW)).toBeNull();
    expect(
      formatLastSeen("not-a-date", NOW),
    ).toBeNull();
  });
});
