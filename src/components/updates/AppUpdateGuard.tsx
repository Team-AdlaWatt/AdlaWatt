import { useEffect } from "react";

import { AppState } from "react-native";

import { useConnectivity } from "@/hooks/useConnectivity";
import {
  checkForAppUpdate,
} from "@/services/appUpdateService";
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export default function AppUpdateGuard() {
  const { connected } = useConnectivity();

  useEffect(() => {
    let cancelled = false;
    let checking = false;

    const check = async () => {
      if (
        cancelled ||
        checking ||
        connected === false ||
        AppState.currentState !== "active"
      ) {
        return;
      }

      checking = true;

      try {
        await checkForAppUpdate();
      } catch {
      } finally {
        checking = false;
      }
    };

    void check();

    const interval = setInterval(() => {
      void check();
    }, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void check();
        }
      },
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [connected]);

  return null;
}
