// ============================================================
// ADLAWATT APPLIANCE RECOMMENDATION ENGINE
//
// Pure calculation module — no network calls and no React
// Native imports, so it can be verified anywhere.
//
// Battery capacity reference (ZENOVA 12V 30Ah x2 parallel):
//   - Nominal energy             : 720 Wh
//   - 20% SoC reserve floor      : 144 Wh
//   - 80% depth of discharge     : 576 Wh usable window
//
// The engine performs the full analysis:
//   - Battery tier classification
//   - Reserve-floor usable energy
//   - Charge-scaled wattage cap
//   - Voltage headroom projection
//   - Budget (per-hour share of usable energy)
//   - Per-appliance runtime estimate
//   - Recommendation verdict
//   - Combined load-stack checks
//
// Verdicts:
//   - recommended      : draws <= 10%/hr of the usable energy
//   - care             : draws 10-25%/hr, or battery in caution
//   - notRecommended   : blocked, unsafe voltage, over the charge
//                        wattage cap, or draws > 25%/hr
// ============================================================

// ============================================================
// TYPES
// ============================================================

export type BatteryTier =
  | "Safe"
  | "Caution"
  | "Unsafe";

export type Verdict =
  | "recommended"
  | "care"
  | "notRecommended";

export type BadgeLabel =
  | "OK to use"
  | "Not advisable";

export interface BatteryStateInput {
  soc: number; // percentage 0-100
  voltage: number; // volts
  remainingWh: number; // energy currently in the battery
  dod?: "Safe" | "Unsafe"; // depth-of-discharge guard
  // Measured draw right now (W). Judged jointly with the
  // appliance watts for budget, watt cap, and voltage
  // projection. The voltage projection uses appliance-only
  // watts: the measured voltage already sags under the
  // current load, so adding it again would double-count.
  currentLoadW?: number;
  // Epoch ms of the reading. Missing or older than the
  // configured stale window blocks everything (fail-safe:
  // no data, no trust).
  lastUpdated?: number | null;
  // Previous tier, for unsafe-voltage hysteresis without
  // breaking purity (no module memory).
  previousTier?: BatteryTier;
}

export interface ApplianceInput {
  id: string;
  name: string;
  wattage: string; // e.g. "35-75W", "50W", "15-20"
  area?: string;
  // Motor/compressor load: the watt-cap and voltage checks
  // judge peak (max x surge) instead of nameplate max.
  motor?: boolean;
}

export interface WattRange {
  min: number;
  mid: number;
  max: number;
}

export interface RuntimeEstimate {
  minHours: number; // worst case (uses max wattage)
  midHours: number; // average estimate
  maxHours: number; // best case (uses min wattage)
}

export interface BatteryClassification {
  tier: BatteryTier;
  usableWh: number;
  blocked: boolean;
  reasons: string[];
}

export interface ApplianceRecommendation {
  id: string;
  name: string;
  area?: string;
  wattRange: WattRange | null;
  verdict: Verdict;
  badgeLabel: BadgeLabel;
  tier: BatteryTier;
  usableWh: number;
  runtime: RuntimeEstimate;
  displayRuntime: string;
  reason: string;
  drainRatio: number; // mid watts / usable Wh (per-hour budget share)
  projectedVoltage: number; // current voltage minus estimated draw drop
  wattCap: number; // charge-scaled peak wattage limit
}

export interface LoadStackResult {
  tier: BatteryTier;
  usableWh: number;
  blocked: boolean;
  totalMinWatts: number;
  totalMidWatts: number;
  totalMaxWatts: number;
  runtimeMidHours: number;
  overLimit: boolean;
  limitWatts: number;
  topDrain: ApplianceInput | null;
}

export interface RecommendBatchResult {
  tier: BatteryTier;
  usableWh: number;
  blocked: boolean;
  recommendations: ApplianceRecommendation[];
}

// ============================================================
// CONSTANTS
// ============================================================

export const BATTERY_NOMINAL_WH = 720;

export const RESERVE_WH = 144;

export const CAUTION_SOC = 20;

export const CAUTION_VOLTAGE = 10.65;

export const UNSAFE_VOLTAGE = 10.6;

export const MAX_SAFE_LOAD_W = 1000;

export const ALL_DAY_HOURS_LIMIT = 72;

