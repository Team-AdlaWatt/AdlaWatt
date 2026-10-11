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
  ChartPoint,
} from "@/services/analyticsService";

/* ============================================================
   CONSTANTS
   ============================================================ */

const DEFAULT_POINT_WIDTH = 60;
const Y_AXIS_W = 38; // width reserved for the fixed °C labels
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
   TEMPERATURES
   Three thin lines per period — battery green, solar yellow,
   interior red (react-native-gifted-charts, SVG-based so it
   works on native and web with no extra engine loading). Only
   the battery series carries area fill so overlaps never turn
   muddy. Y scale is dynamic (nice-ceiled data max) because
   temperatures are unbounded.
   Interior NULL discipline: history predates the v8
   interior_temp column, so interior gaps are filled from the
   last finite value (flat lead-in from the first finite one).
   Ranges with no interior data at all render the two older
   lines with "-" interior stats; the legend still lists all
   three as commitment to the line.
   The Y axis labels stay fixed while the plot scrolls inside;
   the chart opens at the newest data via scrollToEnd.
   All three point arrays must share buckets (same order).
   Do NOT wrap this component in a horizontal ScrollView.
   ============================================================ */

export default function TemperaturesChart({
  battPoints,
  solarPoints,
  interiorPoints,
  pointWidth = DEFAULT_POINT_WIDTH,
}: {
  battPoints: ChartPoint[];
  solarPoints: ChartPoint[];
  interiorPoints: ChartPoint[];
  pointWidth?: number;
}) {
  const { family } = useTypography();
  const chartColors = useChartColors();
  const colors = useAppColors();

  const [boxW, setBoxW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setBoxW(e.nativeEvent.layout.width);

  const scrollRef = useRef<ScrollView | null>(null);

  // Pair up by index on the two always-present series; interior
  // rides along as number|null (never drops a bucket).
  const pairs = useMemo(
    () =>
      battPoints
        .map((battPoint, index) => ({
          batt: battPoint.value,
          solar: solarPoints[index]?.value,
          interior:
            interiorPoints[index] != null &&
            Number.isFinite(interiorPoints[index].value)
              ? (interiorPoints[index].value as number)
              : null,
          label: battPoint.label ?? "",
        }))
        .filter(
          (pair) =>
            Number.isFinite(pair.batt) &&
            Number.isFinite(pair.solar),
        ),
    [battPoints, solarPoints, interiorPoints],
  );
  const isEmpty = pairs.length < 2;

  // Interior finite values, in order, for fill + stats.
  const interiorFinite = useMemo(
    () =>
      pairs
        .map((pair, index) => ({ value: pair.interior, index }))
        .filter(
          (
            entry,
          ): entry is { value: number; index: number } =>
            entry.value != null,
        ),
    [pairs],
  );
  const hasInterior = interiorFinite.length > 0;

  // Gap fill: flat lead-in from the first finite value, then
  // carry the last finite value forward. 1:1 bucket alignment
  // is preserved; no bucket is ever dropped for interior gaps.
  const interiorFilled = useMemo(() => {
    if (!hasInterior) {
      return [];
    }

    let carry = interiorFinite[0].value;

    return pairs.map((pair) => {
      if (pair.interior != null) {
        carry = pair.interior;
      }

      return carry;
    });
  }, [pairs, interiorFinite, hasInterior]);

  // Dynamic Y range: nice ceiling over every visible series.
  const top = isEmpty
    ? 10
    : niceCeil(
        Math.max(
          ...pairs.flatMap((pair) => [
            pair.batt,
            pair.solar as number,
          ]),
          ...(hasInterior ? interiorFilled : [0]),
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
        : pairs.map((pair) => ({
            value: Math.max(0, pair.batt),
            label: pair.label,
          })),
    [pairs, isEmpty],
  );

  // Solar line: same length/order, no x-labels (labels stay on
  // the primary series to avoid duplicates).
  const dataSolar = useMemo(
    () =>
      isEmpty
        ? [
            { value: 0 },
            { value: 0 },
          ]
        : pairs.map((pair) => ({
            value: Math.max(0, pair.solar as number),
          })),
    [pairs, isEmpty],
  );

  // Interior line: filled values, same length/order, no labels.
  // Empty when the range has no interior data at all.
  const dataInterior = useMemo(
    () =>
      !hasInterior
        ? []
        : interiorFilled.map((value) => ({
            value: Math.max(0, value),
          })),
    [interiorFilled, hasInterior],
  );

  // Layout numbers: visible plot width only, so the plot
  // scrolls inside and the °C labels stay in place.
  // chartWrap bleeds left toward the card border (-10), so boxW
  // already includes the shift and labels + grid move together.
  const chartW = Math.max(boxW - Y_AXIS_W - 2, 120);
  const spacing = isEmpty
    ? Math.max(chartW - 36, 40)
    : Math.max(pointWidth, (chartW - 36) / (pairs.length - 1));

  // Stats: one value each, nothing repeats.
  const latestBatt = isEmpty ? null : pairs[pairs.length - 1].batt;
  const latestSolar = isEmpty
    ? null
    : (pairs[pairs.length - 1].solar as number);
  const latestInterior = hasInterior
    ? interiorFilled[interiorFilled.length - 1]
    : null;
  const hottest = hasInterior
    ? interiorFinite.reduce((top, entry) =>
        entry.value > top.value ? entry : top,
      )
    : null;

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
          label="Batt"
          value={
            latestBatt != null ? `${Math.round(latestBatt)}°C` : "-"
          }
          color={colors.text}
        />

        <Stat
          label="Solar"
          value={
            latestSolar != null
              ? `${Math.round(latestSolar)}°C`
              : "-"
          }
          color={colors.text}
        />

        <Stat
          label="Interior"
          value={
            latestInterior != null
              ? `${Math.round(latestInterior)}°C`
              : "-"
          }
          color={colors.text}
        />

        <Stat
          label="Hottest"
          value={
            hottest != null
              ? `${Math.round(hottest.value)}°C (${pairs[hottest.index].label})`
              : "-"
          }
          color={hottest != null ? chartColors.red : colors.text}
        />
      </View>

      <View
        onLayout={onLayout}
        style={styles.chartWrap}
      >
        {boxW > 0 ? (
            <LineChart
              key={`temperatures-${data.length}-${hasInterior}`}
              data={data}
              data2={dataSolar}
              // Native-only guard: omit the 3rd series entirely
              // when interior history is empty. Passing [] against
              // 2-item series throws on Fabric/SVG release builds
              // while web tolerates the length mismatch.
              {...(hasInterior &&
              dataInterior.length > 0
                ? {
                    data3:
                      dataInterior,
                  }
                : {})}
              scrollRef={scrollRef}
              height={CHART_HEIGHT}
              width={chartW}
              overflowTop={8}
              curved
            areaChart
            color={chartColors.green}
            color2={chartColors.yellow}
            color3={chartColors.red}
            thickness={1.5}
            thickness2={1.5}
            thickness3={1.5}
            startFillColor={chartColors.green}
            endFillColor={chartColors.green}
            startOpacity={colors.isDark ? 0.22 : 0.32}
            endOpacity={0.02}
            maxValue={top}
            noOfSections={SECTIONS}
            yAxisLabelWidth={Y_AXIS_W}
            formatYLabel={(label: string) =>
              `${Math.round(Number(label))}°C`
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
            hideDataPoints3={!hasInterior || Platform.OS === "web"}
            dataPointsColor={chartColors.green}
            dataPointsColor2={chartColors.yellow}
            dataPointsColor3={chartColors.red}
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
        accessibilityLabel="Legend: green line battery temperature, yellow line solar temperature, red line interior temperature"
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
            Battery
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
            Solar
          </AppText>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatchThin,
              { backgroundColor: chartColors.red },
            ]}
          />

          <AppText
            variant="caption"
            style={styles.legendText}
          >
            Interior
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
