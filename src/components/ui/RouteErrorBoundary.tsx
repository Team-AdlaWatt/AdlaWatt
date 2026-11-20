import * as Sentry from "@sentry/react-native";
import React, { useRef } from "react";
import {
  StyleSheet,
  View,
} from "react-native";

import AutoRetryNotice from "@/components/ui/AutoRetryNotice";

// ============================================================
// ROUTE ERROR BOUNDARY
//
// Per-route-group containment: a render crash inside one
// group is retried automatically, then degrades to a quiet
// inline notice instead of a blocking screen. Rendered
// inside each group's providers, so the fallback inherits
// the active theme + language.
// ============================================================

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
        <View style={styles.fallback}>
          <AutoRetryNotice
            initialAttempts={attemptsRef.current}
            maxAttempts={2}
            onAttempt={(attempts) => {
              attemptsRef.current = attempts;
            }}
            onRetry={resetError}
          />
        </View>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
});
