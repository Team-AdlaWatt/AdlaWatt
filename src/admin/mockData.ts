// ============================================================
// ADMIN MOCK DATA (UI-first, static)
//
// Pseudonymous aliases only (HH-XXXXXXXX). No email, username,
// UUID, photo, custom appliance name, notification, activity
// log, or raw monitoring row is represented here. Backend RPCs
// will later filter role = 'household' and return the same
// aggregate/summary shape.
// ============================================================

export type BatteryHealthBand =
  | "0-20"
  | "21-50"
  | "51-80"
  | "81-100";

export interface AdminHousehold {
  alias: string;
  batteryHealth: number;
  band: BatteryHealthBand;
  solarKwhPerDay: number;
  loadKwhPerDay: number;
  lastSeen: string;
}

export const ADMIN_HOUSEHOLDS: readonly AdminHousehold[] = [
  {
    alias: "HH-A1B2C3D4",
    batteryHealth: 92,
    band: "81-100",
    solarKwhPerDay: 4.8,
    loadKwhPerDay: 3.1,
    lastSeen: "2 min ago",
  },
  {
    alias: "HH-E5F6G7H8",
    batteryHealth: 87,
    band: "81-100",
    solarKwhPerDay: 3.9,
    loadKwhPerDay: 2.7,
    lastSeen: "5 min ago",
  },
  {
    alias: "HH-I9J0K1L2",
    batteryHealth: 74,
    band: "51-80",
    solarKwhPerDay: 4.2,
    loadKwhPerDay: 3.4,
    lastSeen: "1 min ago",
  },
  {
    alias: "HH-M3N4O5P6",
    batteryHealth: 68,
    band: "51-80",
    solarKwhPerDay: 2.8,
    loadKwhPerDay: 2.9,
    lastSeen: "12 min ago",
  },
  {
    alias: "HH-Q7R8S9T0",
    batteryHealth: 46,
    band: "21-50",
    solarKwhPerDay: 3.1,
    loadKwhPerDay: 3.6,
    lastSeen: "3 min ago",
  },
  {
    alias: "HH-U1V2W3X4",
    batteryHealth: 38,
    band: "21-50",
    solarKwhPerDay: 2.4,
    loadKwhPerDay: 3.0,
    lastSeen: "8 min ago",
  },
  {
    alias: "HH-Y5Z6A7B8",
    batteryHealth: 14,
    band: "0-20",
    solarKwhPerDay: 1.9,
    loadKwhPerDay: 2.2,
    lastSeen: "20 min ago",
  },
  {
    alias: "HH-C9D0E1F2",
    batteryHealth: 95,
    band: "81-100",
    solarKwhPerDay: 5.1,
    loadKwhPerDay: 3.3,
    lastSeen: "4 min ago",
  },
  {
    alias: "HH-G3H4I5J6",
    batteryHealth: 81,
    band: "81-100",
    solarKwhPerDay: 4.0,
    loadKwhPerDay: 2.6,
    lastSeen: "6 min ago",
  },
  {
    alias: "HH-K7L8M9N0",
    batteryHealth: 59,
    band: "51-80",
    solarKwhPerDay: 3.3,
    loadKwhPerDay: 3.1,
    lastSeen: "9 min ago",
  },
] as const;

export const BATTERY_HEALTH_BANDS: readonly BatteryHealthBand[] = [
  "0-20",
  "21-50",
  "51-80",
  "81-100",
] as const;

export function countByBand(
  households: readonly AdminHousehold[],
): Record<BatteryHealthBand, number> {
  return BATTERY_HEALTH_BANDS.reduce(
    (acc, band) => {
      acc[band] = households.filter(
        (household) => household.band === band,
      ).length;

      return acc;
    },
    {} as Record<BatteryHealthBand, number>,
  );
}
