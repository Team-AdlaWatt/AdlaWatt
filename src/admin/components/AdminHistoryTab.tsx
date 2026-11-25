import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";

import {
  ADMIN_HISTORY_METRICS,
  ADMIN_HISTORY_RANGES,
  type AdminHistoryMetric,
  type AdminHistoryRange,
} from "@/admin/constants";
import {
  formatHistoryLabel,
  formatMetricValue,
} from "@/admin/format";
import {
  AdminFreshness,
  AdminTabError,
  AdminTabHeader,
  AdminTabLoading,
} from "@/admin/components/AdminTabShared";
import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import { SlidingToggle } from "@/components/ui/SlidingToggle";
import {
  CHART_HEIGHT,
  niceCeil,
  useChartColors,
} from "@/services/chartMath";
import { useAppColors } from "@/hooks/useAppColors";
import { useTypography } from "@/hooks/useTypography";
import type { AdminFleetHistoryPoint } from "@/services/adminService";

interface AdminHistoryTabProps {
  data: AdminFleetHistoryPoint[] | null;
  lastUpdated: string | null;
  range: AdminHistoryRange;
  onRangeChange: (range: AdminHistoryRange) => void;
  loading: boolean;
  error: string | null;
  stale: boolean;
  onRetry: () => void;
}

function metricValue(
  point: AdminFleetHistoryPoint,
  metric: AdminHistoryMetric,
): number {
  if (metric === "battery") {
    return point.avg_battery;
  }

  if (metric === "solar") {
    return point.solar_wh;
  }

  return point.avg_load_w;
}

function formatAxisLabel(
  value: number,
  metric: AdminHistoryMetric,
): string {
  if (metric === "battery") {
    return `${Math.round(value)}%`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return String(Math.round(value));
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" style={styles.statLabel}>
        {label}
      </AppText>

      <AppText
        variant="heading"
        style={[styles.statValue, { color }]}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 18,
  },

  controls: {
    width: "100%",
    gap: 10,
  },

  controlLabel: {
    fontWeight: "600",
  },

  chartWrap: {
    width: "100%",
    minHeight: CHART_HEIGHT,
    alignItems: "center",
  },

  statsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  statLabel: {
    textAlign: "center",
  },

  statValue: {
    textAlign: "center",
  },
});

export default function AdminHistoryTab({
  data,
  lastUpdated,
  range,
  onRangeChange,
  loading,
  error,
  stale,
  onRetry,
}: AdminHistoryTabProps) {
  const colors = useAppColors();
  const chartColors = useChartColors();
  const { family } = useTypography();
  const [metric, setMetric] =
    useState<AdminHistoryMetric>("battery");
  const [chartWidth, setChartWidth] = useState(0);

  const points = useMemo(() => data ?? [], [data]);

  const values = useMemo(
    () => points.map((point) => metricValue(point, metric)),
    [points, metric],
  );

  const chartData = useMemo(() => {
    const labelEvery = range === 720 ? 5 : 4;

    return values.map((value, index) => ({
      value,
      label:
        index % labelEvery === 0
          ? formatHistoryLabel(
              points[index].bucket_start,
              range,
            )
          : "",
    }));
  }, [values, points, range]);

  const maxValue = useMemo(() => {
    if (metric === "battery") {
      return 100;
    }

    const peak = values.reduce(
      (highest, value) => Math.max(highest, value),
      0,
    );

    return niceCeil(peak * 1.15);
  }, [metric, values]);

  const summary = useMemo(() => {
    if (values.length === 0) {
      return null;
    }

    return {
      latest: values[values.length - 1],
      average:
        values.reduce((sum, value) => sum + value, 0) /
        values.length,
      peak: values.reduce(
        (highest, value) => Math.max(highest, value),
        0,
      ),
    };
  }, [values]);

  const metricColor =
    metric === "battery"
      ? chartColors.green
      : metric === "solar"
        ? chartColors.yellow
        : chartColors.orange;

  const onChartLayout = (event: LayoutChangeEvent) =>
    setChartWidth(event.nativeEvent.layout.width);

  if (loading && !data) {
    return <AdminTabLoading />;
  }

  if (!data) {
    return (
      <AdminTabError
        message={error || "No fleet history available"}
        onRetry={onRetry}
      />
    );
  }

  if (
    points.length === 0 ||
    points.every((point) => point.sample_count === 0)
  ) {
    return (
      <EmptyState
        icon="time-outline"
        title="No history in this range"
        description="Historical battery, solar, and load readings will appear here once devices report data."
      />
    );
  }

  return (
    <View style={styles.container}>
      <AdminTabHeader
        title="History"
        subtitle="Fleet-wide battery, solar, and load trends."
      />

      <View style={styles.controls}>
        <SlidingToggle<AdminHistoryMetric>
          value={metric}
          onChange={setMetric}
          options={ADMIN_HISTORY_METRICS.map((option) => ({
            value: option.value,
            label: option.label,
            activeColor:
              option.value === "battery"
                ? chartColors.green
                : option.value === "solar"
                  ? chartColors.yellow
                  : chartColors.orange,
            accessibilityLabel:
              option.accessibilityLabel,
          }))}
        />

        <SlidingToggle<AdminHistoryRange>
          value={range}
          onChange={onRangeChange}
          options={ADMIN_HISTORY_RANGES.map((option) => ({
            value: option.value,
            label: option.label,
            activeColor: colors.primary,
            accessibilityLabel:
              option.accessibilityLabel,
          }))}
        />
      </View>

      {summary ? (
        <View style={styles.statsRow}>
          <Stat
            label="Latest"
            value={formatMetricValue(metric, summary.latest)}
            color={metricColor}
          />
          <Stat
            label="Average"
            value={formatMetricValue(
              metric,
              summary.average,
            )}
            color={colors.text}
          />
          <Stat
            label="Peak"
            value={formatMetricValue(metric, summary.peak)}
            color={colors.text}
          />
        </View>
      ) : null}

      <View style={styles.chartWrap} onLayout={onChartLayout}>
        {chartWidth > 0 ? (
          <LineChart
            key={`${metric}-${range}-${chartData.length}`}
            data={chartData}
            width={Math.max(chartWidth - 8, 120)}
            height={CHART_HEIGHT}
            color={metricColor}
            thickness={2}
            curved
            areaChart
            startFillColor={metricColor}
            endFillColor={metricColor}
            startOpacity={colors.isDark ? 0.18 : 0.28}
            endOpacity={0.02}
            maxValue={maxValue}
            noOfSections={4}
            yAxisLabelWidth={42}
            yAxisThickness={0}
            xAxisColor={chartColors.grid}
            rulesColor={chartColors.grid}
            formatYLabel={(label: string) =>
              formatAxisLabel(Number(label), metric)
            }
            yAxisTextStyle={{
              fontSize: 11,
              fontFamily: family,
              color: chartColors.axisLabel,
            }}
            xAxisLabelTextStyle={{
              fontSize: 10,
              fontFamily: family,
              color: chartColors.axisLabel,
            }}
            initialSpacing={8}
            endSpacing={8}
          />
        ) : null}
      </View>

      <AdminFreshness
        lastUpdated={lastUpdated}
        stale={stale}
      />
    </View>
  );
}
