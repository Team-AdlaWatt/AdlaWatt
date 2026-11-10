// ============================================================
// BATTERY REFERENCE CONSTANTS
//
// Single source of truth for the battery bank used by the
// recommendation engine, the battery gauge, the electronics
// wattage caps, and the in-app advisory copy.
//
// Bank: ZENOVA 12V 30Ah x2 in parallel.
//   12 V nominal x 60 Ah = 720 Wh total (manuscript basis).
//
// 20% SoC is held back as an untouchable reserve; 80% is the
// usable window the engine may spend.
//
// Keep this module pure (no React Native imports) so it can
// be verified anywhere.
// ============================================================

/** Total bank energy at 100% SoC. */
export const BATTERY_CAPACITY_WH = 720;

/** 20% SoC floor the engine never counts as usable. */
export const BATTERY_RESERVE_WH = 144;

/** 80% depth-of-discharge window available to loads. */
export const BATTERY_USABLE_WH = 576;

/** Largest wattage a single electronics may declare. */
export const BATTERY_MAX_ELECTRONICS_W = 600;
