import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import {
  PieChart,
} from "react-native-gifted-charts";
import {
  useChartColors,
} from "@/services/chartMath";
import { useTypography } from "@/hooks/useTypography";
import { useAppColors } from "@/hooks/useAppColors";
import AppText from "@/components/ui/AppText";
import type {
  BatteryActivityKey,
  BatteryActivitySlice,
} from "@/services/analyticsService";

/* ============================================================
   CONSTANTS
   ============================================================ */

const DONUT_RADIUS = 85;
const DONUT_INNER_RADIUS = 55;
const SELECTION_RESET_MS = 5000;
const FOCUS_EXPAND_RADIUS = 8;

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
   BATTERY ACTIVITY DONUT
   Charging = green, Discharging = yellow, Idle = red (error).
   No blue anywhere: every slice sets an explicit color.
   Stats carry % and the center carries counts, so color is
   never the only indicator (green/red is deuteranopia-risky).
   Tapping a slice reveals its samples in the center for 5s.
   Yellow slice never hosts white text (dark ink only).
   ============================================================ */

const SLICE_ORDER: BatteryActivityKey[] =
  [
    "charging",
    "discharging",
    "idle",
  ];

export default function BatteryActivityChart({
  slices,
}: {
  slices: BatteryActivitySlice[];
}) {
  const { family } = useTypography();
  const chartColors = useChartColors();
  const colors = useAppColors();

  const byKey = useMemo(() => {
    const map = new Map<
      BatteryActivityKey,
      BatteryActivitySlice
    >();

    slices.forEach((slice) => {
      map.set(slice.key, slice);
    });

    return map;
  }, [slices]);

  const ordered = useMemo(
    () =>
      SLICE_ORDER.map(
        (key) =>
          byKey.get(key) ?? {
            key,
            label:
              key === "charging"
                ? "Charging"
                : key === "discharging"
                  ? "Discharging"
                  : "Idle",
            value: 0,
            percent: 0,
          },
      ),
    [byKey],
  );

  const total = useMemo(
    () =>
      ordered.reduce(
        (sum, slice) => sum + slice.value,
        0,
      ),
    [ordered],
  );

  const isEmpty = total <= 0;

  // Tap-to-reveal: center swaps total -> tapped slice count,
  // then auto-reverts after 5s. Rapid taps restart the clock.
  // Expand is driven through mount-time focus: datum onPress
  // skips the library's internal focus (gifted-charts-core
  // PieChart/main.js calls item.onPress instead of focusing),
  // so each selection remounts with focusedPieIndex and the
  // slice renders expanded via extraRadius + entrance animation.
  const [
    selectedKey,
    setSelectedKey,
  ] = useState<BatteryActivityKey | null>(null);
  // Position of the tapped slice within the rendered (value > 0)
  // data array. Null renders nothing focused.
  const [
    focusedIndex,
    setFocusedIndex,
  ] = useState<number | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = () => {
    if (resetTimer.current != null) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  };

  const handleSlicePress = useCallback(
    (key: BatteryActivityKey) => {
      if (isEmpty) {
        return;
      }

      const visibleKeys = ordered
        .filter((slice) => slice.value > 0)
        .map((slice) => slice.key);
      const dataIndex = visibleKeys.indexOf(key);

      if (dataIndex < 0) {
        return;
      }

      clearResetTimer();
      setSelectedKey(key);
      setFocusedIndex(dataIndex);
      resetTimer.current = setTimeout(() => {
        setSelectedKey(null);
        setFocusedIndex(null);
        resetTimer.current = null;
      }, SELECTION_RESET_MS);
    },
    [isEmpty, ordered],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset transient selection when data changes
    setSelectedKey(null);
    setFocusedIndex(null);
    clearResetTimer();

    return clearResetTimer;
  }, [slices, isEmpty]);

  // Donut hole: solid disc in both themes (never removed).
  // Light keeps the library's default white. Dark uses #252525,
  // the opaque composite of glassDark.white (8% white) over
  // background #121212, so the disc matches the card exactly.
  const holeColor = colors.isDark ? "#252525" : "white";

  const selectedSlice =
    selectedKey != null
      ? (ordered.find((slice) => slice.key === selectedKey) ?? null)
      : null;
  const selectedVisible =
    selectedSlice != null && selectedSlice.value > 0 && !isEmpty;

  // Explicit frozen mapping: green / yellow / red. No blue.
  const sliceColors = useMemo(
    () => ({
      charging: chartColors.green,
      discharging: chartColors.yellow,
      idle: chartColors.red,
    }),
    [chartColors],
  );

  const pieData = useMemo(() => {
    if (isEmpty) {
      return [
        {
          value: 1,
          color: chartColors.muted,
        },
      ];
    }

    return ordered
      .filter(
        (slice) => slice.value > 0,
      )
      .map((slice) => ({
        value: slice.value,
        color: sliceColors[slice.key],
        onPress: () => handleSlicePress(slice.key),
      }));
  }, [
    ordered,
    isEmpty,
    sliceColors,
    chartColors,
    handleSlicePress,
  ]);

  const charging = ordered[0];
  const discharging = ordered[1];
  const idle = ordered[2];

  return (
    <View style={styles.container}>
      {/* Stats: one % per slice. Total count lives only in
          the donut center, so nothing repeats. */}
      <View style={styles.statsRow}>
        <Stat
          label="Charging"
          value={
            isEmpty
              ? "-"
              : `${charging.percent}%`
          }
          color={colors.text}
        />

        <Stat
          label="Discharging"
          value={
            isEmpty
              ? "-"
              : `${discharging.percent}%`
          }
          color={colors.text}
        />

        <Stat
          label="Idle"
          value={
            isEmpty
              ? "-"
              : `${idle.percent}%`
          }
          color={colors.text}
        />
      </View>

      {/* Donut: center shows total, or the tapped slice count
          for 5s. Slices carry no inner text so yellow never hosts
          unreadable white labels. Tapping a slice expands it
          (focus animation) and reveals its samples in the center. */}
      <View style={styles.donutWrap}>
        <PieChart
          // Stable across taps: focus is driven live via
          // focusedPieIndex (the library reacts to it in place),
          // so slice-to-slice switches never tear down the chart.
          // Remounts only when the data itself changes.
          key={`activity-${pieData.length}`}
          data={pieData}
          donut
          radius={DONUT_RADIUS}
          innerRadius={DONUT_INNER_RADIUS}
          strokeWidth={2}
          strokeColor={colors.background}
          backgroundColor="transparent"
          innerCircleColor={holeColor}
          showText={false}
          focusOnPress={!isEmpty}
          sectionAutoFocus={!isEmpty}
          // Native-only guard: undefined (no selection) instead
          // of -1 — out-of-bounds focus index throws on Fabric
          // release while web ignores it.
          focusedPieIndex={
            focusedIndex ?? undefined
          }
          extraRadius={FOCUS_EXPAND_RADIUS}
          isAnimated
          centerLabelComponent={() => (
            <View
              style={[
                styles.centerLabel,
                { pointerEvents: "none" },
              ]}
            >
              {selectedVisible ? (
                <AppText
                  variant="caption"
                  style={[
                    styles.centerCaption,
                    { color: colors.text },
                  ]}
                >
                  {selectedSlice!.label}
                </AppText>
              ) : null}

              <AppText
                variant="heading"
                style={[
                  styles.centerValue,
                  { color: colors.text },
                ]}
              >
                {isEmpty
                  ? "-"
                  : selectedVisible
                    ? `${selectedSlice!.value}`
                    : `${total}`}
              </AppText>

              <AppText
                variant="caption"
                style={[
                  styles.centerCaption,
                  { color: colors.text },
                ]}
              >
                samples
              </AppText>
            </View>
          )}
        />
      </View>

      {/* Fixed hint slot: always mounted so the legend never
          shifts when the hint appears. Fades via opacity. */}
      {!isEmpty ? (
        <AppText
          variant="caption"
          style={[
            styles.emptyNote,
            { opacity: selectedVisible ? 1 : 0 },
          ]}
          accessibilityElementsHidden={
            !selectedVisible
          }
          importantForAccessibility={
            selectedVisible
              ? "yes"
              : "no-hide-descendants"
          }
        >
          Tap another slice to inspect it
        </AppText>
      ) : null}

      {isEmpty ? (
        <AppText
          variant="caption"
          style={styles.emptyNote}
        >
          No samples in this range —
          connect the device to record
          battery status.
        </AppText>
      ) : null}

      {/* Legend: color + text so meaning never depends
          on color alone. Font family follows Preferences. */}
      <View
        style={styles.legend}
        accessibilityRole="text"
        accessibilityLabel="Legend: green charging, yellow discharging, red idle"
      >
        {ordered.map((slice) => (
          <View
            key={slice.key}
            style={styles.legendItem}
          >
            <View
              style={[
                styles.legendSwatch,
                {
                  backgroundColor:
                    sliceColors[
                      slice.key
                    ],
                },
              ]}
            />

            <AppText
              variant="caption"
              style={[
                styles.legendText,
                { fontFamily: family },
              ]}
            >
              {slice.label}
            </AppText>
          </View>
        ))}
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

  donutWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },

  centerLabel: {
    alignItems: "center",
    justifyContent: "center",
  },

  centerValue: {
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },

  centerCaption: {
    fontSize: 12,
  },

  emptyNote: {
    marginTop: 8,
    textAlign: "center",
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 14,
    marginTop: 12,
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
