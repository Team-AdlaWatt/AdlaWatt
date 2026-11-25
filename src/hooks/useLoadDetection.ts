import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";

import {
  evaluateAbsoluteLoadDwell,
  evaluateAbsoluteRecoveryDwell,
  isAbsoluteLoadDetected,
} from "@/services/loadDetection";
import {
  DEFAULT_RECOMMENDATION_CONFIG,
} from "@/services/recommendation";

type UseLoadDetectionOptions = {
  loadW: number | null | undefined;
  lastSeenAt?: string | number | null;
  enabled?: boolean;
  maxObservationAgeMs?: number;
  onConfirmed?: () => void;
};

type LoadDetectionResult = {
  detected: boolean;
  reset: () => void;
};

const toTimestamp = (
  value: string | number | null | undefined,
): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed)
    ? null
    : parsed;
};

const isFreshObservation = (
  lastSeenAt: string | number | null | undefined,
  now: number,
  maxObservationAgeMs: number,
): boolean => {
  if (lastSeenAt === undefined) {
    return true;
  }

  const observedAt = toTimestamp(lastSeenAt);

  if (observedAt === null) {
    return false;
  }

  const age = now - observedAt;

  return age >= 0 && age <= maxObservationAgeMs;
};

export function useLoadDetection({
  loadW,
  lastSeenAt,
  enabled = true,
  maxObservationAgeMs =
    DEFAULT_RECOMMENDATION_CONFIG.staleReadingMs,
  onConfirmed,
}: UseLoadDetectionOptions): LoadDetectionResult {
  const candidateSinceRef = useRef<number | null>(
    null,
  );
  const recoverySinceRef = useRef<number | null>(
    null,
  );
  const reportedRef = useRef(false);
  const [detected, setDetected] = useReducer(
    (_current: boolean, next: boolean) => next,
    false,
  );

  const latestRef = useRef({
    enabled,
    loadW,
    lastSeenAt,
    maxObservationAgeMs,
    onConfirmed,
  });

  const evaluate = useCallback(() => {
    const latest = latestRef.current;

    if (!latest.enabled) {
      return;
    }

    const now = Date.now();

    if (
      !isFreshObservation(
        latest.lastSeenAt,
        now,
        latest.maxObservationAgeMs,
      )
    ) {
      if (!reportedRef.current) {
        candidateSinceRef.current = null;
      }

      return;
    }

    if (reportedRef.current) {
      const recovery = evaluateAbsoluteRecoveryDwell(
        latest.loadW,
        recoverySinceRef.current,
        now,
      );

      recoverySinceRef.current = recovery.startedAt;

      if (recovery.active) {
        candidateSinceRef.current = null;
        recoverySinceRef.current = null;
        reportedRef.current = false;
        setDetected(false);
      }

      return;
    }

    recoverySinceRef.current = null;

    if (
      !isAbsoluteLoadDetected(latest.loadW)
    ) {
      candidateSinceRef.current = null;
      setDetected(false);
      return;
    }

    const result = evaluateAbsoluteLoadDwell(
      latest.loadW,
      candidateSinceRef.current,
      now,
    );

    candidateSinceRef.current = result.startedAt;

    if (result.active) {
      reportedRef.current = true;
      setDetected(true);
      latest.onConfirmed?.();
    }
  }, []);

  useEffect(() => {
    latestRef.current = {
      enabled,
      loadW,
      lastSeenAt,
      maxObservationAgeMs,
      onConfirmed,
    };

    evaluate();
  }, [
    enabled,
    evaluate,
    lastSeenAt,
    loadW,
    maxObservationAgeMs,
    onConfirmed,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setInterval(evaluate, 1000);

    return () => clearInterval(timer);
  }, [enabled, evaluate]);

  const reset = useCallback(() => {
    candidateSinceRef.current = null;
    recoverySinceRef.current = null;
    reportedRef.current = false;
    setDetected(false);
  }, []);

  return { detected, reset };
}
