import {
  BATTERY_CAPACITY_WH,
  BATTERY_RESERVE_WH,
  BATTERY_USABLE_WH,
} from "@/constants/battery";
import {
  ENERGY_CRITICAL_RATIO,
  ENERGY_WARNING_RATIO,
  computeBatteryEnergy,
  computeBatteryEnergyProjection,
  deriveEnergyStatus,
} from "@/services/batteryEnergy";

const now = 1_700_000_000_000;

describe("deriveEnergyStatus", () => {
  test("maps usable-energy percentages to status bands", () => {
    expect(
      deriveEnergyStatus(
        ENERGY_CRITICAL_RATIO * 100,
      ),
    ).toBe("critical");
    expect(
      deriveEnergyStatus(
        ENERGY_WARNING_RATIO * 100,
      ),
    ).toBe("warning");
    expect(deriveEnergyStatus(40)).toBe("normal");
  });
});

describe("computeBatteryEnergy", () => {
  test("subtracts the protected reserve from total watt-hours", () => {
    const result = computeBatteryEnergy({
      wattHours: BATTERY_CAPACITY_WH,
      batteryLevel: 100,
      deviceOnline: true,
      lastUpdated: now,
      now,
    });

    expect(result.status).toBe("normal");
    expect(result.totalWh).toBe(BATTERY_CAPACITY_WH);
    expect(result.reserveWh).toBe(BATTERY_RESERVE_WH);
    expect(result.usableWh).toBe(BATTERY_USABLE_WH);
    expect(result.usablePercent).toBe(100);
    expect(result.consumedWh).toBe(0);
  });

  test("derives total watt-hours from battery level when needed", () => {
    const result = computeBatteryEnergy({
      batteryLevel: 50,
      deviceOnline: true,
      lastUpdated: now,
      now,
    });

    expect(result.totalWh).toBe(
      BATTERY_CAPACITY_WH / 2,
    );
    expect(result.usableWh).toBe(
      BATTERY_CAPACITY_WH / 2 -
        BATTERY_RESERVE_WH,
    );
    expect(result.usablePercent).toBeCloseTo(37.5, 1);
  });

  test("flags depletion of the usable budget", () => {
    const result = computeBatteryEnergy({
      wattHours: BATTERY_RESERVE_WH + 10,
      deviceOnline: true,
      lastUpdated: now,
      now,
    });

    expect(result.status).toBe("critical");
    expect(result.usableWh).toBe(10);
  });

  test("fails safe on offline, stale, or missing readings", () => {
    const base = {
      wattHours: BATTERY_CAPACITY_WH,
      lastUpdated: now,
      now,
    };

    expect(
      computeBatteryEnergy({
        ...base,
        deviceOnline: false,
      }).status,
    ).toBe("waiting");

    expect(
      computeBatteryEnergy({
        ...base,
        deviceOnline: true,
        lastUpdated: now - 61_000,
      }).status,
    ).toBe("waiting");

    expect(
      computeBatteryEnergy({
        deviceOnline: true,
        lastUpdated: now,
        now,
      }).status,
    ).toBe("waiting");
  });
});

describe("computeBatteryEnergyProjection", () => {
  const snapshot = computeBatteryEnergy({
    wattHours: BATTERY_CAPACITY_WH,
    deviceOnline: true,
    lastUpdated: now,
    now,
  });

  test("subtracts solar from live load and caps the one-hour drain", () => {
    const result = computeBatteryEnergyProjection({
      snapshot,
      currentLoadW: 120,
      solarInputW: 20,
    });

    expect(result.liveNetLoadW).toBe(100);
    expect(result.projectedDrainWh).toBe(100);
    expect(result.remainingAfterLoadWh).toBe(
      BATTERY_USABLE_WH - 100,
    );
    expect(result.exceedsUsableEnergy).toBe(false);
  });

  test("blocks when live net load would consume all usable energy", () => {
    const result = computeBatteryEnergyProjection({
      snapshot,
      currentLoadW: BATTERY_USABLE_WH,
      solarInputW: 0,
    });

    expect(result.projectedDrainWh).toBe(
      BATTERY_USABLE_WH,
    );
    expect(result.remainingAfterLoadWh).toBe(0);
    expect(result.exceedsUsableEnergy).toBe(true);
  });

  test("fails safe without live readings", () => {
    const result = computeBatteryEnergyProjection({
      snapshot,
      currentLoadW: null,
      solarInputW: 0,
    });

    expect(result.liveNetLoadW).toBeNull();
    expect(result.projectedDrainWh).toBe(0);
    expect(result.exceedsUsableEnergy).toBe(false);
  });
});
