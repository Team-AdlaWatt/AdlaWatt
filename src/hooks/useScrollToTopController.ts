import {
  useCallback,
  useMemo,
  useState,
  type RefObject,
} from "react";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from "react-native";

const ENABLE_RATIO = 0.5;
const DISABLE_RATIO = 0.45;

export interface ScrollToTopController {
  enabled: boolean;
  reportScroll: (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => void;
  scrollToTop: () => void;
  reset: () => void;
}

export function useScrollToTopController(
  scrollRef: RefObject<ScrollView | null>,
): ScrollToTopController {
  const [enabled, setEnabled] =
    useState(false);

  const reportScroll = useCallback(
    (
      event: NativeSyntheticEvent<NativeScrollEvent>,
    ) => {
      const {
        contentOffset,
        contentSize,
        layoutMeasurement,
      } = event.nativeEvent;

      const maxScroll =
        contentSize.height -
        layoutMeasurement.height;

      if (maxScroll <= 0) {
        setEnabled(false);
        return;
      }

      const offsetY = Math.max(
        0,
        contentOffset.y,
      );

      setEnabled((current) =>
        current
          ? offsetY >=
            maxScroll * DISABLE_RATIO
          : offsetY >=
            maxScroll * ENABLE_RATIO,
      );
    },
    [],
  );

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  }, [scrollRef]);

  const reset = useCallback(() => {
    setEnabled(false);
  }, []);

  return useMemo(
    () => ({
      enabled,
      reportScroll,
      scrollToTop,
      reset,
    }),
    [enabled, reportScroll, scrollToTop, reset],
  );
}
