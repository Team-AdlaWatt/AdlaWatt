import { useEffect } from "react";

import { AppState } from "react-native";

import { useConnectivity } from "@/hooks/useConnectivity";
import {
  checkForAppUpdate,
} from "@/services/appUpdateService";
import {
  addAppBreadcrumb,
  captureAppError,
} from "@/services/sentry";

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
        const result = await checkForAppUpdate();

        if (result === "downloaded") {
          addAppBreadcrumb(
            "OTA update downloaded",
            "ota",
          );
        }
      } catch (error) {
        captureAppError(error, {
          context: "ota-check",
        });
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
