import React from "react";

// ============================================================
// ROUTE ERROR BOUNDARY
// (Sentry removed: pass-through, no crash reporting)
// ============================================================

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

export default function RouteErrorBoundary({
  children,
}: RouteErrorBoundaryProps) {
  return <>{children}</>;
}
