// ============================================================
// BATTERY REFERENCE CONSTANTS
//
// Single source of truth for the battery bank used by the
// recommendation engine, the battery gauge, the electronics
// wattage caps, and the in-app advisory copy.
//
// Bank: 12.6 V x 60 Ah = 756 Wh total.
// 80% DoD leaves 151.2 Wh protected reserve and 604.8 Wh
// usable energy.
//
// Keep this module pure (no React Native imports) so it can
// be verified anywhere.
// ============================================================

/** Total bank energy at 100% SoC. */
export const BATTERY_CAPACITY_WH = 756;

/** 20% SoC floor the engine never counts as usable. */
export const BATTERY_RESERVE_WH = 151.2;

/** 80% depth-of-discharge window available to loads. */
export const BATTERY_USABLE_WH = 604.8;

/** Largest wattage a single electronics may declare. */
export const BATTERY_MAX_ELECTRONICS_W = 600;

/** Nominal bank voltage used in the capacity calculation. */
export const BATTERY_NOMINAL_VOLTAGE = 12.6;

/** Rated bank capacity. */
export const BATTERY_CAPACITY_AH = 60;

/** Maximum permitted depth of discharge. */
export const BATTERY_DOD = 0.8;

/** Inverter idle draw added to projected appliance load. */
export const INVERTER_IDLE_W = 6;

/** Inverter conversion efficiency used by the engine. */
export const INVERTER_EFFICIENCY = 0.9;

/** Baseline Load Now while only the inverter is powered on. */
export const LOAD_BASELINE_W = INVERTER_IDLE_W;

/** Sustained increase above the baseline that implies another load. */
export const LOAD_DETECTION_DELTA_W = 7;

/** Time a load/recovery condition must persist before it is accepted. */
export const LOAD_VERIFICATION_MS = 30_000;

/** Tolerance around Load Now baseline for recovery verification. */
export const LOAD_BASELINE_TOLERANCE_W = 2;
