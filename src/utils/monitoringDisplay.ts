// ============================================================
// MONITORING DISPLAY HELPERS
// ============================================================
//
// Pure formatting helpers shared by ChartCard and the
// dashboard status banner. Exported for unit tests.
// ============================================================

import type { DeviceStatus } from "@/services/monitoringSchema";

export const MISSING_VALUE = "--";
export const SENSOR_FAULT_VALUE = "Sensor fault";

export const hasValue = (
  value: number | null | undefined,
): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const hasTemperatureReading = (
  value: number | null | undefined,
): value is number => hasValue(value);

export const formatMetric = (
  value: number | null | undefined,
  unit = "",
  options?: { decimals?: number },
): string => {
  if (!hasValue(value)) {
    return MISSING_VALUE;
  }

  const decimals = options?.decimals;
  const rendered =
    decimals === undefined ? String(value) : value.toFixed(decimals);

  return unit ? `${rendered}${unit}` : rendered;
};

export const formatTemperature = (
  value: number | null | undefined,
): string => {
  if (!hasValue(value)) {
    return SENSOR_FAULT_VALUE;
  }

  return `${value}°C`;
};

// A device is online only when it reported recently AND the
// last known device status is not explicitly "Offline".
export const DEVICE_ONLINE_WINDOW_MS = 60 * 1000;

export const isDeviceOnline = (
  lastSeen: string | null | undefined,
  deviceStatus: DeviceStatus | string | null | undefined,
  nowMs: number = Date.now(),
): boolean => {
  if (deviceStatus === "Offline") {
    return false;
  }

  if (lastSeen == null || lastSeen === "") {
    return false;
  }

  const timestamp = Date.parse(lastSeen);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return nowMs - timestamp <= DEVICE_ONLINE_WINDOW_MS;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const formatLastSeen = (
  value: string | null | undefined,
  nowMs: number = Date.now(),
): string | null => {
  if (value == null || value === "") {
    return null;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const elapsedMs = Math.max(0, nowMs - timestamp);

  if (elapsedMs < MINUTE_MS) {
    return "just now";
  }

  if (elapsedMs < HOUR_MS) {
    const minutes = Math.floor(elapsedMs / MINUTE_MS);

    return `${minutes}m ago`;
  }

  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);

    return `${hours}h ago`;
  }

  const date = new Date(timestamp);

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