// Budget thresholds: the share of the usable energy an appliance
// spends per hour (mid watts / usable Wh).
export const BUDGET_RECOMMENDED_MAX_RATIO =
  0.10; // <= 10%/hr -> recommended

export const BUDGET_CARE_MAX_RATIO =
  0.25; // 10-25%/hr -> care, > 25%/hr -> not recommended

// Estimated voltage drop model: 0.1 V per 50 W of load.
export const VOLTAGE_DROP_STEP_WATTS =
  50;

export const VOLTAGE_DROP_STEP_VOLTS =
  0.1;

// Display threshold for the runtime label.
export const RUNTIME_CARE_MIN_HOURS =
  10 / 60; // "<10 min" below this

// ============================================================
// CONFIGURATION
//
// Every threshold lives here and is injected into the
// engine (functions take an optional config, defaulting to
// DEFAULT_RECOMMENDATION_CONFIG). Thresholds are NOT admin
// published — this object is the single place to tune them.
// Shared with the TFT firmware to avoid drift: unsafe
// 10.6V, caution 10.75V, 144Wh reserve, 800W warn, 1000W
// cap (see the firmware notes in zenova_battery.md).
// ============================================================

export interface RecommendationConfig {
  nominalWh: number;
  reserveWh: number;
  // Caution SoC band (inclusive): at or below max while
  // above the unsafe cutoff -> light loads only.
  cautionSocMin: number;
  cautionSocMax: number;
  // Caution voltage boundary (widened from the old exact
  // 10.65V sliver): at or below -> light loads only.
  cautionVoltage: number;
  // Hard-cut voltage. Clears only above recoveryVoltage
  // (hysteresis: load sag must not flicker verdicts).
  unsafeVoltage: number;
  recoveryVoltage: number;
  // Combined-load limits: warn band, then hard cap.
  warnLoadW: number;
  maxSafeLoadW: number;
  // Hourly budget-share bands (fraction of usable energy).
  budgetRecommendedMax: number;
  budgetCareMax: number;
  // Linear voltage-drop model (heuristic, not a curve).
  voltageDropStepWatts: number;
  voltageDropStepVolts: number;
  // Inverter efficiency applied to runtime estimates.
  inverterEfficiency: number;
  // Motor/compressor startup peak multiplier.
  motorSurgeMultiplier: number;
  // Parser rejects any single wattage above this.
  maxApplianceWatts: number;
  // Readings older than this (or missing) block.
  staleReadingMs: number;
  // Runtime label saturates here.
  allDayHours: number;
}

export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig =
  {
    nominalWh: BATTERY_NOMINAL_WH,
    reserveWh: RESERVE_WH,
    cautionSocMin: CAUTION_SOC,
    cautionSocMax: 25,
    cautionVoltage: 10.75,
    unsafeVoltage: UNSAFE_VOLTAGE,
    recoveryVoltage: 10.85,
    warnLoadW: 800,
    maxSafeLoadW: MAX_SAFE_LOAD_W,
    budgetRecommendedMax:
      BUDGET_RECOMMENDED_MAX_RATIO,
    budgetCareMax: BUDGET_CARE_MAX_RATIO,
    voltageDropStepWatts:
      VOLTAGE_DROP_STEP_WATTS,
    voltageDropStepVolts:
      VOLTAGE_DROP_STEP_VOLTS,
    inverterEfficiency: 0.9,
    motorSurgeMultiplier: 3,
    maxApplianceWatts: 5000,
    staleReadingMs: 60000,
    allDayHours: ALL_DAY_HOURS_LIMIT,
  };

// No-data state: never "OK". Supersedes the old optimistic
// DEFAULT_BATTERY_STATE (100%/12.6V/720Wh with no reading),
// which made everything advisable on missing data. A missing
// or stale lastUpdated blocks via classifyBatteryState.
export const NO_BATTERY_DATA: BatteryStateInput =
  {
    soc: 0,
    voltage: 0,
    remainingWh: 0,
    dod: "Unsafe",
    lastUpdated: null,
  };

// ============================================================
// SAFE NUMERIC VALUE
// ============================================================

const normalizeNumber = (
  value: unknown,
): number => {

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {

    return value;
  }

  if (
    typeof value === "string"
  ) {

    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {

      return parsed;
    }
  }

  return 0;
};

