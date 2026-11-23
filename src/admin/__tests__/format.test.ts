// Admin formatter unit tests.
//
// Pins the shared placeholder/rounding/unit strings the
// three admin tabs render, so a formatter change cannot
// silently drift the dashboards apart. Locale-dependent
// timestamp output is only checked for presence, not exact
// text.

import {
  formatBatteryPercent,
  formatEnergyWh,
  formatHistoryLabel,
  formatLastUpdated,
  formatMetricValue,
  formatPowerW,
  formatSolarKwh,
  formatVoltage,
} from "@/admin/format";

describe("admin format helpers", () => {
  test("battery percent rounds and appends %", () => {
    expect(formatBatteryPercent(76.4)).toBe("76%");
    expect(formatBatteryPercent(76.5)).toBe("77%");
    expect(formatBatteryPercent(0)).toBe("0%");
    expect(formatBatteryPercent(null)).toBe("—");
  });

  test("voltage keeps two decimals and units", () => {
    expect(formatVoltage(12.5)).toBe("12.50 V");
    expect(formatVoltage(220.456)).toBe("220.46 V");
    expect(formatVoltage(null)).toBe("—");
  });

  test("solar watt-hours become one-decimal kWh", () => {
    expect(formatSolarKwh(4800)).toBe("4.8 kWh");
    expect(formatSolarKwh(0)).toBe("0.0 kWh");
  });

  test("last updated renders a string or the dash", () => {
    expect(formatLastUpdated(null)).toBe("—");

    const rendered =
      formatLastUpdated("2026-11-11T04:00:00Z");

    expect(rendered).not.toBe("—");
    expect(rendered.length).toBeGreaterThan(0);
  });

  test("small energy values stay in watt-hours", () => {
    expect(formatEnergyWh(0)).toBe("0.0 Wh");
    expect(formatEnergyWh(0.8)).toBe("0.8 Wh");
    expect(formatEnergyWh(4800)).toBe("4.8 kWh");
  });

  test("power keeps one decimal and a null dash", () => {
    expect(formatPowerW(0.6)).toBe("0.6 W");
    expect(formatPowerW(null)).toBe("—");
  });

  test("metric values use the correct unit", () => {
    expect(formatMetricValue("battery", 76.4)).toBe("76%");
    expect(formatMetricValue("solar", 0.1)).toBe("0.1 Wh");
    expect(formatMetricValue("load", 0.6)).toBe("0.6 W");
  });

  test("history labels follow the selected range", () => {
    const iso = "2026-11-23T12:33:18Z";

    expect(formatHistoryLabel(iso, 24)).not.toBe("");
    expect(formatHistoryLabel(iso, 168)).toMatch(/[A-Za-z]/);
    expect(formatHistoryLabel("invalid", 24)).toBe("");
  });
});
