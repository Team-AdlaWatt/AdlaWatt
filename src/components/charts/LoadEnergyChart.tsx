import { useMemo } from "react";
import {
  useChartColors,
} from "@/services/chartMath";
import {
  formatNumber,
  type LoadAnalyticsPoint,
} from "@/services/analyticsService";
import AnalyticsMetricChart from "@/components/charts/AnalyticsMetricChart";

export default function LoadEnergyChart({
  points,
}: {
  points: LoadAnalyticsPoint[];
}) {
  const chartColors =
    useChartColors();

  const stats = useMemo(
    () => [
      {
        label:
          "Energy used",
        value: `${formatNumber(
          points.reduce(
            (sum, point) =>
              sum +
              point.energyWh,
            0,
          ),
        )} Wh`,
      },
      {
        label:
          "Average load",
        value: `${formatNumber(
          points.length > 0
            ? points.reduce(
                (sum, point) =>
                  sum +
                  point.avgW,
                0,
              ) /
                points.length
            : 0,
        )} W`,
      },
      {
        label:
          "Peak load",
        value: `${formatNumber(
          points.reduce(
            (peak, point) =>
              Math.max(
                peak,
                point.peakW,
              ),
            0,
          ),
        )} W`,
      },
      {
        label:
          "Avg voltage",
        value: `${formatNumber(
          points.length > 0
            ? points.reduce(
                (sum, point) =>
                  sum +
                  point.avgVoltage,
                0,
              ) /
                points.length
            : 0,
        )} V`,
      },
    ],
    [points],
  );

  return (
    <AnalyticsMetricChart
      points={points}
      stats={stats}
      color={chartColors.yellow}
      unit="W"
      legendLabel="Load"
    />
  );
}
