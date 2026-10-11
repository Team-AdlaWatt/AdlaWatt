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
  useChartColors,
} from "@/services/chartMath";
import { useTypography } from "@/hooks/useTypography";
import { useAppColors } from "@/hooks/useAppColors";
import AppText from "@/components/ui/AppText";
import type {
  UnsafeBarPoint,
} from "@/services/analyticsService";

/* ============================================================
   CONSTANTS
   ============================================================ */

const DEFAULT_BAR_WIDTH = 22;
const Y_AXIS_W = 38; // width reserved for the fixed count labels

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
   UNSAFE DISCHARGE EVENTS
   Red bar chart (react-native-gifted-charts, SVG-based so it
   works on native and web with no extra engine loading).
   One bar per period: snapshots below 20% battery. Zero bars
   are valid data (safe periods), not missing data. The chart
   is the VISIBLE width only, so gifted-charts scrolls the
   plot inside and the count labels stay fixed (opens at the
   newest data via scrollToEnd). Axes always render, even with
   no unsafe events. A text legend pairs color with meaning so
   it never relies on color alone.
   Do NOT wrap this component in a horizontal ScrollView.
   ============================================================ */

export default function UnsafeDischargeChart({
  points,
  barWidth = DEFAULT_BAR_WIDTH,
}: {
  points: UnsafeBarPoint[];
  barWidth?: number;
}) {
  // Family-only: axis sizes stay 12 by design, only the
  // typeface follows Preferences.
  const { family } = useTypography();
  // Unsafe red follows the theme; grid/axis neutrals too.
  const chartColors = useChartColors();
  const colors = useAppColors();

  const [boxW, setBoxW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setBoxW(e.nativeEvent.layout.width);

  // Own the chart's scroll ref (same pattern as the battery
  // chart): re-assert the end position after layout settles
  // in case the library's content-size scroll fires early.
  const scrollRef = useRef<ScrollView | null>(null);

  // Skip non-finite values (periods with no data). Zero stays:
  // a safe period is information, not a gap.
  const real = useMemo(
    () =>
      points.filter(
        (p): p is UnsafeBarPoint =>
          Number.isFinite(p.value),
      ),
    [points],
  );
  const isEmpty = real.length < 2;

  // Y range: tidy headroom above the worst period, at least
  // a 5-count window so a single event still reads.
  const maxCount = isEmpty
    ? 0
    : Math.max(...real.map((p) => p.value));
  const top = Math.max(5, Math.ceil((maxCount + 1) / 5) * 5);
  const sections = 5;

  const data = useMemo(
    () =>
      isEmpty
        ? [
            { value: 0, label: "" },
            { value: 0, label: "" },
          ]
        : real.map((p) => ({
            value: Math.max(0, Math.round(p.value)),
            label: p.label ?? "",
          })),
    [real, isEmpty],
  );

  // Layout numbers: visible plot width only, so the plot
  // scrolls inside and the count labels stay in place.
  // chartWrap bleeds left toward the card border (-10), so boxW
  // already includes the shift and labels + grid move together.
  const chartW = Math.max(boxW - Y_AXIS_W - 2, 120);
  const spacing = isEmpty
    ? Math.max(chartW - barWidth - 36, 28)
    : Math.max(28, (chartW - barWidth - 36) / (real.length - 1));

  // Stats.
  const total = isEmpty
    ? null
    : real.reduce((sum, p) => sum + p.value, 0);
  const worst = isEmpty ? null : maxCount;
  const worstPoint = isEmpty
    ? null
    : real.find((p) => p.value === maxCount) ?? null;
  const safeDays = isEmpty
    ? null
    : real.filter((p) => p.value === 0).length;
  const hasUnsafe = total != null && total > 0;

  useEffect(() => {
    if (isEmpty || boxW <= 0) {
      return;
    }

    const first = setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: false,
      });
    }, 300);

    const second = setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: false,
      });
    }, 1000);

    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, [isEmpty, boxW, data.length]);

  return (
    <View style={styles.container}>
      {/* Stats: text labels, not color only. */}
      <View style={styles.statsRow}>
        <Stat
          label="Total"
          value={total != null ? `${total}` : "-"}
          color={hasUnsafe ? chartColors.red : colors.text}
        />

        <Stat
          label="Worst period"
          value={
            worst != null && worstPoint
              ? `${worst} (${worstPoint.label})`
              : "-"
          }
          color={hasUnsafe ? chartColors.red : colors.text}
        />

        <Stat
          label="Safe periods"
          value={safeDays != null ? `${safeDays}` : "-"}
          color={colors.text}
        />
      </View>

      {/* Chart row: plot (measured, full width). The plot
          scrolls inside on web and native; count labels stay
          fixed. The row always renders so onLayout can
          measure; only the chart waits for the real width. */}
      <View
        onLayout={onLayout}
        style={styles.chartWrap}
      >
        {boxW > 0 ? (
          <BarChart
            key={`unsafe-${data.length}`}
            data={data}
            scrollRef={scrollRef}
            height={CHART_HEIGHT}
            width={chartW}
            barWidth={barWidth}
            barBorderRadius={4}
            frontColor={chartColors.red}
            maxValue={top}
            noOfSections={sections}
            yAxisLabelWidth={Y_AXIS_W}
            formatYLabel={(label: string) =>
              `${Math.round(Number(label))}`
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
            scrollToEnd
            scrollAnimation={false}
          />
        ) : (
          <View style={{ height: CHART_HEIGHT }} />
        )}
      </View>

      {isEmpty || !hasUnsafe ? (
        <AppText
          variant="caption"
          style={styles.emptyNote}
        >
          No unsafe events in this range — the battery stayed
          safe.
        </AppText>
      ) : null}

      {/* Legend: color + text so meaning never depends on
          color alone. */}
      <View
        style={styles.legend}
        accessibilityRole="text"
        accessibilityLabel="Legend: red bars are unsafe discharge snapshots per period"
      >
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: chartColors.red },
            ]}
          />

          <AppText
            variant="caption"
            style={styles.legendText}
          >
            Unsafe snapshots
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

  emptyNote: {
    marginTop: 8,
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
