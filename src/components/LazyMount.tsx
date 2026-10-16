import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// ============================================================
// LAZY MOUNT (viewport-aware section gate)
//
// Defers mounting heavy children until they scroll near the
// viewport, so a long screen (e.g. the 17-card Analytics feed)
// no longer mounts every chart in a single commit — which is
// what stalls the UI thread on low-memory Android devices
// (taps appear to do nothing) and spikes peak memory.
//
// The owner of the ScrollView creates a ScrollVisibility with
// createScrollVisibility(), feeds it to ScrollVisibilityProvider
// and calls visibility.notify(offsetY) from onScroll. Children
// wrap heavy content in <LazyMount> and read the shared offset
// through context — no per-row re-render of the whole screen.
//
// Layout discipline: an unmounted section holds a placeholder of
// the same approximate height, so total content height stays
// stable and the scrollbar/quick-nav targets remain close.
// Sections mount *before* they are visible (buffer), so the
// height swap happens off-screen.
// ============================================================

export interface ScrollVisibility {
  /** Subscribe to scroll offsets; fires immediately with the
   *  latest offset. Returns an unsubscribe function. */
  subscribe: (
    listener: (offsetY: number) => void,
  ) => () => void;
  /** Publish the latest content offset (from ScrollView). */
  notify: (offsetY: number) => void;
}

export function createScrollVisibility(): ScrollVisibility {
  const listeners = new Set<
    (offsetY: number) => void
  >();

  let current = 0;

  return {
    subscribe(listener) {
      listeners.add(listener);

      listener(current);

      return () => {
        listeners.delete(listener);
      };
    },

    notify(offsetY) {
      current = offsetY;

      listeners.forEach((listener) => {
        listener(offsetY);
      });
    },
  };
}

const ScrollVisibilityContext =
  createContext<ScrollVisibility | null>(
    null,
  );

export function ScrollVisibilityProvider({
  visibility,
  children,
}: {
  visibility: ScrollVisibility;
  children: React.ReactNode;
}) {
  return (
    <ScrollVisibilityContext.Provider
      value={visibility}
    >
      {children}
    </ScrollVisibilityContext.Provider>
  );
}

interface LazyMountProps {
  children: React.ReactNode;
  /**
   * Approximate rendered height of the content while it is
   * still a placeholder. Keep it close to the real height so
   * total scroll length does not jump when the section mounts.
   */
  estimatedHeight?: number;
  /** Mount this many pixels before the section is visible. */
  buffer?: number;
  style?: StyleProp<ViewStyle>;
}

export default function LazyMount({
  children,
  estimatedHeight = 380,
  buffer = 400,
  style,
}: LazyMountProps) {
  const visibility = useContext(
    ScrollVisibilityContext,
  );

  const { height: viewportHeight } =
    useWindowDimensions();

  const [offsetY, setOffsetY] = useState<
    number | null
  >(null);

  // No provider ⇒ no gate: render immediately (safe default
  // for any consumer outside a scroll-visibility tree).
  const [mounted, setMounted] = useState(
    visibility === null,
  );

  const mountedRef = useRef(
    visibility === null,
  );

  useEffect(() => {
    if (!visibility || offsetY === null) {
      return;
    }

    return visibility.subscribe(
      (scrollY) => {
        if (mountedRef.current) {
          return;
        }

        const top =
          offsetY - scrollY;

        const bottom =
          top + estimatedHeight;

        if (
          bottom > -buffer &&
          top <
            viewportHeight + buffer
        ) {
          mountedRef.current = true;

          setMounted(true);
        }
      },
    );
  }, [
    visibility,
    offsetY,
    estimatedHeight,
    buffer,
    viewportHeight,
  ]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setOffsetY(
        event.nativeEvent.layout.y,
      );
    },
    [],
  );

  return (
    <View style={style} onLayout={onLayout}>
      {mounted ? (
        children
      ) : (
        <View
          style={{ height: estimatedHeight }}
        />
      )}
    </View>
  );
}
