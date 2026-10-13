import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Ref,
} from "react";

import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";

// ============================================================
// PULL REFRESH SCROLL
//
// Cross-platform pull-to-refresh ScrollView. The drag starts
// at the very top of the scroll content — directly under the
// fixed NavBar — and the spinner slides in underneath it,
// Facebook-style. The spinner stays pinned and visible for
// the whole fetch, then clears so the next pull works at
// once (no cooldown; see usePullToRefresh).
//
// Native: platform RefreshControl (spinner + tint are
// handled by the OS control).
//
// Web: react-native-web's RefreshControl is a no-op stub, so
// a touch-drag tracker drives a custom indicator instead.
// Browser page-level pull-to-refresh is suppressed with
// overscroll-behavior in global.css (data-testid selector)
// so the gesture stays in-app.
//
// Usage:
//   <PullRefreshScroll
//     ref={scrollRef}
//     refreshing={refreshing}
//     onRefresh={onRefresh}
//     refreshLabel={t("dashboard.common.pullToRefresh")}
//     refreshTint={colors.primary}
//     testID="pull-scroll"
//     ...scroll props
//   >
// ============================================================

// Finger travel needed to trigger (after resistance).
const PULL_THRESHOLD = 80;

// Drag resistance so the indicator trails the finger.
const PULL_RESISTANCE = 0.5;

// Hard cap on the indicator travel.
const PULL_MAX = 168;

// Indicator slot height under the NavBar.
const INDICATOR_HEIGHT = 56;

interface PullRefreshScrollProps
  extends ScrollViewProps {
  refreshing: boolean;
  onRefresh: () => void;
  refreshLabel: string;
  refreshTint: string;
  scrollRef?: Ref<ScrollView>;
}

export default function PullRefreshScroll({
  refreshing,
  onRefresh,
  refreshLabel,
  refreshTint,
  scrollRef,
  onScroll,
  children,
  ...rest
}: PullRefreshScrollProps) {
  const isWeb =
    Platform.OS === "web";

  // Distance the indicator has been pulled down (web).
  const [pullPx, setPullPx] =
    useState(0);

  // Synchronous mirror of pullPx. Touch-end must read the
  // committed drag distance without side effects inside a
  // setState updater (that runs during render and would
  // setState on the parent screen mid-render).
  const pullRef = useRef(0);

  const setPull = useCallback((value: number) => {
    pullRef.current = value;

    setPullPx(value);
  }, []);

  // Content offset at the last scroll event (web top check).
  const scrollTop = useRef(0);

  // Active drag tracking (web).
  const tracking = useRef(false);

  const startY = useRef(0);

  // Safety: never leave a stale pull offset on screen.
  useEffect(() => {
    if (!refreshing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears a stale drag offset after the async fetch settles; the value can only be written by touch handlers, never during render
      setPull(0);
    }
  }, [refreshing, setPull]);

  const handleScroll = useCallback(
    (
      event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
      scrollTop.current =
        event.nativeEvent.contentOffset.y;

      onScroll?.(event);
    },
    [onScroll],
  );

  // Web touch-drag: only tracks pulls that start at the very
  // top. Content is clamped at offset 0, so no scrolling
  // fights the gesture and no preventDefault is needed.
  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      if (
        !isWeb ||
        refreshing ||
        scrollTop.current > 0 ||
        tracking.current
      ) {
        return;
      }

      const touch =
        event.nativeEvent.touches[0];

      if (!touch) {
        return;
      }

      tracking.current = true;

      startY.current = touch.pageY;
    },
    [isWeb, refreshing],
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!tracking.current) {
        return;
      }

      const touch =
        event.nativeEvent.changedTouches[0] ??
        event.nativeEvent.touches[0];

      if (!touch) {
        return;
      }

      const dy =
        touch.pageY - startY.current;

      if (dy <= 4) {
        setPull(0);

        return;
      }

      setPull(
        Math.min(
          dy * PULL_RESISTANCE,
          PULL_MAX,
        ),
      );
    },
    [setPull],
  );

  const handleTouchEnd = useCallback(() => {
    if (!tracking.current) {
      return;
    }

    tracking.current = false;

    // Read the committed pull distance from the ref mirror,
    // snap the indicator back, then fire past the threshold.
    // Sequential calls here — never inside a setState updater,
    // which would setState on the parent mid-render.
    const committed = pullRef.current;

    setPull(0);

    if (committed >= PULL_THRESHOLD) {
      onRefresh();
    }
  }, [onRefresh, setPull]);

  const showWebIndicator =
    isWeb &&
    (pullPx > 0 || refreshing);

  return (
    <View style={styles.wrap}>
      {showWebIndicator ? (
        <View
          style={[
            styles.indicator,
            {
              transform: [
                {
                  translateY: refreshing
                    ? 0
                    : pullPx -
                      INDICATOR_HEIGHT,
                },
              ],
            },
          ]}
          accessibilityRole="progressbar"
          accessibilityLabel={refreshLabel}
        >
          <ActivityIndicator
            size="small"
            color={refreshTint}
          />
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        {...(isWeb
          ? {
              onTouchStart:
                handleTouchStart,
              onTouchMove:
                handleTouchMove,
              onTouchEnd:
                handleTouchEnd,
              onTouchCancel:
                handleTouchEnd,
            }
          : {
              refreshControl: (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={refreshTint}
                  colors={[refreshTint]}
                  title={refreshLabel}
                  accessibilityLabel={
                    refreshLabel
                  }
                />
              ),
            })}
        {...rest}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: "relative",
  },

  indicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: INDICATOR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    pointerEvents: "none",
  },
});
