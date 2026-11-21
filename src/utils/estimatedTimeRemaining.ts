import {
  BATTERY_CAPACITY_WH,
  BATTERY_RESERVE_WH,
} from "@/constants/battery";
import type { BatteryStatus } from "@/services/monitoringSchema";
import { DEFAULT_RECOMMENDATION_CONFIG } from "@/services/recommendation";
import { hasValue } from "@/utils/monitoringDisplay";

export const MISSING_ETR = "—";
export const CHARGING_ETR = "Charging";
export const SOLAR_COVERING_ETR = "Solar covering load";
export const DEPLETED_ETR = "0h 00m";

export interface EstimatedTimeRemainingInput {
  batteryStatus: BatteryStatus | null;
  wattHours: number | null;
  batteryLevel: number | null;
  currentLoad: number | null;
  solarInput: number | null;
}

const INVERTER_EFFICIENCY =
  DEFAULT_RECOMMENDATION_CONFIG.inverterEfficiency;

const resolveRemainingWh = (
  input: EstimatedTimeRemainingInput,
): number | null => {
  if (hasValue(input.wattHours)) {
    return Math.max(input.wattHours, 0);
  }

  if (hasValue(input.batteryLevel)) {
    const clampedLevel = Math.min(
      Math.max(input.batteryLevel, 0),
      100,
    );

    return (
      (clampedLevel / 100) *
      BATTERY_CAPACITY_WH
    );
  }

  return null;
};

export const formatDuration = (hours: number): string => {
  const totalMinutes = Math.max(
    0,
    Math.floor(hours * 60),
  );

  const hourPart = Math.floor(totalMinutes / 60);
  const minutePart = totalMinutes % 60;

  return `${hourPart}h ${String(minutePart).padStart(2, "0")}m`;
};

export const getEstimatedTimeRemaining = (
  input: EstimatedTimeRemainingInput,
): string => {
  if (input.batteryStatus === "Charging") {
    return CHARGING_ETR;
  }

  if (
    !hasValue(input.currentLoad) ||
    !hasValue(input.solarInput)
  ) {
    return MISSING_ETR;
  }

  const netLoadW = Math.max(
    input.currentLoad - input.solarInput,
    0,
  );

  if (netLoadW <= 0) {
    return SOLAR_COVERING_ETR;
  }

  const remainingWh = resolveRemainingWh(input);

  if (remainingWh === null) {
    return MISSING_ETR;
  }

  const effectiveWh =
    Math.max(remainingWh - BATTERY_RESERVE_WH, 0) *
    INVERTER_EFFICIENCY;

  if (effectiveWh <= 0) {
    return DEPLETED_ETR;
  }

  return formatDuration(effectiveWh / netLoadW);
};
