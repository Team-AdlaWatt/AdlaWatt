// Recommendation engine unit tests (pure module — no mocks).
//
// Locks the battery safety contract: 20% SoC cutoff, 151.2 Wh
// reserve floor, voltage guards, and the budget verdict bands
// the Appliances UI and notification rules both depend on.

import {
  BATTERY_NOMINAL_WH,
  BUDGET_CARE_MAX_RATIO,
  BUDGET_RECOMMENDED_MAX_RATIO,
  CAUTION_SOC,
  CAUTION_VOLTAGE,
  MAX_SAFE_LOAD_W,
  RESERVE_WH,
  UNSAFE_VOLTAGE,
  classifyBatteryState,
  computeDrainRatio,
  computeLoadStack,
  computeWattCap,
  estimateRuntime,
  estimateVoltageDrop,
  formatRuntimeLabel,
  parseWattageRange,
  recommendAppliance,
  recommendAppliances,
  verdictToBadge,
  type BatteryStateInput,
} from "@/services/recommendation";

const healthyBattery: BatteryStateInput =
  {
    soc: 80,
    voltage: 12.6,
    remainingWh: 600,
    dod: "Safe",
    // Fresh reading: the fail-safe blocks missing/stale
    // data, so every non-blocking case needs a timestamp.
    lastUpdated: Date.now(),
  };

