import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ============================================================
// PULL TO REFRESH
//
// Shared pull-gesture state for data screens. The spinner is
// the only lock: an in-flight guard collapses repeat pulls
// into one fetch, and `refreshing` always resets in `finally`
// so the user can pull again the moment a refresh finishes.
// There is deliberately no timestamp gate here — unlike the
// Today-card tap path, the pull gesture never cools down.
//
// Usage:
//   const { refreshing, onRefresh } = usePullToRefresh(
//     loadEverything,
//   );
//   <ScrollView
//     refreshControl={
//       <RefreshControl
//         refreshing={refreshing}
//         onRefresh={onRefresh}
//         ...
//       />
//     }
//   >
// ============================================================

interface PullToRefreshState {
  refreshing: boolean;
  onRefresh: () => void;
}

export function usePullToRefresh(
  loader: () => Promise<void>,
): PullToRefreshState {
  const [refreshing, setRefreshing] =
    useState(false);

  const inflight = useRef(false);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    if (inflight.current) {
      return;
    }

    inflight.current = true;

    if (mounted.current) {
      setRefreshing(true);
    }

    // The rejection handler below is intentional: loaders
    // own their errors (they keep last-known values on
    // screen), so the hook must never leak an unhandled
    // rejection — it only owns the spinner reset.
    let pending: Promise<void>;

    try {
      pending = loader();
    } catch {
      inflight.current = false;

      if (mounted.current) {
        setRefreshing(false);
      }

      return;
    }

    pending
      .then(
        () => undefined,
        () => undefined,
      )
      .finally(() => {
        inflight.current = false;

        if (mounted.current) {
          setRefreshing(false);
        }
      });
  }, [loader]);

  return { refreshing, onRefresh };
}