// ============================================================
// 1. BATTERY STATE CLASSIFICATION
//
//  Safe    : above the caution band on every signal
//  Caution : inside the SoC or voltage caution band (light
//            loads only)
//  Unsafe  : any critical signal (block everything)
//
// Fail-safe: a missing or stale reading blocks — never
// allow. Voltage is the harder safety signal, with
// hysteresis: the unsafe trip latches until the voltage
// recovers past recoveryVoltage, so load sag cannot
// flicker verdicts.
// ============================================================

export const classifyBatteryState = (
  input: BatteryStateInput,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
): BatteryClassification => {

  const soc =
    normalizeNumber(input.soc);

  const voltage =
    normalizeNumber(input.voltage);

  const remainingWh =
    normalizeNumber(input.remainingWh);

  const reserveWh = config.reserveWh;

  const reasons: string[] = [];

  let tier: BatteryTier = "Safe";

  // ------------------------------------------------
  // NO DATA / STALE DATA (fail-safe: block, never allow)
  // ------------------------------------------------

  const lastUpdated =
    typeof input.lastUpdated === "number" &&
    Number.isFinite(input.lastUpdated)
      ? input.lastUpdated
      : null;

  if (
    lastUpdated === null
  ) {

    return {
      tier: "Unsafe",
      usableWh: 0,
      blocked: true,
      reasons: [
        "No battery reading available.",
      ],
    };
  }

  const ageMs = Date.now() - lastUpdated;

  if (
    ageMs > config.staleReadingMs
  ) {

    return {
      tier: "Unsafe",
      usableWh: 0,
      blocked: true,
      reasons: [
        `Battery reading is stale (${Math.round(ageMs / 1000)}s old).`,
      ],
    };
  }

  // ------------------------------------------------
  // UNSAFE SIGNALS
  // ------------------------------------------------

  if (
    input.dod === "Unsafe"
  ) {

    tier = "Unsafe";

    reasons.push(
      "Depth of discharge is unsafe.",
    );
  }

  if (
    soc < config.cautionSocMin
  ) {

    tier = "Unsafe";

    reasons.push(
      `Battery level is ${Math.round(soc)}% (below the ${config.cautionSocMin}% cutoff).`,
    );
  }

  if (
    remainingWh < reserveWh
  ) {

    tier = "Unsafe";

    reasons.push(
      `Remaining energy is below the ${reserveWh} Wh reserve floor.`,
    );
  }

  // Hysteresis: a previous Unsafe latches until the voltage
  // recovers past recoveryVoltage; otherwise the trip is the
  // hard-cut voltage. Either way a healthy SoC never
  // overrides a sagging voltage.
  const latchedUnsafe =
    input.previousTier === "Unsafe" &&
    voltage <= config.recoveryVoltage;

  if (
    voltage <= config.unsafeVoltage ||
    latchedUnsafe
  ) {

    tier = "Unsafe";

    reasons.push(
      "Voltage is critically low — the harder safety signal.",
    );
  }

  // ------------------------------------------------
  // CAUTION BAND
  // ------------------------------------------------

  if (
    tier === "Safe" &&
    (soc <= config.cautionSocMax ||
      remainingWh === reserveWh ||
      voltage <= config.cautionVoltage)
  ) {

    tier = "Caution";

    reasons.push(
      "Battery is in the caution zone — light loads only.",
    );
  }

  // Energy above the reserve floor is what can
  // actually be spent without damaging the battery.
  const usableWh = Math.max(
    remainingWh - reserveWh,
    0,
  );

  const blocked =
    tier === "Unsafe" ||
    usableWh <= 0;

  return {
    tier,
    usableWh,
    blocked,
    reasons,
  };
};

// ============================================================
// 2. APPLIANCE WATTAGE RESOLUTION
//
// Accepts decimals ("35.5W"), thousands separators
// ("1,200W"), kilowatts ("1.2kW" -> 1200), ranges
// ("35-75W"), and bare numbers ("15-20" reads as watts).
// Voltage/current figures ("220V", "10A") are ignored.
// Anything else fails CLOSED (null): more than two watt
// figures, an unknown unit on a number, or any figure
// above the sane max. A bad parse must never underestimate
// into an "OK to use".
// ============================================================

