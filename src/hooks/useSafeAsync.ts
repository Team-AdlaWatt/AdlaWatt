import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ============================================================
// SAFE ASYNC
//
// Shared mount-safe fetch primitive for data screens. Guards
// set-state-after-unmount, surfaces loading + error instead
// of failing silently, and exposes retry. Screens keep their
// own mapping/filter logic; only the fetch moves in here.
//
// Usage:
//   const { data, error, loading, retry } = useSafeAsync(
//     loadNotifications,
//     [],
//   );
// ============================================================

interface SafeAsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
}

export function useSafeAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): SafeAsyncState<T> {
  const [data, setData] =
    useState<T | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [attempt, setAttempt] = useState(0);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const retry = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    let active = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch reset before async loader (external sync); results settle in promise callbacks below
    setLoading(true);
    setError(null);

    loader().then(
      (result) => {
        if (active && mounted.current) {
          setData(result);
          setLoading(false);
        }
      },
      (thrown: unknown) => {
        if (active && mounted.current) {
          setError(
            thrown instanceof Error
              ? thrown.message
              : "Something went wrong. Please try again.",
          );
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
    // Loader identity is owned by the caller via deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { data, error, loading, retry };
}
