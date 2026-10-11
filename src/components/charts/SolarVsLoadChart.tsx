import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  Platform,
  ScrollView,
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
  SolarVsLoadPoint,
} from "@/services/analyticsService";

/* ============================================================
   CONSTANTS
   ============================================================ */

const DEFAULT_POINT_WIDTH = 60;
const Y_AXIS_W = 38; // width reserved for the fixed W labels
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
   SOLAR VS LOAD
   Dual thin lines (react-native-gifted-charts, SVG-based so it
   works on native and web with no extra engine loading).
   Solar renders green with area fill; load renders yellow as a
   bare line so the overlap never turns muddy. Y scale is dynamic
   (nice-ceiled data max) because watts are unbounded.
   The Y axis labels stay fixed while the plot scrolls inside;
   the chart opens at the newest data via scrollToEnd.
   Do NOT wrap this component in a horizontal ScrollView.
   ============================================================ */

export default function SolarVsLoadChart({
  points,
  pointWidth = DEFAULT_POINT_WIDTH,
}: {
  points: SolarVsLoadPoint[];
  pointWidth?: number;
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
        (p): p is SolarVsLoadPoint =>
          Number.isFinite(p.solar) &&
          Number.isFinite(p.load),
      ),
    [points],
  );
  const isEmpty = real.length < 2;

  // Dynamic Y range: nice ceiling over both series.
  const top = isEmpty
    ? 10
    : niceCeil(
        Math.max(
          ...real.map((p) =>
            Math.max(p.solar, p.load),
          ),
        ),
      );

  // Chart data on the 0-top scale.
  const data = useMemo(
    () =>
      isEmpty
        ? [
            { value: 0, label: "" },
            { value: 0, label: "" },
          ]
        : real.map((p) => ({
            value: Math.max(0, p.solar),
            label: p.label ?? "",
          })),
    [real, isEmpty],
  );

  // Load line: same length/order, no x-labels (labels stay on
  // the primary series to avoid duplicates).
  const dataLoad = useMemo(
    () =>
      isEmpty
        ? [
            { value: 0 },
            { value: 0 },
          ]
        : real.map((p) => ({
            value: Math.max(0, p.load),
          })),
    [real, isEmpty],
  );

  // Layout numbers: visible plot width only, so the plot
  // scrolls inside and the W labels stay in place.
  // chartWrap bleeds left toward the card border (-10), so boxW
  // already includes the shift and labels + grid move together.
  const chartW = Math.max(boxW - Y_AXIS_W - 2, 120);
  const spacing = isEmpty
    ? Math.max(chartW - 36, 40)
    : Math.max(pointWidth, (chartW - 36) / (real.length - 1));

  // Stats: one value each, nothing repeats.
  const latestSolar = isEmpty ? null : real[real.length - 1].solar;
  const avgSolar = isEmpty
    ? null
    : real.reduce((sum, p) => sum + p.solar, 0) / real.length;
  const avgLoad = isEmpty
    ? null
    : real.reduce((sum, p) => sum + p.load, 0) / real.length;

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
          label="Latest solar"
          value={
            latestSolar != null ? `${Math.round(latestSolar)}W` : "-"
          }
          color={colors.text}
        />

        <Stat
          label="Avg solar"
          value={
            avgSolar != null ? `${Math.round(avgSolar)}W` : "-"
          }
          color={colors.text}
        />

        <Stat
          label="Avg load"
          value={
            avgLoad != null ? `${Math.round(avgLoad)}W` : "-"
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
              key={`solar-load-${data.length}`}
              data={data}
              data2={dataLoad}
              scrollRef={scrollRef}
              height={CHART_HEIGHT}
              width={chartW}
              overflowTop={8}
              curved
            areaChart
            color={chartColors.green}
            color2={chartColors.yellow}
            thickness={1.5}
            thickness2={1.5}
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
            hideDataPoints2={isEmpty || Platform.OS === "web"}
            dataPointsColor={chartColors.green}
            dataPointsColor2={chartColors.yellow}
            dataPointsRadius={3}
            spacing={spacing}
            initialSpacing={20}
            endSpacing={0}
            showScrollIndicator={false}
            scrollToEnd
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
        accessibilityLabel="Legend: green line solar input, yellow line current load"
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
            Solar
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatchThin,
              { backgroundColor: chartColors.yellow },
            ]}
          />

          <AppText
            variant="caption"
            style={styles.legendText}
          >
            Load
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
