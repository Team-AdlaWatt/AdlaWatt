import {
  CHARGING_ETR,
  DEPLETED_ETR,
  MISSING_ETR,
  SOLAR_COVERING_ETR,
  getEstimatedTimeRemaining,
} from "@/utils/estimatedTimeRemaining";

const baseInput = {
  batteryStatus: "Discharging" as const,
  wattHours: 644 as number | null,
  batteryLevel: 80 as number | null,
  currentLoad: 100 as number | null,
  solarInput: 0 as number | null,
};

describe("getEstimatedTimeRemaining", () => {
  test("reports charging without a discharge countdown", () => {
    expect(
      getEstimatedTimeRemaining({
        batteryStatus: "Charging",
        wattHours: null,
        batteryLevel: null,
        currentLoad: null,
        solarInput: null,
      }),
    ).toBe(CHARGING_ETR);
  });

  test("does not label a Cycle as charging", () => {
    expect(
      getEstimatedTimeRemaining({
        batteryStatus: "Cycle",
        wattHours: null,
        batteryLevel: null,
        currentLoad: null,
        solarInput: null,
      }),
    ).toBe(MISSING_ETR);
  });

  test("reports when solar input covers the load", () => {
    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        wattHours: null,
        batteryLevel: null,
        currentLoad: 100,
        solarInput: 120,
      }),
    ).toBe(SOLAR_COVERING_ETR);

    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        currentLoad: 100,
        solarInput: 100,
      }),
    ).toBe(SOLAR_COVERING_ETR);
  });

  test("subtracts solar input before calculating runtime", () => {
    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        wattHours: 664,
        currentLoad: 196,
        solarInput: 40,
      }),
    ).toBe("3h 17m");
  });

  test("applies the reserve floor to total stored energy", () => {
    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        wattHours: 644,
        currentLoad: 100,
        solarInput: 0,
      }),
    ).toBe("4h 55m");
  });

  test("reports depleted energy at the reserve floor", () => {
    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        wattHours: 144,
        currentLoad: 100,
        solarInput: 0,
      }),
    ).toBe(DEPLETED_ETR);

    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        wattHours: 100,
        currentLoad: 100,
        solarInput: 0,
      }),
    ).toBe(DEPLETED_ETR);
  });

  test("falls back to battery level when watt-hours are missing", () => {
    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        wattHours: null,
        batteryLevel: 50,
        currentLoad: 108,
        solarInput: 0,
      }),
    ).toBe("2h 06m");
  });

  test("returns the unavailable value for missing readings", () => {
    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        wattHours: null,
        batteryLevel: null,
        currentLoad: 100,
        solarInput: 0,
      }),
    ).toBe(MISSING_ETR);

    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        currentLoad: null,
      }),
    ).toBe(MISSING_ETR);

    expect(
      getEstimatedTimeRemaining({
        ...baseInput,
        solarInput: Number.NaN,
      }),
    ).toBe(MISSING_ETR);
  });
});
