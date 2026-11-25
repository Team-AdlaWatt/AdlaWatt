import {
  useCallback,
  useEffect,
} from "react";

import { AppState } from "react-native";

import { OTA_UPDATE_APPLY_MODE } from "@/constants/appUpdates";
import { useConnectivity } from "@/hooks/useConnectivity";
import {
  applyDownloadedAppUpdate,
  checkFetchApplyAppUpdate,
  checkForAppUpdate,
} from "@/services/appUpdateService";

import NativeUpdateReloader from "./NativeUpdateReloader";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export default function AppUpdateGuard() {
  const { connected } = useConnectivity();

  const handlePending = useCallback(() => {
    void applyDownloadedAppUpdate().catch(() => {
    });
  }, []);

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
        if (
          OTA_UPDATE_APPLY_MODE === "auto-reload"
        ) {
          await checkFetchApplyAppUpdate();
        } else {
          await checkForAppUpdate();
        }
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

  if (
    OTA_UPDATE_APPLY_MODE !== "auto-reload"
  ) {
    return null;
  }

  return (
    <NativeUpdateReloader
      onPending={handlePending}
    />
  );
}
