import { useMemo } from "react";

import { Colors } from "@/constants/colors";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

/* ============================================================
   SHARED CHART CONSTANTS / COLORS
   Plain data helpers only so charts work on native
   and web with zero engine loading.
   Series colors are frozen classification; grid/axis
   neutrals follow the active theme via useChartColors.
   ============================================================ */

export const CHART_COLORS = {
  green: Colors.light.primary,
  red: Colors.light.error,
  yellow: Colors.light.warning,
  orange: Colors.light.chart.orange,
  grid: Colors.light.chart.grid,
  axisLabel: Colors.light.chart.axisLabel,
  muted: Colors.light.border,
} as const;

export function useChartColors() {
  const colors = useAppColors();

  return useMemo(
    () => getChartColors(colors),
    [colors],
  );
}

export const getChartColors = (
  colors: AppColors,
) => ({
  green: colors.primary,
  red: colors.error,
  yellow: colors.warning,
  orange: colors.chart.orange,
  grid: colors.chart.grid,
  axisLabel: colors.chart.axisLabel,
  muted: colors.border,
});

export const CHART_HEIGHT = 240;

/* ============================================================
   DATA HELPERS
   ============================================================ */

export function clampPercent(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, value),
  );
}

/*
 * Round a chart maximum up to a clean 1/2/2.5/5/10 step so
 * dynamic (watts, hours) Y axes end on readable gridlines.
 * Non-positive input yields 1 to keep the axis valid.
 */
export function niceCeil(
  value: number,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  const magnitude = Math.pow(
    10,
    Math.floor(Math.log10(value)),
  );

  const normalized = value / magnitude;

  const step =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;

  return step * magnitude;
}
