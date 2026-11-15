// ============================================================
// ADMIN FORMAT HELPERS
//
// Pure value formatters shared by the admin dashboard tabs so
// the "—" placeholder, rounding, and unit strings stay
// identical across Overview, Users, and Reports. Timestamps
// follow the device locale, same as before the extraction.
// ============================================================

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

export function formatLastUpdated(
  iso: string | null,
): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}
