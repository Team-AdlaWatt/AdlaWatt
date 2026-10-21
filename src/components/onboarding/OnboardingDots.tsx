import React, { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

// ============================================================
// ONBOARDING DOTS
//
// Circle page indicator. The active dot grows (8 → 22 wide)
// and shifts to the brand color; inactive dots stay small
// and muted. Width + color animate together over 250ms
// (JS driver — layout props cannot run on the native thread;
// a single 8pt view is cheap enough to stay smooth).
// ============================================================

interface OnboardingDotsProps {
  count: number;
  index: number;
  activeColor: string;
  inactiveColor: string;
  accessibilityLabel?: string;
}

function Dot({
  active,
  activeColor,
  inactiveColor,
}: {
  active: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  // Stable animation value without render-phase ref access
  // (react-hooks/refs). Lazy useState preserves identity.
  const [progress] = useState(
    () => new Animated.Value(active ? 1 : 0),
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 22],
  });

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <Animated.View
      style={[styles.dot, { width, backgroundColor }]}
    />
  );
}

export default function OnboardingDots({
  count,
  index,
  activeColor,
  inactiveColor,
  accessibilityLabel,
}: OnboardingDotsProps) {
  return (
    <Animated.View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot
          key={i}
          active={i === index}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 24,
  },

  dot: {
    height: 8,
    borderRadius: 999,
  },
});
