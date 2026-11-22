import {
  LOAD_BASELINE_TOLERANCE_W,
  LOAD_BASELINE_W,
  LOAD_DETECTION_DELTA_W,
  LOAD_VERIFICATION_MS,
} from "@/constants/battery";

export interface DwellEvaluation {
  active: boolean;
  startedAt: number | null;
}

const toFinite = (
  value: number | null | undefined,
): number | null =>
  typeof value === "number" &&
  Number.isFinite(value)
    ? value
    : null;

export const getLoadExcessW = (
  loadW: number | null | undefined,
  baselineW: number = LOAD_BASELINE_W,
): number => {
  const current = toFinite(loadW);

  if (current === null) {
    return 0;
  }

  return Math.max(0, current - baselineW);
};

export const isNewLoadDetected = (
  loadW: number | null | undefined,
  baselineW: number = LOAD_BASELINE_W,
  deltaW: number = LOAD_DETECTION_DELTA_W,
): boolean =>
  getLoadExcessW(loadW, baselineW) >= deltaW;

export const isLoadNearBaseline = (
  loadW: number | null | undefined,
  baselineW: number = LOAD_BASELINE_W,
  toleranceW: number = LOAD_BASELINE_TOLERANCE_W,
): boolean => {
  const current = toFinite(loadW);

  if (current === null) {
    return false;
  }

  return current <= baselineW + toleranceW;
};

export const evaluateDwell = (
  conditionMet: boolean,
  startedAt: number | null,
  now: number,
  dwellMs: number = LOAD_VERIFICATION_MS,
): DwellEvaluation => {
  if (!conditionMet) {
    return { active: false, startedAt: null };
  }

  const nextStartedAt = startedAt ?? now;

  return {
    active: now - nextStartedAt >= dwellMs,
    startedAt: nextStartedAt,
  };
};

export const evaluateNewLoadDwell = (
  loadW: number | null | undefined,
  startedAt: number | null,
  now: number,
): DwellEvaluation =>
  evaluateDwell(
    isNewLoadDetected(loadW),
    startedAt,
    now,
  );

export const evaluateBaselineRecoveryDwell = (
  loadW: number | null | undefined,
  startedAt: number | null,
  now: number,
): DwellEvaluation =>
  evaluateDwell(
    isLoadNearBaseline(loadW),
    startedAt,
    now,
  );
