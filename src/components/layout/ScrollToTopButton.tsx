import { Ionicons } from "@expo/vector-icons";
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
} from "react-native";
import { useTranslation } from "react-i18next";

import { Radius, Spacing } from "@/constants/theme";
import { Touch } from "@/constants/sizing";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

interface ScrollToTopButtonProps {
  enabled: boolean;
  onPress: () => void;
  rightOffset?: number;
  bottomOffset?: number;
}

export default function ScrollToTopButton({
  enabled,
  onPress,
  rightOffset = Spacing.md,
  bottomOffset = Spacing.xs,
}: ScrollToTopButtonProps) {
  const { t } = useTranslation();
  const colors = useAppColors();

  const [opacity] = useState(
    () => new Animated.Value(enabled ? 1 : 0.35),
  );

  const [reduceMotion, setReduceMotion] =
    useState(false);

  const styles = useMemo(
    () =>
      getStyles(
        colors,
        rightOffset,
        bottomOffset,
      ),
    [colors, rightOffset, bottomOffset],
  );

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: enabled ? 1 : 0.35,
      duration: reduceMotion ? 0 : 160,
      useNativeDriver: true,
    }).start();
  }, [enabled, opacity, reduceMotion]);

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      pointerEvents={enabled ? "auto" : "none"}
    >
      <Pressable
        onPress={onPress}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={t(
          "dashboard.common.scrollToTop",
        )}
        accessibilityState={{
          disabled: !enabled,
        }}
        style={({ pressed }) => [
          styles.button,
          pressed &&
            enabled &&
            styles.pressed,
        ]}
      >
        <Ionicons
          name="arrow-up"
          size={Touch.icon}
          color={colors.onPrimary}
        />
      </Pressable>
    </Animated.View>
  );
}

const getStyles = (
  colors: AppColors,
  rightOffset: number,
  bottomOffset: number,
) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      right: rightOffset,
      bottom: bottomOffset,
      width: Touch.target,
      height: Touch.target,
      borderRadius: Radius.round,
      zIndex: 10,
      elevation: 10,
    },

    button: {
      width: "100%",
      height: "100%",
      borderRadius: Radius.round,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    pressed: {
      opacity: 0.85,
    },
  });
