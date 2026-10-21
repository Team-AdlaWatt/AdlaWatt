import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import AppText from "@/components/ui/AppText";
import OnboardingButton from "@/components/onboarding/OnboardingButton";
import OnboardingDots from "@/components/onboarding/OnboardingDots";
import OnboardingSlide from "@/components/onboarding/OnboardingSlide";
import {
  ONBOARDING_SLIDES,
} from "@/constants/onboardingSlides";
import { Routes } from "@/constants/routes";
import { useAppColors } from "@/hooks/useAppColors";
import { completeOnboarding } from "@/services/auth";

// ============================================================
// ONBOARDING SCREEN (first-run panels)
//
// Five full-width pages: welcome, what-is, features, goals,
// all-set. Swipe (or scroll) moves between them; the shared
// scroll offset drives each slide's fade/slide-in and the
// circle page indicator. Skip sits top-right on pages 1-4;
// page 5 swaps it for the moving Proceed to Dashboard CTA.
//
// Skip and Proceed both flag users.onboarding_completed so
// the panel never replays; a failed flag write is absorbed
// (the layout guard catches it on the next cold start).
//
// Fixed cream: no ThemeProvider above this group, so
// useAppColors resolves the light palette always.
// ============================================================

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const colors = useAppColors();

  const slides = ONBOARDING_SLIDES;
  const lastIndex = slides.length - 1;

  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  // Stable pager value without render-phase ref access
  // (react-hooks/refs). Lazy useState preserves identity.
  const [scrollX] = useState(() => new Animated.Value(0));
  const isFinishing = useRef(false);

  const isLast = index === lastIndex;

  const handleLayout = (
    event: LayoutChangeEvent,
  ) => {
    const next = event.nativeEvent.layout.width;

    if (next > 0 && next !== width) {
      setWidth(next);
    }
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (width <= 0) {
      return;
    }

    const next = Math.round(
      event.nativeEvent.contentOffset.x / width,
    );

    if (
      next !== index &&
      next >= 0 &&
      next <= lastIndex
    ) {
      setIndex(next);
    }
  };

  // Skip (pages 1-4) and Proceed (page 5) share one exit:
  // flag the account as onboarded, then land on dashboard.
  const finish = async () => {
    if (isFinishing.current) {
      return;
    }

    isFinishing.current = true;

    await completeOnboarding();

    router.replace(Routes.DASHBOARD);
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background },
      ]}
      onLayout={handleLayout}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topRow}>
          {!isLast ? (
            <Pressable
              onPress={() => void finish()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("onboarding.skip")}
              style={({ pressed }) => [
                styles.skip,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                style={[
                  styles.skipText,
                  { color: colors.primaryText },
                ]}
              >
                {t("onboarding.skip")}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        {width > 0 && (
          <View style={styles.pager}>
            <Animated.FlatList
              data={slides}
              keyExtractor={(slide) => slide.key}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              onScroll={Animated.event(
                [
                  {
                    nativeEvent: {
                      contentOffset: { x: scrollX },
                    },
                  },
                ],
                { useNativeDriver: true },
              )}
              scrollEventThrottle={16}
              onMomentumScrollEnd={handleMomentumEnd}
              getItemLayout={(_, i) => ({
                length: width,
                offset: width * i,
                index: i,
              })}
              renderItem={({ item, index: i }) => (
                <OnboardingSlide
                  slide={item}
                  width={width}
                  index={i}
                  progressX={scrollX}
                />
              )}
              style={styles.list}
              contentContainerStyle={styles.listContent}
            />
          </View>
        )}

        <View style={styles.bottom}>
          <OnboardingDots
            count={slides.length}
            index={index}
            activeColor={colors.primary}
            inactiveColor={colors.border}
            accessibilityLabel={t("onboarding.page", {
              current: index + 1,
              total: slides.length,
            })}
          />

          {isLast ? (
            <View style={styles.cta}>
              <OnboardingButton
                label={t("onboarding.proceed")}
                onPress={() => void finish()}
              />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  safe: {
    flex: 1,
  },

  topRow: {
    height: 48,
    paddingHorizontal: 16,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  skip: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 8,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  skipText: {
    fontSize: 16,
    fontWeight: "600",
  },

  pressed: {
    opacity: 0.6,
  },

  pager: {
    flex: 1,
  },

  list: {
    flex: 1,
  },

  listContent: {
    flexGrow: 1,
  },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },

  cta: {
    width: "100%",
  },
});
