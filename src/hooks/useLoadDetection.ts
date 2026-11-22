import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";

import {
  evaluateNewLoadDwell,
  isNewLoadDetected,
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
  const confirmedRef = useRef(false);
  const reportedRef = useRef(false);
  const [detected, setDetected] = useReducer(
    (_current: boolean, next: boolean) => next,
    false,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!isNewLoadDetected(loadW)) {
      candidateSinceRef.current = null;
      confirmedRef.current = false;
      reportedRef.current = false;
      setDetected(false);
      return;
    }

    if (confirmedRef.current || reportedRef.current) {
      return;
    }

    const result = evaluateNewLoadDwell(
      loadW,
      candidateSinceRef.current,
      Date.now(),
    );

    candidateSinceRef.current = result.startedAt;

    if (result.active) {
      confirmedRef.current = true;
      reportedRef.current = true;
      setDetected(true);
      onConfirmed?.();
    }
  }, [enabled, loadW, onConfirmed]);

  const reset = useCallback(() => {
    candidateSinceRef.current = null;
    confirmedRef.current = false;
    reportedRef.current = false;
    setDetected(false);
  }, []);

  return { detected, reset };
}