describe("classifyBatteryState", () => {
  test("healthy battery is Safe with reserve subtracted", () => {
    const result = classifyBatteryState(
      healthyBattery,
    );

    expect(result.tier).toBe("Safe");
    expect(result.usableWh).toBe(
      600 - RESERVE_WH,
    );
    expect(result.blocked).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  test("SoC below cutoff is Unsafe and blocked", () => {
    const result = classifyBatteryState({
      soc: 15,
      voltage: 12.0,
      remainingWh: 200,
      dod: "Safe",
      lastUpdated: Date.now(),
    });

    expect(result.tier).toBe("Unsafe");
    expect(result.blocked).toBe(true);
    expect(
      result.reasons.join(" "),
    ).toMatch(/15%/);
  });

  test("exact cutoff boundary is Caution, not Unsafe", () => {
    const result = classifyBatteryState({
      soc: CAUTION_SOC,
      voltage: 12.0,
      remainingWh: 300,
      dod: "Safe",
      lastUpdated: Date.now(),
    });

    expect(result.tier).toBe("Caution");
    expect(result.blocked).toBe(false);
  });

  test("reserve floor boundary is Caution", () => {
    const result = classifyBatteryState({
      soc: 50,
      voltage: 12.0,
      remainingWh: RESERVE_WH,
      dod: "Safe",
      lastUpdated: Date.now(),
    });

    expect(result.tier).toBe("Caution");
    // usableWh hits exactly zero -> blocked despite tier.
    expect(result.usableWh).toBe(0);
    expect(result.blocked).toBe(true);
  });

  test("remaining energy below reserve is Unsafe", () => {
    const result = classifyBatteryState({
      soc: 50,
      voltage: 12.0,
      remainingWh: RESERVE_WH - 1,
      dod: "Safe",
      lastUpdated: Date.now(),
    });

    expect(result.tier).toBe("Unsafe");
    expect(result.usableWh).toBe(0);
    expect(result.blocked).toBe(true);
  });

  test("unsafe DoD overrides a healthy SoC", () => {
    const result = classifyBatteryState({
      ...healthyBattery,
      dod: "Unsafe",
    });

    expect(result.tier).toBe("Unsafe");
    expect(result.blocked).toBe(true);
  });

  test("critically low voltage overrides healthy SoC", () => {
    const result = classifyBatteryState({
      ...healthyBattery,
      voltage: UNSAFE_VOLTAGE,
    });

    expect(result.tier).toBe("Unsafe");
  });

  test("caution voltage band is Caution", () => {
    const result = classifyBatteryState({
      ...healthyBattery,
      voltage: CAUTION_VOLTAGE,
    });

    expect(result.tier).toBe("Caution");
  });

  test("unsafe signals accumulate reasons", () => {
    const result = classifyBatteryState({
      soc: 5,
      voltage: 9.0,
      remainingWh: 10,
      dod: "Unsafe",
      lastUpdated: Date.now(),
    });

    expect(result.reasons.length).toBeGreaterThanOrEqual(
      3,
    );
  });

  test("respects nominal capacity constant", () => {
    expect(BATTERY_NOMINAL_WH).toBe(756);
    expect(RESERVE_WH).toBe(151.2);
  });

  test("missing reading fails safe to Unsafe blocked", () => {
    const result = classifyBatteryState({
      ...healthyBattery,
      lastUpdated: null,
    });

    expect(result.tier).toBe("Unsafe");
    expect(result.usableWh).toBe(0);
    expect(result.blocked).toBe(true);
  });

  test("stale reading fails safe to Unsafe blocked", () => {
    const result = classifyBatteryState({
      ...healthyBattery,
      lastUpdated: Date.now() - 10 * 60 * 1000,
    });

    expect(result.tier).toBe("Unsafe");
    expect(result.blocked).toBe(true);
  });
});

describe("parseWattageRange", () => {
  test("range string splits into min/mid/max", () => {
    expect(
      parseWattageRange("35-75W"),
    ).toEqual({
      min: 35,
      mid: 55,
      max: 75,
    });
  });

  test("single value repeats across the range", () => {
    expect(
      parseWattageRange("50W"),
    ).toEqual({
      min: 50,
      mid: 50,
      max: 50,
    });
  });

  test("bare numbers without a unit parse", () => {
    expect(
      parseWattageRange("15-20"),
    ).toEqual({
      min: 15,
      mid: 18,
      max: 20,
    });
  });

  test.each(["", "   ", "abc", "0W", "0-0W"])(
    "invalid input %p returns null",
    (input) => {
      expect(
        parseWattageRange(input),
      ).toBeNull();
    },
  );
});

describe("runtime helpers", () => {
  test("estimateRuntime divides usable energy by watts", () => {
    expect(
      estimateRuntime(604.8, 100),
    ).toBeCloseTo(6.048);
  });

  test("estimateRuntime rejects non-positive inputs", () => {
    expect(estimateRuntime(0, 100)).toBe(0);
    expect(estimateRuntime(604.8, 0)).toBe(0);
    expect(
      estimateRuntime(NaN, 100),
    ).toBe(0);
  });

  test("formatRuntimeLabel all-day threshold", () => {
    expect(
      formatRuntimeLabel(70, 80),
    ).toBe("All day");
  });

  test("formatRuntimeLabel sub-10-minute threshold", () => {
    expect(
      formatRuntimeLabel(0.01, 0.05),
    ).toBe("<10 min");
  });

  test("formatRuntimeLabel single value uses tilde", () => {
    expect(
      formatRuntimeLabel(5, 5.01),
    ).toMatch(/^~5\.0 hrs$/);
  });

  test("formatRuntimeLabel range uses en dash", () => {
    expect(
      formatRuntimeLabel(2, 8),
    ).toBe("~2.0 – 8.0 hrs");
  });
});

describe("budget, cap, and voltage", () => {
  test("computeWattCap scales with charge", () => {
    expect(computeWattCap(100)).toBe(
      MAX_SAFE_LOAD_W,
    );
    expect(computeWattCap(50)).toBe(
      MAX_SAFE_LOAD_W / 2,
    );
    expect(computeWattCap(0)).toBe(0);
  });

  test("computeWattCap clamps outside 0-100", () => {
    expect(computeWattCap(150)).toBe(
      MAX_SAFE_LOAD_W,
    );
    expect(computeWattCap(-10)).toBe(0);
  });

  test("computeDrainRatio is mid watts over usable Wh", () => {
    expect(
      computeDrainRatio(100, 500),
    ).toBeCloseTo(0.2);
    expect(computeDrainRatio(100, 0)).toBe(
      0,
    );
  });

  test("estimateVoltageDrop is 0.1V per 50W", () => {
    expect(estimateVoltageDrop(50)).toBeCloseTo(
      0.1,
    );
    expect(estimateVoltageDrop(100)).toBeCloseTo(
      0.2,
    );
    expect(estimateVoltageDrop(0)).toBe(0);
  });

  test("verdictToBadge folds care into OK", () => {
    expect(
      verdictToBadge("recommended"),
    ).toBe("OK to use");
    expect(verdictToBadge("care")).toBe(
      "OK to use",
    );
    expect(
      verdictToBadge("notRecommended"),
    ).toBe("Not advisable");
  });
});

describe("recommendAppliance", () => {
  test("light appliance on healthy battery is recommended", () => {
    const result = recommendAppliance(
      healthyBattery,
      {
        id: "bulb",
        name: "LED Bulb",
        wattage: "7-15W",
      },
    );

    expect(result.verdict).toBe(
      "recommended",
    );
    expect(result.badgeLabel).toBe(
      "OK to use",
    );
    expect(result.reason).toBe(
      "Safe to use.",
    );
  });

  test("moderate draw lands in care band", () => {
    // usableWh 448.8; mid 60W -> ratio ~0.13 (10-25% band).
    const result = recommendAppliance(
      healthyBattery,
      {
        id: "fan",
        name: "Stand Fan",
        wattage: "45-75W",
      },
    );

    expect(result.verdict).toBe("care");
    expect(result.badgeLabel).toBe(
      "OK to use",
    );
    expect(result.drainRatio).toBeGreaterThan(
      BUDGET_RECOMMENDED_MAX_RATIO,
    );
    expect(result.drainRatio).toBeLessThanOrEqual(
      BUDGET_CARE_MAX_RATIO,
    );
  });

  test("heavy draw over 25%/hr is not recommended", () => {
    const result = recommendAppliance(
      healthyBattery,
      {
        id: "cooker",
        name: "Rice Cooker",
        wattage: "300-500W",
      },
    );

    expect(result.verdict).toBe(
      "notRecommended",
    );
    expect(result.badgeLabel).toBe(
      "Not advisable",
    );
  });

  test("unsafe battery blocks everything", () => {
    const result = recommendAppliance(
      {
        soc: 10,
        voltage: 11.0,
        remainingWh: 100,
        dod: "Unsafe",
        lastUpdated: Date.now(),
      },
      {
        id: "bulb",
        name: "LED Bulb",
        wattage: "7-15W",
      },
    );

    expect(result.verdict).toBe(
      "notRecommended",
    );
    expect(result.displayRuntime).toBe("—");
  });

  test("caution battery downgrades to care", () => {
    const result = recommendAppliance(
      {
        soc: 20,
        voltage: 12.0,
        remainingWh: 300,
        dod: "Safe",
        lastUpdated: Date.now(),
      },
      {
        id: "bulb",
        name: "LED Bulb",
        wattage: "7-15W",
      },
    );

    expect(result.tier).toBe("Caution");
    expect(result.verdict).toBe("care");
  });

  test("peak draw over the charge cap is blocked", () => {
    // SoC 20% -> 200W cap (Caution tier but not blocked);
    // 250W peak exceeds it, and the cap check runs before
    // the drain-ratio and caution checks.
    const result = recommendAppliance(
      {
        soc: 20,
        voltage: 12.4,
        remainingWh: 300,
        dod: "Safe",
        lastUpdated: Date.now(),
      },
      {
        id: "machine",
        name: "Washer",
        wattage: "150-250W",
      },
    );

    expect(result.verdict).toBe(
      "notRecommended",
    );
    expect(result.reason).toMatch(/cap/);
  });

  test("invalid wattage is not recommended", () => {
    const result = recommendAppliance(
      healthyBattery,
      {
        id: "mystery",
        name: "Mystery Box",
        wattage: "n/a",
      },
    );

    expect(result.verdict).toBe(
      "notRecommended",
    );
    expect(result.wattRange).toBeNull();
  });

  test("runtime display spans min-max wattage", () => {
    const result = recommendAppliance(
      healthyBattery,
      {
        id: "tv",
        name: "LED TV",
        wattage: "30-80W",
      },
    );

    // usableWh 448.8, inverter efficiency 0.9 -> effective 403.92:
    // 403.92/80=5.05 min, 403.92/30=13.46 max.
    expect(
      result.runtime.minHours,
    ).toBeCloseTo(5.05, 1);
    expect(
      result.runtime.maxHours,
    ).toBeCloseTo(13.46, 1);
    expect(result.displayRuntime).toMatch(
      /hrs/,
    );
  });
});

describe("recommendAppliances + computeLoadStack", () => {
  const appliances = [
    {
      id: "a",
      name: "Bulb",
      wattage: "7-15W",
    },
    {
      id: "b",
      name: "Cooker",
      wattage: "300-500W",
    },
  ];

  test("batch sorts recommended before blocked", () => {
    const batch = recommendAppliances(
      healthyBattery,
      appliances,
    );

    expect(batch.tier).toBe("Safe");
    expect(
      batch.recommendations[0].verdict,
    ).toBe("recommended");
    expect(
      batch.recommendations[
        batch.recommendations.length - 1
      ].verdict,
    ).toBe("notRecommended");
  });

  test("load stack sums mid wattages and flags inverter limit", () => {
    const stack = computeLoadStack(
      healthyBattery,
      appliances,
    );

    // mids: 11 + 400 = 411.
    expect(stack.totalMidWatts).toBe(411);
    expect(stack.topDrain?.id).toBe("b");
    expect(stack.overLimit).toBe(false);
    expect(stack.limitWatts).toBe(
      MAX_SAFE_LOAD_W,
    );
    expect(
      stack.runtimeMidHours,
    ).toBeCloseTo(448.8 / 411, 2);
  });

  test("load stack flags stacks over the inverter", () => {
    const stack = computeLoadStack(
      healthyBattery,
      [
        {
          id: "x",
          name: "Heater",
          wattage: "900-1200W",
        },
      ],
    );

    expect(stack.overLimit).toBe(true);
  });

  test("load stack skips invalid wattages", () => {
    const stack = computeLoadStack(
      healthyBattery,
      [
        {
          id: "bad",
          name: "Broken",
          wattage: "n/a",
        },
      ],
    );

    expect(stack.totalMidWatts).toBe(0);
    expect(stack.topDrain).toBeNull();
  });
});
