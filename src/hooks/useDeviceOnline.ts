import { useEffect, useState } from "react";

import type { DeviceStatus } from "@/services/monitoringSchema";
import { isDeviceOnline } from "@/utils/monitoringDisplay";

const TICK_MS = 2 * 1000;

export const useDeviceOnline = (
  lastSeen: string | null | undefined,
  deviceStatus: DeviceStatus | string | null | undefined,
): boolean => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);

    return () => clearInterval(id);
  }, []);

  return isDeviceOnline(lastSeen, deviceStatus, now);
};
