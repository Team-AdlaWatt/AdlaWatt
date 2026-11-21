import { BATTERY_CAPACITY_WH } from "@/constants/battery";
import {
  evaluateSelection,
  normalizeBatteryForSelection,
  validateSelection,
  type SelectionAppliance,
} from "@/services/recommendationSelection";
import type { BatteryStateInput } from "@/services/recommendation";

const freshBattery = (
  overrides: Partial<BatteryStateInput> = {},
): BatteryStateInput => ({
  soc: 80,
  voltage: 12.6,
  remainingWh: 600,
  dod: "Safe",
  lastUpdated: Date.now(),
  ...overrides,
});

const led: SelectionAppliance = {
  id: "catalog:general:led-light-bulb",
  name: "LED Light Bulb",
  watts: "3-18W",
  area: "General",
};

describe("validateSelection", () => {
  test("dedupes ids and enforces the three-item cap", () => {
    const result = validateSelection([
      "a",
      "b",
      "a",
      "c",
      "d",
    ]);

    expect(result).toEqual({
      valid: false,
      ids: ["a", "b", "c"],
      rejected: ["d"],
    });
  });
});

describe("normalizeBatteryForSelection", () => {
  test("blocks missing, offline, and stale readings", () => {
    expect(
      normalizeBatteryForSelection(null).status,
    ).toBe("waiting");
    expect(
      normalizeBatteryForSelection(
        freshBattery(),
        false,
      ).reasonKey,
    ).toBe("offline");
    expect(
      normalizeBatteryForSelection(
        freshBattery({
          lastUpdated:
            Date.now() - 61_000,
        }),
      ).reasonKey,
    ).toBe("stale");
  });
});

describe("evaluateSelection", () => {
  test("reports remaining percent from usable Wh over full capacity", () => {
    const result = evaluateSelection(
      freshBattery(),
      [led],
      { alternativesLimit: 0 },
    );

    expect(result.status).toBe("ready");
    expect(result.remainingPercent).toBe(
      Math.round((456 / BATTERY_CAPACITY_WH) * 100),
    );
    expect(result.runtimeLabel).toMatch(
      /^\d+h \d{2}m$/,
    );
  });

  test("returns waiting when nothing is selected", () => {
    const result = evaluateSelection(
      freshBattery(),
      [],
    );

    expect(result.status).toBe("waiting");
    expect(result.reasonKey).toBe("empty");
    expect(result.verdict).toBeNull();
  });

  test("blocks more than three selections", () => {
    const result = evaluateSelection(
      freshBattery(),
      [
        led,
        {
          id: "fan",
          name: "Fan",
          watts: "35-75W",
        },
        {
          id: "router",
          name: "Router",
          watts: "5-20W",
        },
        {
          id: "tv",
          name: "TV",
          watts: "30-80W",
        },
      ],
      { alternativesLimit: 0 },
    );

    expect(result.status).toBe("tooMany");
    expect(result.reasonKey).toBe("tooMany");
    expect(result.verdict).toBeNull();
  });

  test("blocks unsafe battery readings", () => {
    const result = evaluateSelection(
      freshBattery({
        soc: 15,
        voltage: 12.0,
        remainingWh: 200,
      }),
      [led],
      { alternativesLimit: 0 },
    );

    expect(result.status).toBe("blocked");
    expect(result.reasonKey).toBe("blocked");
    expect(result.remainingPercent).toBeNull();
  });

  test("recommends a light catalog load", () => {
    const result = evaluateSelection(
      freshBattery(),
      [led],
      { alternativesLimit: 0 },
    );

    expect(result.verdict).toBe("recommended");
    expect(result.reasonKey).toBe("recommended");
    expect(result.totalMidWatts).toBe(11);
  });

  test("rejects a combined peak above the charge-scaled cap", () => {
    const result = evaluateSelection(
      freshBattery(),
      [
        {
          id: "heavy",
          name: "Heavy Load",
          watts: "500-500W",
        },
      ],
      { alternativesLimit: 0 },
    );

    expect(result.verdict).toBe("notRecommended");
    expect(result.reasonKey).toBe("overCap");
    expect(result.combinedPeakWatts).toBe(500);
  });
});
