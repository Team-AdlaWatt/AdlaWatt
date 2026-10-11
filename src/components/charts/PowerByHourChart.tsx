import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  BarChart,
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

const DEFAULT_BAR_WIDTH = 22;
const Y_AXIS_W = 38; // width reserved for the fixed Wh labels
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

// Compact watt-hours: 1500 -> "1.5kWh", 800 -> "800Wh".
function formatWh(value: number): string {
  if (value >= 1000) {
    const kwh =
      Math.round((value / 1000) * 10) / 10;

    return `${kwh}kWh`;
  }

  return `${Math.round(value)}Wh`;
}

/* ============================================================
   POWER USE BY HOUR
   Yellow bars of average energy output per hour of day, 0-23
   across the whole range (react-native-gifted-charts, SVG-based
   so it works on native and web with no extra engine loading).
   No frequency toggle: the shape is the point, so the buckets
   are always the 24 hours. Y scale is dynamic (nice-ceiled max).
   The chart opens at midnight (no scroll-to-end); bars scroll
   on narrow screens with the labels fixed.
   Do NOT wrap this component in a horizontal ScrollView.
   ============================================================ */

export default function PowerByHourChart({
  points,
  barWidth = DEFAULT_BAR_WIDTH,
}: {
  points: ChartPoint[];
  barWidth?: number;
}) {
  const { family } = useTypography();
  const chartColors = useChartColors();
  const colors = useAppColors();

  const [boxW, setBoxW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setBoxW(e.nativeEvent.layout.width);

  const scrollRef = useRef<ScrollView | null>(null);

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
          hour,
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

  // Layout numbers: visible plot width only, so the Wh labels
  // stay in place. chartWrap bleeds left toward the card border
  // (-10), so boxW already includes the shift and labels + grid
  // move together.
  const chartW = Math.max(boxW - Y_AXIS_W - 2, 120);
  const spacing = Math.max(
    28,
    (chartW - barWidth - 36) / (data.length - 1),
  );

  // Stats: one value each, nothing repeats.
  const heaviest = data.reduce(
    (top, p) => (p.value > top.value ? p : top),
    data[0],
  );
  const quietest = data.reduce(
    (low, p) => (p.value < low.value ? p : low),
    data[0],
  );

  useEffect(() => {
    if (boxW <= 0) {
      return;
    }

    const first = setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: 0,
        animated: false,
      });
    }, 300);

    return () => {
      clearTimeout(first);
    };
  }, [boxW, data.length]);

  return (
    <View style={styles.container}>
      {/* Stats: text labels, not color only. */}
      <View style={styles.statsRow}>
        <Stat
          label="Heaviest"
          value={
            isEmpty
              ? "-"
              : `${formatWh(heaviest.value)} (${data[heaviest.hour].label})`
          }
          color={colors.text}
        />

        <Stat
          label="Quietest"
          value={
            isEmpty ? "-" : `${data[quietest.hour].label}`
          }
          color={colors.text}
        />
      </View>

      <View
        onLayout={onLayout}
        style={styles.chartWrap}
      >
        {boxW > 0 ? (
          <BarChart
            key="power-by-hour-24"
            data={isEmpty ? data.map((p) => ({ ...p, value: 0 })) : data}
            scrollRef={scrollRef}
            height={CHART_HEIGHT}
            width={chartW}
            barWidth={barWidth}
            barBorderRadius={4}
            frontColor={chartColors.yellow}
            maxValue={top}
            noOfSections={SECTIONS}
            yAxisLabelWidth={Y_AXIS_W}
            formatYLabel={(label: string) =>
              formatWh(Number(label))
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
            spacing={spacing}
            initialSpacing={20}
            endSpacing={20}
            showScrollIndicator={false}
            scrollAnimation={false}
          />
        ) : (
          <View style={{ height: CHART_HEIGHT }} />
        )}
      </View>

      {/* Legend: color + text so meaning never depends
          on color alone. */}
      <View
        style={styles.legend}
        accessibilityRole="text"
        accessibilityLabel="Legend: yellow bars hourly energy use"
      >
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: chartColors.yellow },
            ]}
          />

          <AppText
            variant="caption"
            style={styles.legendText}
          >
            Hourly use
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

  legendSwatch: {
    width: 18,
    height: 10,
    borderRadius: 2,
  },

  legendText: {
    fontSize: 12,
  },
});
