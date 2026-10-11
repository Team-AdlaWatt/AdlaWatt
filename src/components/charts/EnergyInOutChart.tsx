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

const PAIR_BAR_WIDTH = 12;
const PAIR_SPACING = 10;
const Y_AXIS_W = 38; // width reserved for the fixed Wh labels
const SECTIONS = 4;

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

// Compact watt-hours: 8400 -> "8.4kWh", 900 -> "900Wh".
function formatWh(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1000) {
    const kwh =
      Math.round((value / 1000) * 10) / 10;

    return `${kwh}kWh`;
  }

  return `${Math.round(value)}Wh`;
}

/* ============================================================
   ENERGY IN AND OUT
   Grouped bars of energy in (green) vs out (yellow) per period
   (react-native-gifted-charts, SVG-based so it works on native
   and web with no extra engine loading). Grouping is done by
   interleaving [in, out] pairs with labels on the in-bars only.
   Y scale is dynamic (nice-ceiled data max) because watt-hours
   are unbounded. The labels stay fixed while bars scroll inside;
   the chart opens at the newest data via scrollToEnd.
   inPoints and outPoints must share buckets (same order).
   Do NOT wrap this component in a horizontal ScrollView.
   ============================================================ */

export default function EnergyInOutChart({
  inPoints,
  outPoints,
}: {
  inPoints: ChartPoint[];
  outPoints: ChartPoint[];
}) {
  const { family } = useTypography();
  const chartColors = useChartColors();
  const colors = useAppColors();

  const [boxW, setBoxW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setBoxW(e.nativeEvent.layout.width);

  const scrollRef = useRef<ScrollView | null>(null);

  // Pair up by index; skip pairs with non-finite values.
  const pairs = useMemo(
    () =>
      inPoints
        .map((inPoint, index) => ({
          inValue: inPoint.value,
          outValue: outPoints[index]?.value,
          label: inPoint.label ?? "",
        }))
        .filter(
          (pair) =>
            Number.isFinite(pair.inValue) &&
            Number.isFinite(pair.outValue),
        ),
    [inPoints, outPoints],
  );
  const isEmpty = pairs.length < 2;

  // Dynamic Y range: nice ceiling over both series.
  const top = isEmpty
    ? 10
    : niceCeil(
        Math.max(
          ...pairs.flatMap((pair) => [
            pair.inValue,
            pair.outValue,
          ]),
        ),
      );

  const data = useMemo(
    () =>
      isEmpty
        ? [
            { value: 0, label: "", frontColor: chartColors.green },
            { value: 0, label: "", frontColor: chartColors.yellow },
          ]
        : pairs.flatMap((pair) => [
            {
              value: Math.max(0, pair.inValue),
              label: pair.label,
              frontColor: chartColors.green,
            },
            {
              value: Math.max(0, pair.outValue as number),
              label: "",
              frontColor: chartColors.yellow,
            },
          ]),
    [pairs, isEmpty, chartColors],
  );

  // Layout numbers: visible plot width only, so the plot
  // scrolls inside and the Wh labels stay in place.
  // chartWrap bleeds left toward the card border (-10), so boxW
  // already includes the shift and labels + grid move together.
  const chartW = Math.max(boxW - Y_AXIS_W - 2, 120);
  const spacing = isEmpty
    ? Math.max(chartW - PAIR_BAR_WIDTH * 2 - 40, PAIR_SPACING)
    : PAIR_SPACING;

  // Stats: one value each, nothing repeats.
  const totalIn = isEmpty
    ? null
    : pairs.reduce((sum, pair) => sum + pair.inValue, 0);
  const totalOut = isEmpty
    ? null
    : pairs.reduce(
        (sum, pair) => sum + (pair.outValue as number),
        0,
      );

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
          label="Total in"
          value={totalIn != null ? formatWh(totalIn) : "-"}
          color={colors.text}
        />

        <Stat
          label="Total out"
          value={totalOut != null ? formatWh(totalOut) : "-"}
          color={colors.text}
        />
      </View>

      <View
        onLayout={onLayout}
        style={styles.chartWrap}
      >
        {boxW > 0 ? (
          <BarChart
            key={`energy-inout-${data.length}`}
            data={data}
            scrollRef={scrollRef}
            height={CHART_HEIGHT}
            width={chartW}
            barWidth={PAIR_BAR_WIDTH}
            barBorderRadius={3}
            maxValue={top}
            noOfSections={SECTIONS}
            yAxisLabelWidth={Y_AXIS_W}
            formatYLabel={(label: string) => {
              const value = Number(label);

              return Math.abs(value) >= 1000
                ? `${+(value / 1000).toFixed(1)}k`
                : `${Math.round(value)}`;
            }}
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

      {/* Legend: color + text so meaning never depends
          on color alone. */}
      <View
        style={styles.legend}
        accessibilityRole="text"
        accessibilityLabel="Legend: green bars energy in, yellow bars energy out"
      >
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              { backgroundColor: chartColors.green },
            ]}
          />

          <AppText
            variant="caption"
            style={styles.legendText}
          >
            In
          </AppText>
        </View>

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
            Out
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
