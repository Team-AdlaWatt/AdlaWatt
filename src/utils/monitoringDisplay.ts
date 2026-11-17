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

// Hardware heartbeats every 2s with a 1.5s HTTP timeout. The
// monitoring row's last_seen is the single source of truth:
// fresh for less than 5s, Offline from the 5s mark until the
// next successful heartbeat lands.
export const DEVICE_ONLINE_WINDOW_MS = 5 * 1000;

export const isDeviceOnline = (
  lastSeen: string | null | undefined,
  _deviceStatus: DeviceStatus | string | null | undefined,
  nowMs: number = Date.now(),
): boolean => {
  void _deviceStatus;

  if (lastSeen == null || lastSeen === "") {
    return false;
  }

  const timestamp = Date.parse(lastSeen);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const ageMs = Math.max(0, nowMs - timestamp);

  return ageMs < DEVICE_ONLINE_WINDOW_MS;
};

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
