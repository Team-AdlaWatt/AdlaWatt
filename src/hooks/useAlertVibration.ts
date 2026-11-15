import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  subscribeResilientChannel,
  type ResilientSubscription,
} from "@/services/realtimeResubscribe";
import {
  startAlertVibration,
  stopAlertVibration,
  syncAlertVibration,
} from "@/services/alertVibration";

// ============================================================
// USE ALERT VIBRATION
// ============================================================
//
// Mount once per signed-in dashboard (dashboard layout).
// Buzz starts when an unread alert exists — checked on
// mount (covers foreground restores) and on every new
// alert insert via the shared resilient channel. Silence
// comes from mark-as-read (direct stop call on that
// screen), zero unread rows, the preference turning OFF,
// sign-out, or unmount. Failures stay silent: vibration is
// ambience, never an error surface.
// ============================================================

export function useAlertVibration(): void {
  const { isSignedIn, user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    let mounted = true;
    let subscription: ResilientSubscription | null =
      null;

    if (!isSignedIn || !userId) {
      stopAlertVibration();
      return;
    }

    // Covers foreground restores: buzz if unread alerts are
    // already waiting (e.g. arrived while signed out of the
    // dashboard scope or before this mount). The trailing
    // guard kills a late resolve that lands after unmount so
    // no orphaned buzz survives teardown.
    void syncAlertVibration().then(() => {
      if (!mounted) {
        stopAlertVibration();
      }
    });

    subscription = subscribeResilientChannel({
      topic: `vibration-alerts-${userId}`,
      label: "Vibration alerts",
      build: (base) =>
        base.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!mounted) {
              return;
            }

            const record = (
              payload as {
                new?: {
                  type?: unknown;
                  read?: unknown;
                };
              }
            ).new;

            if (
              record?.type === "alert" &&
              record?.read === false
            ) {
              void startAlertVibration("insert");
            }
          },
        ),
      isAlive: () => mounted,
      onChannel: () => {},
    });

    return () => {
      mounted = false;

      if (subscription) {
        subscription.stop();
        subscription = null;
      }

      stopAlertVibration();
    };
    // userId is a primitive and safe to depend on.
  }, [isSignedIn, userId]);
}
