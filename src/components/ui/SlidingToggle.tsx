import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import AppText from "@/components/ui/AppText";
import { useAppColors } from "@/hooks/useAppColors";
import { segmentedSizes } from "@/components/ui/segmented";

// ============================================================
// SLIDING TOGGLE
//
// Shared N-segment control with a single gliding pill (the
// Bootstrap two-word-switch pattern ported to React Native).
// The pill width derives from the measured shell width so it
// stays exact on any screen size; segments keep transparent
// 48px targets with the active fill living only on the pill.
//
// Motion: 220ms native-driven glide; snaps instantly when
// the OS requests reduced motion. Colors resolve per theme.
// ============================================================

export interface SlidingOption<T extends string> {
  value: T;
  label: string;
  /** Pill fill when selected. */
  activeColor: string;
  /** Label ink on the pill (defaults to onPrimary). */
  activeInk?: string;
  accessibilityLabel: string;
}

interface SlidingToggleProps<T extends string> {
  options: readonly SlidingOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
  /**
   * Pill corner radius. Match it to the shell container's
   * radius so the box echoes the toggle shape.
   * Defaults to 8 (nests inside 12-14 shells).
   */
  pillRadius?: number;
}

const GLIDE_MS = 220;

export function SlidingToggle<T extends string>({
  options,
  value,
  onChange,
  style,
  pillRadius = 8,
}: SlidingToggleProps<T>) {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(),
    [],
  );

  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] =
    useState(false);

  // Stable glide value without render-phase ref access
  // (react-hooks/refs). Lazy useState preserves identity.
  const [glide] = useState(
    () => new Animated.Value(0),
  );

  const activeIndex = Math.max(
    0,
    options.findIndex(
      (option) => option.value === value,
    ),
  );

  const pad = 3;
  const inset = 4;
  const segmentWidth =
    width > 0
      ? (width - pad * 2) / options.length
      : 0;
  // Pill sits slightly small inside its segment so it
  // floats with distance from the shell on all sides.
  const pillWidth = Math.max(
    0,
    segmentWidth - inset * 2,
  );

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    Animated.timing(glide, {
      toValue: activeIndex,
      duration: reduceMotion ? 0 : GLIDE_MS,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, glide, reduceMotion]);

  const active = options[activeIndex];

  // Fewer than two segments carry no glide: a single option
  // renders as a static full-width status label (used by
  // content-aware callers that hide empty segments), and
  // zero options render nothing. interpolate() requires
  // ≥2-element ranges, so the Animated pill must never run
  // here — it threw Invariant Violation on single-option
  // toggles before this guard existed.
  if (options.length < 2) {
    const single = options[0];

    if (!single) {
      return null;
    }

    return (
      <View
        style={[
          segmentedSizes.shell,
          style,
        ]}
        onLayout={(event) =>
          setWidth(
            event.nativeEvent.layout.width,
          )
        }
        accessibilityRole="radiogroup"
        accessibilityLabel={
          single.accessibilityLabel
        }
      >
        <View
          style={[
            segmentedSizes.segment,
            {
              backgroundColor:
                single.activeColor,
              borderRadius: pillRadius,
              marginHorizontal: inset,
              marginVertical: 6,
            },
          ]}
          accessibilityRole="radio"
          accessibilityState={{
            selected: true,
          }}
          accessibilityLabel={
            single.accessibilityLabel
          }
        >
          <AppText
            variant="caption"
            style={[
              segmentedSizes.label,
              {
                color:
                  single.activeInk ??
                  colors.onPrimary,
              },
            ]}
          >
            {single.label}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        segmentedSizes.shell,
        style,
      ]}
      onLayout={(event) =>
        setWidth(
          event.nativeEvent.layout.width,
        )
      }
      accessibilityRole="radiogroup"
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
              marginLeft: inset,
              borderRadius: pillRadius,
              backgroundColor:
                active.activeColor,
              transform: [
                {
                  translateX: glide.interpolate(
                    {
                      inputRange: options.map(
                        (_, position) =>
                          position,
                      ),
                      outputRange:
                        options.map(
                          (_, position) =>
                            position *
                            segmentWidth,
                        ),
                    },
                  ),
                },
              ],
            },
          ]}
        />
      )}

      {options.map((option) => {
        const selected =
          option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() =>
              onChange(option.value)
            }
            accessibilityRole="radio"
            accessibilityState={{
              selected,
            }}
            accessibilityLabel={
              option.accessibilityLabel
            }
            style={({ pressed }) => [
              segmentedSizes.segment,
              pressed && styles.pressed,
            ]}
          >
            <AppText
              variant="caption"
              style={[
                segmentedSizes.label,
                {
                  color: selected
                    ? (option.activeInk ??
                      colors.onPrimary)
                    : colors.text,
                },
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = () =>
  StyleSheet.create({
    pill: {
      position: "absolute",
      top: 6,
      bottom: 6,
      left: 3,
      elevation: 2,
    },

    pressed: {
      opacity: 0.7,
    },
  });
