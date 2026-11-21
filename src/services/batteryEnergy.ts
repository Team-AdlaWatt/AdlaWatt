import {
  BATTERY_CAPACITY_WH,
  BATTERY_RESERVE_WH,
  BATTERY_USABLE_WH,
} from "@/constants/battery";
import {
  DEFAULT_RECOMMENDATION_CONFIG,
} from "@/services/recommendation";

export type BatteryEnergyStatus =
  | "waiting"
  | "normal"
  | "warning"
  | "critical";

export interface BatteryEnergyInput {
  wattHours?: number | null;
  batteryLevel?: number | null;
  deviceOnline?: boolean | null;
  lastUpdated?: number | null;
  now?: number;
}

export interface BatteryEnergySnapshot {
  status: BatteryEnergyStatus;
  totalWh: number;
  reserveWh: number;
  usableWh: number;
  usableCapacityWh: number;
  usablePercent: number;
  consumedWh: number;
}

export const ENERGY_WARNING_RATIO = 0.25;
export const ENERGY_CRITICAL_RATIO = 0.1;
export const ENERGY_RECOVERY_RATIO = 0.15;

const clamp = (
  value: number,
  min: number,
  max: number,
) => Math.min(max, Math.max(min, value));

const toFinite = (
  value: number | null | undefined,
): number | null =>
  typeof value === "number" &&
  Number.isFinite(value)
    ? value
    : null;

export const deriveEnergyStatus = (
  usablePercent: number,
): Exclude<BatteryEnergyStatus, "waiting"> => {
  if (usablePercent <= ENERGY_CRITICAL_RATIO * 100) {
    return "critical";
  }

  if (usablePercent <= ENERGY_WARNING_RATIO * 100) {
    return "warning";
  }

  return "normal";
};

export const computeBatteryEnergy = (
  input: BatteryEnergyInput,
): BatteryEnergySnapshot => {
  const now = input.now ?? Date.now();
  const lastUpdated = toFinite(input.lastUpdated);
  const wattHours = toFinite(input.wattHours);
  const batteryLevel = toFinite(input.batteryLevel);

  const isFresh =
    lastUpdated !== null &&
    now - lastUpdated <=
      DEFAULT_RECOMMENDATION_CONFIG.staleReadingMs;

  const isOnline =
    input.deviceOnline !== false;

  const hasSource =
    wattHours !== null || batteryLevel !== null;

  if (
    !isOnline ||
    !isFresh ||
    !hasSource
  ) {
    return {
      status: "waiting",
      totalWh: 0,
      reserveWh: BATTERY_RESERVE_WH,
      usableWh: 0,
      usableCapacityWh: BATTERY_USABLE_WH,
      usablePercent: 0,
      consumedWh: 0,
    };
  }

  const totalWh = clamp(
    wattHours ??
      (clamp(batteryLevel ?? 0, 0, 100) / 100) *
        BATTERY_CAPACITY_WH,
    0,
    BATTERY_CAPACITY_WH,
  );

  const usableWh = clamp(
    totalWh - BATTERY_RESERVE_WH,
    0,
    BATTERY_USABLE_WH,
  );

  const usablePercent = clamp(
    (usableWh / BATTERY_USABLE_WH) * 100,
    0,
    100,
  );

  return {
    status: deriveEnergyStatus(usablePercent),
    totalWh,
    reserveWh: BATTERY_RESERVE_WH,
    usableWh,
    usableCapacityWh: BATTERY_USABLE_WH,
    usablePercent,
    consumedWh: BATTERY_USABLE_WH - usableWh,
  };
};
