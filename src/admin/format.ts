// ============================================================
// ADMIN FORMAT HELPERS
//
// Pure value formatters shared by the admin dashboard tabs so
// the "—" placeholder, rounding, and unit strings stay
// identical across Overview and History. Timestamps follow
// the device locale, same as before the extraction.
// ============================================================

import type {
  AdminHistoryMetric,
  AdminHistoryRange,
} from "@/admin/constants";

export function formatBatteryPercent(
  value: number | null,
): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}

export function formatVoltage(
  value: number | null,
): string {
  return value == null
    ? "—"
    : `${value.toFixed(2)} V`;
}

export function formatSolarKwh(wh: number): string {
  return `${(wh / 1000).toFixed(1)} kWh`;
}

export function formatEnergyWh(wh: number): string {
  const value = Number.isFinite(wh) ? wh : 0;

  return Math.abs(value) >= 1000
    ? `${(value / 1000).toFixed(1)} kWh`
    : `${value.toFixed(1)} Wh`;
}

export function formatPowerW(
  watts: number | null,
): string {
  if (watts == null || !Number.isFinite(watts)) {
    return "—";
  }

  return `${watts.toFixed(1)} W`;
}

export function formatMetricValue(
  metric: AdminHistoryMetric,
  value: number,
): string {
  if (metric === "battery") {
    return formatBatteryPercent(value);
  }

  if (metric === "solar") {
    return formatEnergyWh(value);
  }

  return formatPowerW(value);
}

export function formatHistoryLabel(
  iso: string,
  range: AdminHistoryRange,
): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (range === 24) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function formatLastUpdated(
  iso: string | null,
): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}
