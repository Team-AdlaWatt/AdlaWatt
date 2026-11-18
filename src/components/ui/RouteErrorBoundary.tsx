import * as Sentry from "@sentry/react-native";
import React from "react";
import {
  StyleSheet,
  View,
} from "react-native";

import ErrorState from "@/components/ui/ErrorState";

// ============================================================
// ROUTE ERROR BOUNDARY
//
// Per-route-group containment: a render crash inside one
// group shows ErrorState with a working retry (resets the
// boundary and remounts the subtree) instead of the root
// crash screen. Rendered inside each group's providers, so
// the fallback inherits the active theme + language.
// ============================================================

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

export default function RouteErrorBoundary({
  children,
}: RouteErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <View style={styles.fallback}>
          <ErrorState onRetry={resetError} />
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
  },
});
