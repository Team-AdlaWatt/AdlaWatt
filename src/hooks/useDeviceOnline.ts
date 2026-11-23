import type { DeviceStatus } from "@/services/monitoringSchema";

import { isDeviceOnline } from "@/utils/monitoringDisplay";

export const useDeviceOnline = (
  deviceStatus: DeviceStatus | string | null | undefined,
): boolean => isDeviceOnline(deviceStatus);
