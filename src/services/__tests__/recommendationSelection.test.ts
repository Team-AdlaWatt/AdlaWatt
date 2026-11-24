import {
  BATTERY_CAPACITY_WH,
  BATTERY_USABLE_WH,
  INVERTER_EFFICIENCY,
  INVERTER_IDLE_W,
} from "@/constants/battery";
import {
  evaluateSelection,
  normalizeBatteryForSelection,
  normalizeSelection,
  type SelectionAppliance,
} from "@/services/recommendationSelection";
import type { BatteryStateInput } from "@/services/recommendation";

const freshBattery = (
  overrides: Partial<BatteryStateInput> = {},
): BatteryStateInput => ({
  soc: 80,
  voltage: 12.6,
  remainingWh: BATTERY_CAPACITY_WH,
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

describe("normalizeSelection", () => {
  test("dedupes ids without limiting the count", () => {
    expect(
      normalizeSelection([
        "a",
        "b",
        "a",
        "c",
        "d",
        "e",
      ]),
    ).toEqual(["a", "b", "c", "d", "e"]);
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

  test("uses DB freshness when provided instead of lastUpdated", () => {
    const noTimestamp = freshBattery({
      lastUpdated: null,
    });

    expect(
      normalizeBatteryForSelection(
        noTimestamp,
        true,
        Date.now(),
        true,
      ).status,
    ).toBe("ready");

    expect(
      normalizeBatteryForSelection(
        freshBattery(),
        true,
        Date.now(),
        false,
      ).reasonKey,
    ).toBe("stale");
  });
});

describe("evaluateSelection", () => {
  test("reports remaining percent against the usable energy budget", () => {
    const result = evaluateSelection(
      freshBattery(),
      [led],
      { alternativesLimit: 0 },
    );

    expect(result.status).toBe("ready");
    expect(result.remainingPercent).toBe(100);
    expect(result.usableRemainingWh).toBe(
      BATTERY_USABLE_WH,
    );
    expect(result.usableCapacityWh).toBe(
      BATTERY_USABLE_WH,
    );
    expect(result.inverterIdleW).toBe(
      INVERTER_IDLE_W,
    );
    expect(result.inverterEfficiency).toBe(
      INVERTER_EFFICIENCY,
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

  test("evaluates more than three selections", () => {
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

    expect(result.status).toBe("ready");
    expect(result.verdict).not.toBeNull();
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
    expect(result.combinedPeakWatts).toBeCloseTo(
      500 / INVERTER_EFFICIENCY + INVERTER_IDLE_W,
      2,
    );
  });

  test("does not add the selected load on top of a measured load", () => {
    const result = evaluateSelection(
      freshBattery({ currentLoadW: 200 }),
      [led],
      { alternativesLimit: 0 },
    );

    expect(result.status).toBe("ready");
    expect(result.currentLoadW).toBe(200);
    expect(result.combinedPeakWatts).toBe(200);
    expect(result.runtimeHours).toBeCloseTo(
      result.usableRemainingWh / 200,
      1,
    );
  });
});
