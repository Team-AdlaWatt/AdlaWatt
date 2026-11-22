import { useMemo } from "react";
import {
  useChartColors,
} from "@/services/chartMath";
import {
  formatNumber,
  type SolarAnalyticsPoint,
} from "@/services/analyticsService";
import AnalyticsMetricChart from "@/components/charts/AnalyticsMetricChart";

export default function SolarEnergyChart({
  points,
}: {
  points: SolarAnalyticsPoint[];
}) {
  const chartColors =
    useChartColors();

  const stats = useMemo(
    () => [
      {
        label:
          "Energy collected",
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
          "Peak output",
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
          "Peak sun",
        value: `${formatNumber(
          points.reduce(
            (peak, point) =>
              Math.max(
                peak,
                point.peakHours,
              ),
            0,
          ),
        )} h`,
      },
      {
        label:
          "Charge start",
        value:
          points.find(
            (point) =>
              point.chargeStart,
          )?.chargeStart ??
            "—",
      },
    ],
    [points],
  );

  return (
    <AnalyticsMetricChart
      points={points}
      stats={stats}
      color={chartColors.green}
      unit="watt-hours"
    />
  );
}
