import { useEffect, useState } from "react";

import type { DeviceStatus } from "@/services/monitoringSchema";
import {
  DEVICE_ONLINE_WINDOW_MS,
  isDeviceOnline,
} from "@/utils/monitoringDisplay";

const TICK_MS = 1000;

export const useDeviceOnline = (
  lastSeen: string | null | undefined,
  deviceStatus: DeviceStatus | string | null | undefined,
): boolean => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (lastSeen == null || lastSeen === "") {
      return;
    }

    const timestamp = Date.parse(lastSeen);

    if (!Number.isFinite(timestamp)) {
      return;
    }

    const delay = Math.max(
      0,
      timestamp + DEVICE_ONLINE_WINDOW_MS + 1 - Date.now(),
    );

    const id = setTimeout(() => setNow(Date.now()), delay);

    return () => clearTimeout(id);
  }, [lastSeen]);

  return isDeviceOnline(lastSeen, deviceStatus, now);
};
