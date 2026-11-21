import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  Platform,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from "react-native";
import {
  LineChart,
} from "react-native-gifted-charts";
import {
  CHART_HEIGHT,
  niceCeil,
  useChartColors,
} from "@/services/chartMath";
import { useTypography } from "@/hooks/useTypography";
import { useAppColors } from "@/hooks/useAppColors";
import AppText from "@/components/ui/AppText";
import type {
  AnalyticsMetricPoint,
} from "@/services/analyticsService";

const DEFAULT_POINT_WIDTH = 64;
const Y_AXIS_W = 42;

export interface AnalyticsMetricStat {
  label: string;
  value: string;
}

function Stat({
  label,
  value,
}: AnalyticsMetricStat) {
  const colors =
    useAppColors();

  return (
    <View style={styles.stat}>
      <AppText
        variant="caption"
        style={styles.statLabel}
      >
        {label}
      </AppText>

      <AppText
        variant="heading"
        style={[
          styles.statValue,
          { color: colors.text },
        ]}
      >
        {value}
      </AppText>
    </View>
  );
}

export default function AnalyticsMetricChart({
  points,
  stats,
  color,
  unit,
}: {
  points: AnalyticsMetricPoint[];
  stats: AnalyticsMetricStat[];
  color: string;
  unit: string;
}) {
  const { family } =
    useTypography();

  const chartColors =
    useChartColors();

  const [boxW, setBoxW] =
    useState(0);

  const scrollRef =
    useRef<ScrollViewInstance | null>(
      null,
    );

  const onLayout = (
    event: LayoutChangeEvent,
  ) =>
    setBoxW(
      event.nativeEvent.layout
        .width,
    );

  const real = useMemo(
    () =>
      points.filter((point) =>
        Number.isFinite(
          point.value,
        ),
      ),
    [points],
  );

  const isEmpty =
    real.length === 0;

  const data = useMemo(
    () =>
      isEmpty
        ? [
            {
              value: 0,
              label: "",
            },
            {
              value: 0,
              label: "",
            },
          ]
        : real.map((point) => ({
            value:
              point.value,
            label:
              point.label,
          })),
    [real, isEmpty],
  );

  const chartW =
    Math.max(
      boxW - Y_AXIS_W - 2,
      120,
    );

  const spacing = isEmpty
    ? Math.max(
        chartW - 36,
        40,
      )
    : Math.max(
        DEFAULT_POINT_WIDTH,
        (chartW - 36) /
          (real.length - 1),
      );

  const maxValue = useMemo(
    () =>
      niceCeil(
        Math.max(
          0,
          ...data.map(
            (point) =>
              point.value,
          ),
        ) || 1,
      ),
    [data],
  );

  useEffect(() => {
    if (
      isEmpty ||
      boxW <= 0
    ) {
      return;
    }

    const timer =
      setTimeout(() => {
        scrollRef.current?.scrollToEnd(
          {
            animated: false,
          },
        );
      }, 300);

    return () =>
      clearTimeout(timer);
  }, [
    isEmpty,
    boxW,
    data.length,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <Stat
            key={stat.label}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </View>

      <View
        onLayout={onLayout}
        style={styles.chartWrap}
      >
        {boxW > 0 ? (
          <LineChart
            key={`metric-${data.length}-${unit}`}
            data={data}
            scrollRef={scrollRef}
            height={CHART_HEIGHT}
            width={chartW}
            overflowTop={8}
            curved
            areaChart
            color={color}
            thickness={1.6}
            startFillColor={color}
            endFillColor={color}
            startOpacity={
              0.28
            }
            endOpacity={
              0.02
            }
            maxValue={maxValue}
            noOfSections={4}
            yAxisLabelWidth={
              Y_AXIS_W
            }
            formatYLabel={(
              label: string,
            ) =>
              Number(
                label,
              ).toFixed(0)
            }
            yAxisThickness={
              0
            }
            yAxisTextStyle={{
              fontSize: 12,
              fontFamily: family,
              color:
                chartColors.axisLabel,
            }}
            xAxisColor={
              chartColors.grid
            }
            xAxisLabelTextStyle={{
              fontSize: 12,
              fontFamily: family,
              color:
                chartColors.axisLabel,
            }}
            rulesType="solid"
            rulesColor={
              chartColors.grid
            }
            rulesThickness={
              1
            }
            showVerticalLines={
              false
            }
            hideDataPoints={
              isEmpty ||
              Platform.OS ===
                "web"
            }
            dataPointsColor={
              color
            }
            dataPointsRadius={
              3
            }
            spacing={spacing}
            initialSpacing={
              20
            }
            endSpacing={
              0
            }
            showScrollIndicator={
              false
            }
            scrollToEnd
            scrollAnimation={
              false
            }
          />
        ) : (
          <View
            style={{
              height: CHART_HEIGHT,
            }}
          />
        )}
      </View>

      <AppText
        variant="caption"
        style={styles.unitLabel}
      >
        {`Vertical axis: ${unit}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  statsRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },

  stat: {
    minWidth: 92,
    flexGrow: 1,
  },

  statLabel: {
    color: "#6B7280",
    fontWeight: "600",
  },

  statValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },

  chartWrap: {
    width: "100%",
    marginLeft: -10,
  },

  unitLabel: {
    color: "#6B7280",
    marginTop: 6,
    textAlign: "right",
  },
});
