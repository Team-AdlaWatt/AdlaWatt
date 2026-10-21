import React from "react";
import {
  Animated,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "@/components/ui/AppText";
import { useAppColors } from "@/hooks/useAppColors";
import type {
  OnboardingSlide as SlideData,
} from "@/constants/onboardingSlides";

// ============================================================
// ONBOARDING SLIDE
//
// One full-width page inside the pager. The parent drives
// `progressX` (the shared scroll offset); this component
// derives its own fade + vertical drift so content settles
// as it reaches the viewport center — the "fade and slide
// in on each swipe" effect, fully native-driver.
// ============================================================

interface OnboardingSlideProps {
  slide: SlideData;
  /** Screen width of this page. */
  width: number;
  /** Horizontal index of this slide. */
  index: number;
  /** Shared Animated.Value carrying the pager scroll X. */
  progressX: Animated.Value;
}

export default function OnboardingSlide({
  slide,
  width,
  index,
  progressX,
}: OnboardingSlideProps) {
  const { t } = useTranslation();
  const colors = useAppColors();

  const styles = React.useMemo(
    () => getStyles(),
    [],
  );

  const inputRange = [
    (index - 1) * width,
    index * width,
    (index + 1) * width,
  ];

  const opacity = progressX.interpolate({
    inputRange,
    outputRange: [0.3, 1, 0.3],
    extrapolate: "clamp",
  });

  const translateY = progressX.interpolate({
    inputRange,
    outputRange: [24, 0, -24],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.page, { width }]}>
      <Animated.View
        style={[
          styles.content,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <View
          style={[
            styles.illustration,
            slide.kind === "icon" && [
              styles.medallion,
              { backgroundColor: colors.primaryWash },
            ],
          ]}
        >
          {slide.kind === "logo" ? (
            <Image
              source={require("../../../assets/images/adlawatt-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <Ionicons
              name={slide.icon ?? "sunny"}
              size={56}
              color={colors.primary}
            />
          )}
        </View>

        <AppText
          style={styles.title}
          accessibilityRole="header"
        >
          {t(slide.titleKey)}
        </AppText>

        {slide.subtitleKey ? (
          <AppText style={styles.subtitle}>
            {t(slide.subtitleKey)}
          </AppText>
        ) : null}

        {slide.bullets ? (
          <View style={styles.bullets}>
            {slide.bullets.map((bullet) => (
              <View
                key={bullet.labelKey}
                style={styles.bulletRow}
              >
                <Ionicons
                  name={bullet.icon}
                  size={18}
                  color={colors.primary}
                />
                <AppText style={styles.bulletText}>
                  {t(bullet.labelKey)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {slide.showSwipeHint ? (
          <AppText
            style={[
              styles.hint,
              { color: colors.primaryText },
            ]}
          >
            {t("onboarding.swipeHint")}
          </AppText>
        ) : null}
      </Animated.View>
    </View>
  );
}

const getStyles = () =>
  StyleSheet.create({
    page: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
      alignItems: "stretch",
    },

    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "stretch",
    },

    illustration: {
      height: 148,
      width: 148,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },

    medallion: {
      borderRadius: 74,
    },

    logo: {
      width: 196,
      height: 120,
    },

    title: {
      fontSize: 26,
      lineHeight: 34,
      fontWeight: "700",
      textAlign: "center",
    },

    subtitle: {
      marginTop: 12,
      fontSize: 16,
      lineHeight: 24,
      textAlign: "center",
    },

    bullets: {
      alignSelf: "stretch",
      marginTop: 20,
      gap: 12,
    },

    bulletRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    bulletText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
    },

    hint: {
      marginTop: 20,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
  });
