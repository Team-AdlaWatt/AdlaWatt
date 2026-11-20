import * as Sentry from "@sentry/react-native";
import React, { useRef } from "react";

import SilentBoundaryFallback from "@/components/ui/SilentBoundaryFallback";

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

export default function RouteErrorBoundary({
  children,
}: RouteErrorBoundaryProps) {
  const attemptsRef = useRef(0);

  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <SilentBoundaryFallback
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
