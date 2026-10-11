import {
  useMemo,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  Platform,
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
  ChartPoint,
} from "@/services/analyticsService";

/* ============================================================
   CONSTANTS
   ============================================================ */

// Fixed 24 hourly buckets. Narrow points so the full day fits;
// the plot still scrolls on small screens.
const POINT_WIDTH = 36;
const Y_AXIS_W = 38; // width reserved for the fixed W labels
const SECTIONS = 4;
// X labels stay readable: only every 6th hour is named.
const LABELED_HOURS = new Set([0, 6, 12, 18]);

/* ============================================================
   SMALL UI PIECES
   ============================================================ */

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
      <AppText
        variant="caption"
        style={styles.statLabel}
      >
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

/* ============================================================
   SOLAR CURVE BY HOUR
   Thin green line of average solar input per hour of day,
   0-23 across the whole range (react-native-gifted-charts,
   SVG-based so it works on native and web with no extra engine
   loading). No frequency toggle: the curve shape is the point,
   so the buckets are always the 24 hours. Y scale is dynamic
   (nice-ceiled peak) because watts are unbounded.
   The curve opens at midnight (no scroll-to-end); the plot may
   scroll on narrow screens with the Y labels fixed.
   Do NOT wrap this component in a horizontal ScrollView.
   ============================================================ */

export default function SolarCurveByHourChart({
  points,
}: {
  points: ChartPoint[];
}) {
  const { family } = useTypography();
  const chartColors = useChartColors();
  const colors = useAppColors();

  const [boxW, setBoxW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setBoxW(e.nativeEvent.layout.width);

  // Always 24 buckets; pad short input so the day is complete.
  // Only every 6th hour carries an x-label to avoid crowding.
  const data = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => {
        const point = points[hour];

        return {
          value:
            point != null && Number.isFinite(point.value)
              ? Math.max(0, point.value)
              : 0,
          label: LABELED_HOURS.has(hour)
            ? (point?.label ?? "")
            : "",
        };
      }),
    [points],
  );

  const total = useMemo(
    () => data.reduce((sum, p) => sum + p.value, 0),
    [data],
  );
  const isEmpty = total <= 0;

  // Dynamic Y range: nice ceiling over the hourly peak.
  const top = isEmpty
    ? 10
    : niceCeil(Math.max(...data.map((p) => p.value)));

  // Layout numbers: visible plot width only, so the W labels
  // stay in place. chartWrap bleeds left toward the card border
  // (-10), so boxW already includes the shift and labels + grid
  // move together.
  const chartW = Math.max(boxW - Y_AXIS_W - 2, 120);
  const spacing = Math.max(
    POINT_WIDTH,
    (chartW - 36) / (data.length - 1),
  );

  // Stats: one value each, nothing repeats.
  const peakHour = data.reduce(
    (top, p, hour) => (p.value > top.value ? { value: p.value, hour } : top),
    { value: data[0].value, hour: 0 },
  );
  const average =
    data.reduce((sum, p) => sum + p.value, 0) / data.length;

  return (
    <View style={styles.container}>
      {/* Stats: text labels, not color only. */}
      <View style={styles.statsRow}>
        <Stat
          label="Peak"
          value={
            isEmpty
              ? "-"
              : `${Math.round(peakHour.value)}W (${data[peakHour.hour].label})`
          }
          color={colors.text}
        />

        <Stat
          label="Average"
          value={
            isEmpty ? "-" : `${Math.round(average)}W`
          }
          color={colors.text}
        />
      </View>

      <View
        onLayout={onLayout}
        style={styles.chartWrap}
      >
        {boxW > 0 ? (
            <LineChart
              key="solar-curve-24"
              data={isEmpty ? data.map((p) => ({ ...p, value: 0 })) : data}
              height={CHART_HEIGHT}
              width={chartW}
              overflowTop={8}
              curved
            areaChart
            color={chartColors.green}
            thickness={1.5}
            startFillColor={chartColors.green}
            endFillColor={chartColors.green}
            startOpacity={colors.isDark ? 0.22 : 0.32}
            endOpacity={0.02}
            maxValue={top}
            noOfSections={SECTIONS}
            yAxisLabelWidth={Y_AXIS_W}
            formatYLabel={(label: string) =>
              `${Math.round(Number(label))}W`
            }
            yAxisThickness={0}
            yAxisTextStyle={{
              fontSize: 12,
              fontFamily: family,
              color: chartColors.axisLabel,
            }}
            xAxisColor={chartColors.grid}
            xAxisLabelTextStyle={{
              fontSize: 12,
              fontFamily: family,
              color: chartColors.axisLabel,
            }}
            rulesType="solid"
            rulesColor={chartColors.grid}
            rulesThickness={1}
            showVerticalLines={false}
            hideDataPoints={isEmpty || Platform.OS === "web"}
            dataPointsColor={chartColors.green}
            dataPointsRadius={3}
            spacing={spacing}
            initialSpacing={20}
            endSpacing={0}
            showScrollIndicator={false}
            scrollAnimation={false}
          />
        ) : (
          <View style={{ height: CHART_HEIGHT }} />
        )}
      </View>

      {/* Legend: line style + text so meaning never depends
          on color alone. */}
      <View
        style={styles.legend}
        accessibilityRole="text"
        accessibilityLabel="Legend: green line average solar by hour"
      >
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatchThin,
              { backgroundColor: chartColors.green },
            ]}
          />

          <AppText
            variant="caption"
            style={styles.legendText}
          >
            Average
          </AppText>
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },

  statValue: {
    fontSize: 20,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },

  chartWrap: {
    width: "100%",
    marginLeft: -10,
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 14,
    marginTop: 10,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  legendSwatchThin: {
    width: 18,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.9,
  },

  legendText: {
    fontSize: 12,
  },
});
