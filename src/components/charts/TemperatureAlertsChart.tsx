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
const Y_AXIS_W = 38; // width reserved for the fixed count labels
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

/* ============================================================
   TEMPERATURE ALERTS
   Red bars of High/Critical temperature days per period
   (react-native-gifted-charts, SVG-based so it works on native
   and web with no extra engine loading). All-clear ranges render
   axes plus the empty note, never a flat zero bar row.
   The count labels stay fixed while the bars scroll inside;
   the chart opens at the newest data via scrollToEnd.
   Do NOT wrap this component in a horizontal ScrollView.
   ============================================================ */

export default function TemperatureAlertsChart({
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

  // Dynamic Y range: nice ceiling over the alert counts.
  const top = isEmpty
    ? 4
    : Math.max(1, niceCeil(Math.max(...real.map((p) => p.value))));

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

  // Stats: one value each, nothing repeats.
  const total = isEmpty
    ? null
    : real.reduce((sum, p) => sum + p.value, 0);
  const worst = isEmpty
    ? null
    : real.reduce((top, p) => (p.value > top.value ? p : top), real[0]);
  const hasAlerts = total != null && total > 0;

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
          color={hasAlerts ? chartColors.red : colors.text}
        />

        <Stat
          label="Worst day"
          value={
            worst != null && hasAlerts
              ? `${worst.value} (${worst.label})`
              : "-"
          }
          color={hasAlerts ? chartColors.red : colors.text}
        />
      </View>

      <View
        onLayout={onLayout}
        style={styles.chartWrap}
      >
        {boxW > 0 ? (
          <BarChart
            key={`temp-alerts-${data.length}`}
            data={data}
            scrollRef={scrollRef}
            height={CHART_HEIGHT}
            width={chartW}
            barWidth={barWidth}
            barBorderRadius={4}
            frontColor={chartColors.red}
            maxValue={top}
            noOfSections={SECTIONS}
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

      {/* Legend: color + text so meaning never depends
          on color alone. */}
      <View
        style={styles.legend}
        accessibilityRole="text"
        accessibilityLabel="Legend: red bars high or critical heat days"
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
            Alert days
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