export const parseWattageRange = (
  wattage: string,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
): WattRange | null => {

  const raw =
    String(wattage ?? "")
      .replace(/,/g, "")
      // "50 to 75W" reads as a range, not a unit.
      .replace(/\bto\b/gi, "-")
      .trim();

  if (
    raw.length === 0
  ) {

    return null;
  }

  // Number optionally followed by a unit token.
  const pairs =
    [...raw.matchAll(/(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/g)];

  if (
    pairs.length === 0
  ) {

    return null;
  }

  // Everything left after the pairs must be range
  // separators ("35 - 75W", "35/75W"). Stray text or
  // punctuation (a malformed "3.5.2W") fails closed.
  const remainder = raw
    .replace(
      /(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/g,
      "",
    )
    .trim();

  if (
    !/^[-–—~/()\s]*$/.test(remainder)
  ) {

    return null;
  }

  const watts: number[] = [];

  for (
    const pair of pairs
  ) {

    const value =
      Number(pair[1]);

    const unit =
      pair[2].toLowerCase();

    if (
      unit === "" ||
      unit === "w" ||
      unit === "watt" ||
      unit === "watts"
    ) {

      watts.push(value);
    } else if (
      unit === "kw" ||
      unit === "kilowatt" ||
      unit === "kilowatts"
    ) {

      watts.push(value * 1000);
    } else if (
      unit === "v" ||
      unit === "volt" ||
      unit === "volts" ||
      unit === "a" ||
      unit === "amp" ||
      unit === "amps"
    ) {

      // Nameplate voltage/current figure, not power.
      continue;
    } else {

      // Unknown unit on a number: fail closed.
      return null;
    }
  }

  if (
    watts.length === 0 ||
    watts.length > 2
  ) {

    return null;
  }

  const min =
    Math.min(...watts);

  const max =
    Math.max(...watts);

  if (
    !(min >= 1) ||
    !(max >= 1) ||
    max < min ||
    max > config.maxApplianceWatts
  ) {

    return null;
  }

  // The middle value is the rounded average of the
  // published range and is used for the primary estimate.
  const mid =
    min === max
      ? min
      : Math.round(
          (min + max) / 2,
        );

  return {
    min,
    mid,
    max,
  };
};

// ============================================================
// 3. RUNTIME CALCULATION
//
// usable_Wh = remaining_Wh - 144  (the 20% reserve floor).
//
// Higher wattage consumes energy faster, so:
//   runtime_min = usable_Wh / max_wattage  (safety floor)
//   runtime_mid = usable_Wh / mid_wattage  (primary estimate)
//   runtime_max = usable_Wh / min_wattage  (eco / best case)
// ============================================================

export const estimateRuntime = (
  usableWh: number,
  watts: number,
): number => {

  if (
    !Number.isFinite(usableWh) ||
    !Number.isFinite(watts) ||
    usableWh <= 0 ||
    watts <= 0
  ) {

    return 0;
  }

  return usableWh / watts;
};

export const formatRuntimeLabel = (
  minHours: number,
  maxHours: number,
): string => {

  const low =
    Math.max(minHours, 0);

  const high =
    Math.max(maxHours, low);

  if (
    high >= ALL_DAY_HOURS_LIMIT
  ) {

    return "All day";
  }

  if (
    high < RUNTIME_CARE_MIN_HOURS
  ) {

    return "<10 min";
  }

  if (
    high - low <= 0.05
  ) {

    return `~${high.toFixed(
      high < 10 ? 1 : 0,
    )} hrs`;
  }

  const decimals =
    high < 10 ? 1 : 0;

  return `~${low.toFixed(decimals)} – ${high.toFixed(decimals)} hrs`;
};

// ============================================================
// 3B. BUDGET, WATT CAP, AND VOLTAGE HEADROOM
//
// budget   = mid_watts / usable_Wh  (fraction of usable
//            energy spent per hour — inverse of runtime).
// wattCap  = (soc / 100) * MAX_SAFE_LOAD_W  (peak draw the
//            current charge can reasonably sustain).
// voltage  = current_voltage - estimated_draw_drop. A punt
//            past UNSAFE_VOLTAGE blocks the appliance.
// ============================================================

export const computeDrainRatio = (
  watts: number,
  usableWh: number,
): number => {

  if (
    !Number.isFinite(watts) ||
    !Number.isFinite(usableWh) ||
    usableWh <= 0 ||
    watts <= 0
  ) {

    return 0;
  }

  return watts / usableWh;
};

export const computeWattCap = (
  soc: number,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
): number => {

  const normalized = Math.max(
    Math.min(
      normalizeNumber(soc),
      100,
    ),
    0,
  );

  return (
    normalized / 100
  ) * config.maxSafeLoadW;
};

export const estimateVoltageDrop = (
  watts: number,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
): number => {

  if (
    !Number.isFinite(watts) ||
    watts <= 0
  ) {

    return 0;
  }

  return (
    (watts / config.voltageDropStepWatts) *
    config.voltageDropStepVolts
  );
};

// ============================================================
// 4. BADGE MAPPING
//
// The UI exposes only two badges:
//   - "OK to use"       (recommended + care)
//   - "Not advisable"   (not recommended)
//
// "Use with care" appliances are still usable, so they stay
// in the "OK to use" group in the simplified display.
// ============================================================

export const verdictToBadge = (
  verdict: Verdict,
): BadgeLabel => {

  if (
    verdict === "notRecommended"
  ) {

    return "Not advisable";
  }

  return "OK to use";
};

// ============================================================
// 5. PER-APPLIANCE RECOMMENDATION
//
//  recommended     : combined budget draw <= 10%/hr
//  care            : 10-25%/hr draw, or battery in caution
//  notRecommended  : blocked, unsafe projected voltage, peak
//                    over the charge wattage cap, invalid
//                    watts, or combined draw > 25%/hr
//
// Combined means measured current load plus this
// appliance. The voltage projection is the exception: the
// measured voltage already sags under the current load,
// so only the appliance peak is subtracted (no
// double-count). Runtime applies inverter efficiency to
// the usable energy.
// ============================================================

export const recommendAppliance = (
  battery: BatteryStateInput,
  appliance: ApplianceInput,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
): ApplianceRecommendation => {

  const classification =
    classifyBatteryState(battery, config);

  const usableWh =
    classification.usableWh;

  const wattRange =
    parseWattageRange(
      appliance.wattage,
      config,
    );

  const soc =
    normalizeNumber(battery.soc);

  const currentLoadW = Math.max(
    normalizeNumber(battery.currentLoadW),
    0,
  );

  // Startup peak for motor loads; nameplate max otherwise.
  const surge =
    appliance.motor === true
      ? config.motorSurgeMultiplier
      : 1;

  const peakWatts = wattRange
    ? wattRange.max * surge
    : 0;

  const combinedMidWatts = wattRange
    ? currentLoadW + wattRange.mid
    : currentLoadW;

  const combinedPeakWatts = wattRange
    ? currentLoadW + peakWatts
    : currentLoadW;

  const effectiveWh =
    usableWh * config.inverterEfficiency;

  const minHours = wattRange
    ? estimateRuntime(
        effectiveWh,
        wattRange.max,
      )
    : 0;

  const midHours = wattRange
    ? estimateRuntime(
        effectiveWh,
        wattRange.mid,
      )
    : 0;

  const maxHours = wattRange
    ? estimateRuntime(
        effectiveWh,
        wattRange.min,
      )
    : 0;

  const runtime: RuntimeEstimate = {
    minHours,
    midHours,
    maxHours,
  };

  const wattCap =
    computeWattCap(soc, config);

  const projectedVoltage = wattRange
    ? normalizeNumber(battery.voltage) -
      estimateVoltageDrop(
        peakWatts,
        config,
      )
    : normalizeNumber(battery.voltage);

  const drainRatio = wattRange
    ? computeDrainRatio(
        combinedMidWatts,
        usableWh,
      )
    : 0;

  let verdict: Verdict;
  let reason: string;

  if (
    classification.blocked
  ) {

    verdict = "notRecommended";

    reason =
      classification.tier === "Unsafe"
        ? "Battery is unsafe — recharge before using appliances."
        : "Reserve only — no load recommended.";
  } else if (
    !wattRange
  ) {

    verdict = "notRecommended";

    reason =
      "Invalid wattage range.";
  } else if (
    projectedVoltage <=
    config.unsafeVoltage
  ) {

    verdict = "notRecommended";

    reason =
      `Peak draw ${peakWatts}W would drop voltage to unsafe levels (${projectedVoltage.toFixed(1)}V).`;
  } else if (
    combinedPeakWatts >
    wattCap
  ) {

    const roundedCap = Math.round(wattCap);
    const roundedSoc = Math.round(soc);

    verdict = "notRecommended";

    reason =
      `Peak draw ${combinedPeakWatts}W exceeds the ${roundedCap}W cap at ${roundedSoc}% battery.`;
  } else if (
    drainRatio >
    config.budgetCareMax
  ) {

    verdict = "notRecommended";

    reason =
      `Uses ${(drainRatio * 100).toFixed(0)}% of the usable energy per hour.`;
  } else if (
    classification.tier === "Caution"
  ) {

    verdict = "care";

    reason =
      "Battery is in the caution zone — light loads only.";
  } else if (
    drainRatio >
    config.budgetRecommendedMax
  ) {

    verdict = "care";

    reason =
      `Uses a moderate ${(drainRatio * 100).toFixed(0)}% of the usable energy per hour.`;
  } else {

    verdict = "recommended";

    reason = "Safe to use.";
  }

  const displayRuntime =
    classification.blocked
      ? "—"
      : formatRuntimeLabel(
          minHours,
          maxHours,
        );

  return {
    id: appliance.id,
    name: appliance.name,
    area: appliance.area,
    wattRange,
    verdict,
    badgeLabel:
      verdictToBadge(verdict),
    tier: classification.tier,
    usableWh,
    runtime,
    displayRuntime,
    reason,
    drainRatio,
    projectedVoltage,
    wattCap,
  };
};

// ============================================================
// 6. BATCH RECOMMENDATION
//
// Sorted so the most usable appliances come first:
// recommended, then care, then not recommended.
// ============================================================

const VERDICT_RANK: Record<
  Verdict,
  number
> = {
  recommended: 0,
  care: 1,
  notRecommended: 2,
};

export const recommendAppliances = (
  battery: BatteryStateInput,
  appliances: ApplianceInput[],
): RecommendBatchResult => {

  const classification =
    classifyBatteryState(battery);

  const recommendations =
    appliances.map((appliance) =>
      recommendAppliance(
        battery,
        appliance,
      ),
    );

  recommendations.sort((left, right) => {
    const rankDiff =
      VERDICT_RANK[left.verdict] -
      VERDICT_RANK[right.verdict];

    if (
      rankDiff !== 0
    ) {

      return rankDiff;
    }

    return (
      right.runtime.midHours -
      left.runtime.midHours
    );
  });

  return {
    tier: classification.tier,
    usableWh:
      classification.usableWh,
    blocked:
      classification.blocked,
    recommendations,
  };
};

// ============================================================
// 7. MULTI-APPLIANCE (LOAD STACK) MODE
//
// Sums the mid wattages, gives one combined runtime estimate,
// flags stacks that exceed the inverter limit, and reports the
// appliance that drains the battery fastest.
//
// Reserved for a future catalog / "running together" screen;
// the simplified dashboard does not surface these numbers.
// ============================================================

export const computeLoadStack = (
  battery: BatteryStateInput,
  appliances: ApplianceInput[],
): LoadStackResult => {

  const classification =
    classifyBatteryState(battery);

  let totalMinWatts = 0;
  let totalMidWatts = 0;
  let totalMaxWatts = 0;
  let topDrain: ApplianceInput | null = null;
  let topMidWatts = -1;

  for (
    const appliance of appliances
  ) {

    const range =
      parseWattageRange(
        appliance.wattage,
      );

    if (
      !range
    ) {

      continue;
    }

    totalMinWatts += range.min;
    totalMidWatts += range.mid;
    totalMaxWatts += range.max;

    if (
      range.mid > topMidWatts
    ) {

      topMidWatts =
        range.mid;

      topDrain = appliance;
    }
  }

  const runtimeMidHours =
    classification.usableWh > 0 &&
    totalMidWatts > 0
      ? classification.usableWh /
        totalMidWatts
      : 0;

  return {
    tier: classification.tier,
    usableWh:
      classification.usableWh,
    blocked:
      classification.blocked,
    totalMinWatts,
    totalMidWatts,
    totalMaxWatts,
    runtimeMidHours,
    overLimit:
      totalMidWatts >
      MAX_SAFE_LOAD_W,
    limitWatts:
      MAX_SAFE_LOAD_W,
    topDrain,
  };
};