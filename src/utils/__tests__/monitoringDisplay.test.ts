// Monitoring display helper tests: null temperatures must read
// as a sensor fault, other nulls as "--", and last_seen must
// degrade gracefully to the unavailable copy.

import {
  MISSING_VALUE,
  SENSOR_FAULT_VALUE,
  formatLastSeen,
  formatMetric,
  fitTextFontSize,
  formatTemperature,
  formatTemperatureStatusLabel,
  getMonitoringFreshness,
  hasTemperatureReading,
  isDbReadingFresh,
  isDeviceOnline,
  monitoringLastSeenMs,
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

describe("temperature status label", () => {
  test("shortens only the sensor fault status for display", () => {
    expect(
      formatTemperatureStatusLabel(
        "Critical (sensor fault)",
      ),
    ).toBe("Critical");
    expect(
      formatTemperatureStatusLabel(
        "Critical (rapid rise)",
      ),
    ).toBe("Critical (rapid rise)");
    expect(formatTemperatureStatusLabel("Critical")).toBe(
      "Critical",
    );
    expect(formatTemperatureStatusLabel("Nominal")).toBe(
      "Nominal",
    );
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

describe("fit text font size", () => {
  test("keeps the current size when the text already fits", () => {
    expect(fitTextFontSize(80, 88, 30, 10)).toBe(30);
    expect(fitTextFontSize(88, 88, 30, 10)).toBe(30);
    expect(fitTextFontSize(0, 88, 30, 10)).toBe(30);
  });

  test("shrinks long values proportionally", () => {
    expect(fitTextFontSize(140, 88, 30, 10)).toBe(18);
    expect(fitTextFontSize(98, 88, 21, 10)).toBe(18);
  });

  test("never shrinks below the minimum", () => {
    expect(fitTextFontSize(400, 88, 18, 10)).toBe(10);
    expect(fitTextFontSize(400, 88, 8, 10)).toBe(8);
  });
});

describe("device online", () => {
  test("uses device_status as the only online signal", () => {
    expect(isDeviceOnline("Online")).toBe(true);
    expect(isDeviceOnline("Offline")).toBe(false);
    expect(isDeviceOnline(null)).toBe(false);
    expect(isDeviceOnline(undefined)).toBe(false);
    expect(isDeviceOnline("")).toBe(false);
    expect(isDeviceOnline("ONLINE")).toBe(false);
    expect(isDeviceOnline("Connecting")).toBe(false);
  });
});

describe("monitoring snapshot freshness", () => {
  test("parses last_seen and ranks missing/invalid as oldest", () => {
    const older = new Date(NOW - 4_000).toISOString();
    const newer = new Date(NOW - 2_000).toISOString();

    expect(monitoringLastSeenMs({ last_seen: older })).toBe(
      NOW - 4_000,
    );
    expect(
      monitoringLastSeenMs({ last_seen: newer }) >
        monitoringLastSeenMs({ last_seen: older }),
    ).toBe(true);
    expect(monitoringLastSeenMs({ last_seen: null })).toBe(
      Number.NEGATIVE_INFINITY,
    );
    expect(monitoringLastSeenMs({ last_seen: "" })).toBe(
      Number.NEGATIVE_INFINITY,
    );
    expect(
      monitoringLastSeenMs({ last_seen: "not-a-date" }),
    ).toBe(Number.NEGATIVE_INFINITY);
    expect(monitoringLastSeenMs(null)).toBe(
      Number.NEGATIVE_INFINITY,
    );
    expect(monitoringLastSeenMs(undefined)).toBe(
      Number.NEGATIVE_INFINITY,
    );
  });
});

describe("database reading freshness", () => {
  const freshRow = {
    device_status: "Online",
    heartbeat_expires_at: new Date(
      NOW + 5_000,
    ).toISOString(),
  };

  test("accepts only Online rows with unexpired heartbeats", () => {
    expect(
      getMonitoringFreshness(freshRow, NOW),
    ).toEqual({ usable: true, reason: "ok" });
    expect(
      isDbReadingFresh(freshRow, NOW),
    ).toBe(true);
  });

  test("rejects offline, expired, missing, and invalid rows", () => {
    expect(
      getMonitoringFreshness(
        {
          ...freshRow,
          device_status: "Offline",
        },
        NOW,
      ),
    ).toEqual({ usable: false, reason: "offline" });

    expect(
      getMonitoringFreshness(
        {
          ...freshRow,
          heartbeat_expires_at: new Date(
            NOW - 1,
          ).toISOString(),
        },
        NOW,
      ),
    ).toEqual({ usable: false, reason: "expired" });

    expect(
      getMonitoringFreshness(
        {
          device_status: "Online",
          heartbeat_expires_at: null,
        },
        NOW,
      ),
    ).toEqual({ usable: false, reason: "missing" });

    expect(
      getMonitoringFreshness(
        {
          device_status: "Online",
          heartbeat_expires_at: "not-a-date",
        },
        NOW,
      ),
    ).toEqual({ usable: false, reason: "missing" });

    expect(
      getMonitoringFreshness(null, NOW),
    ).toEqual({ usable: false, reason: "missing" });
  });
});

describe("last seen display", () => {
  test("formats recent timestamps relatively", () => {
    expect(
      formatLastSeen(
        new Date(NOW - 9_000).toISOString(),
        NOW,
      ),
    ).toBe("just now");

    expect(
      formatLastSeen(
        new Date(NOW - 10_000).toISOString(),
        NOW,
      ),
    ).toBe("10s ago");

    expect(
      formatLastSeen(
        new Date(NOW - 30_000).toISOString(),
        NOW,
      ),
    ).toBe("30s ago");

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
