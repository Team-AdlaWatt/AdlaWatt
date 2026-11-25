import {
  ENERGY_CRITICAL_RATIO,
  ENERGY_WARNING_RATIO,
  deriveEnergyStatus,
  type BatteryEnergySnapshot,
} from "@/services/batteryEnergy";
import {
  deriveProtectionState,
  detectNewLoad,
} from "@/services/batteryProtection";

const energy = (
  usablePercent: number,
  status = deriveEnergyStatus(usablePercent),
): BatteryEnergySnapshot => ({
  status,
  totalWh: 500,
  reserveWh: 151.2,
  usableWh: 300,
  usableCapacityWh: 604.8,
  usablePercent,
  consumedWh: 200,
});

describe("detectNewLoad", () => {
  test("ignores tiny deltas", () => {
    expect(detectNewLoad(30, 20)).toBe(0);
  });

  test("reports a meaningful unexpected load", () => {
    expect(detectNewLoad(120, 50)).toBe(70);
  });

  test("uses a fixed tolerance when nothing is selected", () => {
    expect(detectNewLoad(40, 0)).toBe(40);
    expect(detectNewLoad(20, 0)).toBe(0);
  });
});

describe("deriveProtectionState", () => {
  test("stays normal when energy and voltage are healthy", () => {
    const result = deriveProtectionState({
      energy: energy(60),
      voltage: 12.4,
      dodStatus: "Safe",
      currentLoadW: 80,
      selectedBatterySideW: 70,
    });

    expect(result.level).toBe("normal");
    expect(result.newLoadDeltaW).toBe(0);
  });

  test("warns at the usable warning band", () => {
    const result = deriveProtectionState({
      energy: energy(
        ENERGY_WARNING_RATIO * 100,
      ),
      voltage: 12.2,
      dodStatus: "Safe",
      currentLoadW: 40,
      selectedBatterySideW: 40,
    });

    expect(result.level).toBe("warning");
    expect(result.reasons).toContain(
      "reserveWarning",
    );
  });

  test("goes critical at the usable critical band", () => {
    const result = deriveProtectionState({
      energy: energy(
        ENERGY_CRITICAL_RATIO * 100,
      ),
      voltage: 12.1,
      dodStatus: "Safe",
    });

    expect(result.level).toBe("critical");
    expect(result.reasons).toContain(
      "reserveCritical",
    );
  });

  test("flags unsafe voltage and DoD as critical", () => {
    const result = deriveProtectionState({
      energy: energy(60),
      voltage: 10.5,
      dodStatus: "UNSAFE",
    });

    expect(result.level).toBe("critical");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "unsafeVoltage",
        "unsafeDod",
      ]),
    );
  });

  test("combines a new-load signal with the energy level", () => {
    const result = deriveProtectionState({
      energy: energy(60),
      voltage: 12.4,
      dodStatus: "Safe",
      currentLoadW: 140,
      selectedBatterySideW: 50,
    });

    expect(result.level).toBe("normal");
    expect(result.reasons).toContain("newLoad");
    expect(result.newLoadDeltaW).toBe(90);
  });
});
