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
  OnlineShare,
} from "@/services/analyticsService";

/* ============================================================
   CONSTANTS
   ============================================================ */

const DONUT_RADIUS = 85;
const DONUT_INNER_RADIUS = 55;
const SELECTION_RESET_MS = 5000;
const FOCUS_EXPAND_RADIUS = 8;

type OnlineKey = "online" | "offline";

interface OnlineSlice {
  key: OnlineKey;
  label: string;
  value: number;
  percent: number;
}

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
   ONLINE VS OFFLINE DONUT
   Online = green, Offline = red (alert).
   No blue anywhere: every slice sets an explicit color.
   Same tap-to-reveal interaction as Battery Activity: tapping a
   slice swaps its samples into the center for 5s, then the view
   auto-reverts and the slice closes. Focus is driven live via
   focusedPieIndex on a stable key (never remount per tap) because
   datum onPress skips the library's internal focus.
   Stats carry % and the center carries counts, so color is never
   the only indicator.
   ============================================================ */

const SLICE_ORDER: OnlineKey[] = [
  "online",
  "offline",
];

export default function OnlineOfflineChart({
  share,
}: {
  share: OnlineShare;
}) {
  const { family } = useTypography();
  const chartColors = useChartColors();
  const colors = useAppColors();

  const total = share.online + share.offline;
  const isEmpty = total <= 0;

  const ordered = useMemo<OnlineSlice[]>(
    () =>
      SLICE_ORDER.map((key) => {
        const value = key === "online" ? share.online : share.offline;

        return {
          key,
          label: key === "online" ? "Online" : "Offline",
          value,
          percent:
            total > 0 ? Math.round((value / total) * 100) : 0,
        };
      }),
    [share, total],
  );

  // Tap-to-reveal: center swaps total -> tapped slice count,
  // then auto-reverts after 5s. Rapid taps restart the clock.
  // Expand is driven through live focusedPieIndex (the library
  // reacts to it in place), so slice switches never tear down
  // the chart.
  const [
    selectedKey,
    setSelectedKey,
  ] = useState<OnlineKey | null>(null);
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
    (key: OnlineKey) => {
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
  }, [share, isEmpty]);

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

  // Explicit frozen mapping: green / red. No blue.
  const sliceColors = useMemo(
    () => ({
      online: chartColors.green,
      offline: chartColors.red,
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

  const online = ordered[0];
  const offline = ordered[1];

  return (
    <View style={styles.container}>
      {/* Stats: one % per slice. Total count lives only in
          the donut center, so nothing repeats. */}
      <View style={styles.statsRow}>
        <Stat
          label="Online"
          value={
            isEmpty ? "-" : `${online.percent}%`
          }
          color={colors.text}
        />

        <Stat
          label="Offline"
          value={
            isEmpty ? "-" : `${offline.percent}%`
          }
          color={colors.text}
        />
      </View>

      {/* Donut: center shows total, or the tapped slice count
          for 5s. Slices carry no inner text. Tapping a slice
          expands it (focus) and reveals its samples. */}
      <View style={styles.donutWrap}>
        <PieChart
          // Stable across taps: focus is driven live via
          // focusedPieIndex, so slice-to-slice switches never
          // tear down the chart. Remounts only when data changes.
          key={`online-${pieData.length}`}
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
          device status.
        </AppText>
      ) : null}

      {/* Legend: color + text so meaning never depends
          on color alone. Font family follows Preferences. */}
      <View
        style={styles.legend}
        accessibilityRole="text"
        accessibilityLabel="Legend: green online, red offline"
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
