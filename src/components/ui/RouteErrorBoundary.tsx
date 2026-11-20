import * as Sentry from "@sentry/react-native";
import React, {
  useEffect,
  useRef,
} from "react";

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

interface SilentRetryProps {
  attempts: number;
  onRetry: () => void;
}

const MAX_ATTEMPTS = 2;

function SilentRetry({
  attempts,
  onRetry,
}: SilentRetryProps) {
  const onRetryRef = useRef(onRetry);

  useEffect(() => {
    onRetryRef.current = onRetry;
  }, [onRetry]);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) {
      return;
    }

    const timer = setTimeout(
      () => onRetryRef.current(),
      300 * (attempts + 1),
    );

    return () => clearTimeout(timer);
  }, [attempts]);

  return null;
}

export default function RouteErrorBoundary({
  children,
}: RouteErrorBoundaryProps) {
  const attemptsRef = useRef(0);

  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <SilentRetry
          attempts={attemptsRef.current}
          onRetry={() => {
            attemptsRef.current += 1;
            resetError();
          }}
        />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
