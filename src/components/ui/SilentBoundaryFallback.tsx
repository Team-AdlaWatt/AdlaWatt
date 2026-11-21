import React from "react";

import NeutralShell from "@/components/ui/NeutralShell";
import { useSilentRetry } from "@/hooks/useSilentRetry";

interface SilentBoundaryFallbackProps {
  attempts: number;
  onRetry: () => void;
}

export default function SilentBoundaryFallback({
  attempts,
  onRetry,
}: SilentBoundaryFallbackProps) {
  useSilentRetry({ attempts, onRetry });

  return <NeutralShell />;
}
