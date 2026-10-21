import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "@/components/ui/AppText";
import { useAppColors } from "@/hooks/useAppColors";
import { Control } from "@/constants/sizing";

// ============================================================
// ONBOARDING CTA (final screen)
//
// Full-width primary button with a gentle vertical bounce
// and an arrow that keeps nudging right — the "moving
// Proceed to Dashboard" effect. Both loops respect the OS
// reduce-motion setting (AccessibilityInfo) and pause when
// the screen unmounts.
// ============================================================

interface OnboardingButtonProps {
  label: string;
  onPress: () => void;
}

export default function OnboardingButton({
  label,
  onPress,
}: OnboardingButtonProps) {
  const colors = useAppColors();

  // Stable animation values without render-phase ref access
  // (react-hooks/refs). Lazy useState preserves identity.
  const [bounce] = useState(() => new Animated.Value(0));
  const [nudge] = useState(() => new Animated.Value(0));

  const [reduceMotion, setReduceMotion] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        // Default: animate.
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      bounce.setValue(0);
      nudge.setValue(0);
      return;
    }

    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -6,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const nudgeLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(nudge, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(nudge, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    bounceLoop.start();
    nudgeLoop.start();

    return () => {
      bounceLoop.stop();
      nudgeLoop.stop();
    };
  }, [reduceMotion, bounce, nudge]);

  const arrowX = nudge.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}
    >
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          { transform: [{ translateY: bounce }] },
        ]}
      >
        <AppText
          style={[styles.label, { color: colors.onPrimary }]}
        >
          {label}
        </AppText>

        <Animated.View
          style={{
            transform: [{ translateX: arrowX }],
          }}
        >
          <Ionicons
            name="arrow-forward"
            size={20}
            color={colors.onPrimary}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
    borderRadius: 12,
  },

  pressed: {
    opacity: 0.85,
  },

  button: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: Control.buttonLargePadding,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
