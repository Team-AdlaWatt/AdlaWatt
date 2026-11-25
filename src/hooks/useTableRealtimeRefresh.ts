import { useEffect, useRef } from "react";

import { getAuthenticatedUserSafe } from "@/lib/supabase";
import {
  subscribeResilientChannel,
  type ResilientSubscription,
} from "@/services/realtimeResubscribe";

type RealtimeEvent =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "*";

interface UseTableRealtimeRefreshOptions {
  table: string;
  topic: string;
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
  event?: RealtimeEvent;
  debounceMs?: number;
}

export function useTableRealtimeRefresh({
  table,
  topic,
  onRefresh,
  enabled = true,
  event = "*",
  debounceMs = 250,
}: UseTableRealtimeRefreshOptions): void {
  const mounted = useRef(true);
  const refreshRef = useRef(onRefresh);
  const timer = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const running = useRef(false);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;

      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let stopped = false;
    let subscription: ResilientSubscription | null = null;

    const flush = () => {
      if (!mounted.current || stopped || running.current) {
        return;
      }

      running.current = true;

      Promise.resolve(refreshRef.current()).finally(() => {
        running.current = false;
      });
    };

    const schedule = () => {
      if (!mounted.current || stopped) {
        return;
      }

      if (timer.current) {
        clearTimeout(timer.current);
      }

      timer.current = setTimeout(() => {
        timer.current = null;
        flush();
      }, debounceMs);
    };

    void getAuthenticatedUserSafe()
      .then((user) => {
        if (!user || stopped || !mounted.current) {
          return;
        }

        subscription = subscribeResilientChannel({
          topic: `${topic}-${user.id}`,
          label: topic,
          build: (base) =>
            base.on(
              "postgres_changes",
              {
                event,
                schema: "public",
                table,
                filter: `user_id=eq.${user.id}`,
              },
              schedule,
            ),
          isAlive: () => mounted.current && !stopped,
        });
      })
      .catch(() => {});

    return () => {
      stopped = true;
      subscription?.stop();

      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [table, topic, enabled, event, debounceMs]);
}
