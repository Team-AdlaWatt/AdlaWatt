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

export const formatTemperatureStatusLabel = (
  status: string,
): string =>
  status === "Critical (sensor fault)" ? "Critical" : status;

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

export const fitTextFontSize = (
  measuredWidth: number,
  targetWidth: number,
  currentFontSize: number,
  minFontSize: number,
): number => {
  if (
    !Number.isFinite(measuredWidth) ||
    !Number.isFinite(targetWidth) ||
    !Number.isFinite(currentFontSize) ||
    measuredWidth <= 0 ||
    targetWidth <= 0 ||
    currentFontSize <= 0 ||
    measuredWidth <= targetWidth
  ) {
    return currentFontSize;
  }

  return Math.max(
    Math.min(minFontSize, currentFontSize),
    Math.floor(
      (currentFontSize * targetWidth) / measuredWidth,
    ),
  );
};

export const formatTemperature = (
  value: number | null | undefined,
): string => {
  if (!hasValue(value)) {
    return SENSOR_FAULT_VALUE;
  }

  return `${value}°C`;
};

// The monitoring row's device_status is the single source of
// truth for online/offline. last_seen is for display and
// realtime anti-rollback only.
type LastSeenSource =
  | { last_seen?: string | null | undefined }
  | null
  | undefined;

export const monitoringLastSeenMs = (
  source: LastSeenSource,
): number => {
  const value = source?.last_seen;

  if (value == null || value === "") {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp)
    ? timestamp
    : Number.NEGATIVE_INFINITY;
};

export const isDeviceOnline = (
  deviceStatus: DeviceStatus | string | null | undefined,
): boolean => deviceStatus === "Online";

const SECOND_MS = 1000;
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

  if (elapsedMs < 10 * 1000) {
    return "just now";
  }

  if (elapsedMs < MINUTE_MS) {
    const seconds = Math.floor(elapsedMs / SECOND_MS);

    return `${seconds}s ago`;
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
