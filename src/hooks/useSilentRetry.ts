import { useEffect, useRef } from "react";

interface UseSilentRetryOptions {
  attempts: number;
  onRetry: () => void;
  maxAttempts?: number;
  enabled?: boolean;
}

export function useSilentRetry({
  attempts,
  onRetry,
  maxAttempts = 2,
  enabled = true,
}: UseSilentRetryOptions): void {
  const onRetryRef = useRef(onRetry);

  useEffect(() => {
    onRetryRef.current = onRetry;
  }, [onRetry]);

  useEffect(() => {
    if (!enabled || attempts >= maxAttempts) {
      return;
    }

    const timer = setTimeout(
      () => onRetryRef.current(),
      300 * (attempts + 1),
    );

    return () => clearTimeout(timer);
  }, [attempts, enabled, maxAttempts]);
}
