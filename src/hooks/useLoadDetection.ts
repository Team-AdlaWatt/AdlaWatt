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

type UseLoadDetectionOptions = {
  loadW: number | null | undefined;
  enabled?: boolean;
  onConfirmed?: () => void;
};

type LoadDetectionResult = {
  detected: boolean;
  reset: () => void;
};

export function useLoadDetection({
  loadW,
  enabled = true,
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

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (reportedRef.current) {
      const recovery = evaluateAbsoluteRecoveryDwell(
        loadW,
        recoverySinceRef.current,
        Date.now(),
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

    if (!isAbsoluteLoadDetected(loadW)) {
      candidateSinceRef.current = null;
      setDetected(false);
      return;
    }

    const result = evaluateAbsoluteLoadDwell(
      loadW,
      candidateSinceRef.current,
      Date.now(),
    );

    candidateSinceRef.current = result.startedAt;

    if (result.active) {
      reportedRef.current = true;
      setDetected(true);
      onConfirmed?.();
    }
  }, [enabled, loadW, onConfirmed]);

  const reset = useCallback(() => {
    candidateSinceRef.current = null;
    recoverySinceRef.current = null;
    reportedRef.current = false;
    setDetected(false);
  }, []);

  return { detected, reset };
}
