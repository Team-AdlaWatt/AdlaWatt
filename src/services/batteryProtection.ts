import {
  CAUTION_VOLTAGE,
  MAX_SAFE_LOAD_W,
  UNSAFE_VOLTAGE,
} from "@/services/recommendation";
import type { BatteryEnergySnapshot } from "@/services/batteryEnergy";

export type ProtectionLevel =
  | "normal"
  | "warning"
  | "critical"
  | "waiting";

export type ProtectionReason =
  | "reserveWarning"
  | "reserveCritical"
  | "lowVoltage"
  | "unsafeVoltage"
  | "unsafeDod"
  | "highLiveLoad"
  | "newLoad";

export interface ProtectionInput {
  energy: BatteryEnergySnapshot;
  voltage?: number | null;
  dodStatus?: string | null;
  currentLoadW?: number | null;
  selectedBatterySideW?: number | null;
  toleranceW?: number;
  toleranceRatio?: number;
}

export interface ProtectionState {
  level: ProtectionLevel;
  reasons: ProtectionReason[];
  newLoadDeltaW: number;
}

const toFinite = (
  value: number | null | undefined,
): number | null =>
  typeof value === "number" &&
  Number.isFinite(value)
    ? value
    : null;

export const detectNewLoad = (
  currentLoadW: number | null | undefined,
  selectedBatterySideW: number | null | undefined,
  toleranceW = 25,
  toleranceRatio = 0.25,
): number => {
  const current = toFinite(currentLoadW);
  const expected = toFinite(selectedBatterySideW) ?? 0;

  if (
    current === null ||
    current <= 0 ||
    expected < 0
  ) {
    return 0;
  }

  const delta = current - expected;
  const threshold = Math.max(
    toleranceW,
    expected * toleranceRatio,
  );

  return delta >= threshold ? delta : 0;
};

export const deriveProtectionState = (
  input: ProtectionInput,
): ProtectionState => {
  const reasons: ProtectionReason[] = [];
  const voltage = toFinite(input.voltage);
  const currentLoadW = toFinite(input.currentLoadW);

  const newLoadDeltaW = detectNewLoad(
    currentLoadW,
    input.selectedBatterySideW,
    input.toleranceW,
    input.toleranceRatio,
  );

  if (newLoadDeltaW > 0) {
    reasons.push("newLoad");
  }

  if (input.energy.status === "waiting") {
    return {
      level: "waiting",
      reasons,
      newLoadDeltaW,
    };
  }

  if (
    input.energy.status === "critical"
  ) {
    reasons.push("reserveCritical");
  } else if (
    input.energy.status === "warning"
  ) {
    reasons.push("reserveWarning");
  }

  if (
    voltage !== null &&
    voltage <= UNSAFE_VOLTAGE
  ) {
    reasons.push("unsafeVoltage");
  } else if (
    voltage !== null &&
    voltage <= CAUTION_VOLTAGE
  ) {
    reasons.push("lowVoltage");
  }

  if (
    input.dodStatus?.toLowerCase() ===
    "unsafe"
  ) {
    reasons.push("unsafeDod");
  }

  if (
    currentLoadW !== null &&
    currentLoadW > MAX_SAFE_LOAD_W
  ) {
    reasons.push("highLiveLoad");
  }

  const critical = reasons.some(
    (reason) =>
      reason === "reserveCritical" ||
      reason === "unsafeVoltage" ||
      reason === "unsafeDod",
  );

  const warning = reasons.some(
    (reason) =>
      reason === "reserveWarning" ||
      reason === "lowVoltage" ||
      reason === "highLiveLoad",
  );

  return {
    level: critical
      ? "critical"
      : warning
        ? "warning"
        : "normal",
    reasons,
    newLoadDeltaW,
  };
};
