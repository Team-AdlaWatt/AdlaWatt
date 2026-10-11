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

// Signed compact watt-hours: -1500 -> "-1.5kWh", +900 -> "+900Wh".
function formatSignedWh(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";

  if (abs >= 1000) {
    const kwh =
      Math.round((abs / 1000) * 10) / 10;

    return `${sign}${kwh}kWh`;
  }

  return `${sign}${Math.round(abs)}Wh`;
}

/* ============================================================
   NET ENERGY
   Bars of net energy (input minus output) per period: green for
   surplus, red for deficit (react-native-gifted-charts, SVG-based
   so it works on native and web with no extra engine loading).
   Negative bars render below the axis via mostNegativeValue.
   Y scale is dynamic (nice-ceiled extremes) because watt-hours
   are unbounded. The labels stay fixed while bars scroll inside;
   the chart opens at the newest data via scrollToEnd.
   Do NOT wrap this component in a horizontal ScrollView.
   ============================================================ */

export default function NetEnergyChart({
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

  // Skip non-finite values (periods with no data).
  const real = useMemo(
    () =>
      points.filter(
        (p): p is ChartPoint & { value: number } =>
          Number.isFinite(p.value),
      ),
    [points],
  );
  const isEmpty = real.length < 2;

  // Dynamic Y range on both sides of zero.
  const maxPositive = isEmpty
    ? 0
    : Math.max(0, ...real.map((p) => p.value));
  const maxDeficit = isEmpty
    ? 0
    : Math.max(0, ...real.map((p) => -p.value));
  const top = niceCeil(Math.max(maxPositive, 1));
  const bottom = maxDeficit > 0 ? niceCeil(maxDeficit) : 0;

  const data = useMemo(
    () =>
      isEmpty
        ? [
            { value: 0, label: "", frontColor: chartColors.green },
            { value: 0, label: "", frontColor: chartColors.green },
          ]
        : real.map((p) => ({
            value: p.value,
            label: p.label ?? "",
            frontColor:
              p.value >= 0 ? chartColors.green : chartColors.red,
          })),
    [real, isEmpty, chartColors],
  );

  // Layout numbers: visible plot width only, so the plot
  // scrolls inside and the Wh labels stay in place.
  // chartWrap bleeds left toward the card border (-10), so boxW
  // already includes the shift and labels + grid move together.
  const chartW = Math.max(boxW - Y_AXIS_W - 2, 120);
  const spacing = isEmpty
    ? Math.max(chartW - barWidth - 36, 28)
    : Math.max(28, (chartW - barWidth - 36) / (real.length - 1));

  // Stats: one value each, nothing repeats.
  const net = isEmpty
    ? null
    : real.reduce((sum, p) => sum + p.value, 0);
  const surplusDays = isEmpty
    ? null
    : real.filter((p) => p.value >= 0).length;

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
          label="Net"
          value={net != null ? formatSignedWh(net) : "-"}
          color={
            net != null && net < 0 ? chartColors.red : colors.text
          }
        />

        <Stat
          label="Surplus days"
          value={
            surplusDays != null
              ? `${surplusDays}/${real.length}`
              : "-"
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
            key={`net-energy-${data.length}`}
            data={data}
            scrollRef={scrollRef}
            height={CHART_HEIGHT}
            width={chartW}
            barWidth={barWidth}
            barBorderRadius={4}
            maxValue={top}
            mostNegativeValue={bottom}
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
        accessibilityLabel="Legend: green bars surplus, red bars deficit"
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
            Surplus
          </AppText>
        </View>

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
            Deficit
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
