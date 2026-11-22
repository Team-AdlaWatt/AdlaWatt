import {
  BATTERY_RESERVE_WH,
  BATTERY_USABLE_WH,
  INVERTER_EFFICIENCY,
  INVERTER_IDLE_W,
} from "@/constants/battery";
import { GIVEN_CATALOG } from "@/constants/electronicsCatalog";
import type {
  BatteryStateInput,
  BatteryTier,
  ElectronicsInput,
  ElectronicsRecommendation,
  Verdict,
} from "@/services/recommendation";
import {
  DEFAULT_RECOMMENDATION_CONFIG,
  classifyBatteryState,
  computeDrainRatio,
  computeLoadStack,
  computeWattCap,
  estimateRuntime,
  estimateVoltageDrop,
  parseWattageRange,
  projectBatterySideLoadW,
  recommendElectronicsBatch,
  toBatterySideWatts,
} from "@/services/recommendation";
import {
  MISSING_ETR,
  formatDuration,
} from "@/utils/estimatedTimeRemaining";

export type SelectionStatus =
  | "waiting"
  | "blocked"
  | "ready";

export type SelectionReasonKey =
  | "empty"
  | "waiting"
  | "offline"
  | "stale"
  | "blocked"
  | "invalidWattage"
  | "overCap"
  | "unsafeVoltage"
  | "highDrain"
  | "care"
  | "recommended";

export interface SelectionAppliance {
  id: string;
  name: string;
  watts?: string;
  wattage?: string;
  area?: string;
  motor?: boolean;
  imageKey?: string | null;
  imageUrl?: string | null;
}

export interface SelectionAlternative {
  id: string;
  name: string;
  area?: string;
  watts: string;
  verdict: Verdict;
  reasonKey: SelectionReasonKey;
  runtimeHours: number;
  displayRuntime: string;
  imageKey?: string | null;
  imageUrl?: string | null;
}

export interface SelectionEvaluation {
  status: SelectionStatus;
  reasonKey: SelectionReasonKey;
  verdict: Verdict | null;
  tier: BatteryTier | null;
  blocked: boolean;
  reasons: string[];
  totalMinWatts: number;
  totalMidWatts: number;
  totalMaxWatts: number;
  totalPeakWatts: number;
  combinedPeakWatts: number;
  currentLoadW: number;
  runtimeHours: number | null;
  runtimeLabel: string;
  remainingPercent: number | null;
  usableRemainingWh: number;
  usableCapacityWh: number;
  reserveWh: number;
  selectedAcW: number;
  selectedBatterySideW: number;
  inverterIdleW: number;
  inverterEfficiency: number;
  alternatives: SelectionAlternative[];
  recommendations: ElectronicsRecommendation[];
}

export interface SelectionBatteryNormalization {
  status: "waiting" | "ready";
  reasonKey: SelectionReasonKey;
  battery: BatteryStateInput | null;
}

export interface EvaluateSelectionOptions {
  deviceOnline?: boolean;
  now?: number;
  alternativesPool?: SelectionAppliance[];
  alternativesLimit?: number;
}

const CATALOG_ALTERNATIVES: SelectionAppliance[] =
  GIVEN_CATALOG.map((item) => ({
    id: item.key,
    name: item.name,
    watts: item.display,
    area: item.uiArea,
    imageKey: item.key,
  }));

const toElectronicsInput = (
  item: SelectionAppliance,
): ElectronicsInput => ({
  id: item.id,
  name: item.name,
  wattage: item.wattage ?? item.watts ?? "",
  area: item.area,
  motor: item.motor,
});

const displayWatts = (
  item: SelectionAppliance,
): string => item.watts ?? item.wattage ?? "";

export const normalizeSelection = (
  ids: string[],
): string[] =>
  Array.from(
    new Set(ids.filter((id) => id.length > 0)),
  );

export const normalizeBatteryForSelection = (
  battery: BatteryStateInput | null,
  deviceOnline: boolean = true,
  now: number = Date.now(),
): SelectionBatteryNormalization => {
  if (!battery) {
    return {
      status: "waiting",
      reasonKey: "waiting",
      battery: null,
    };
  }

  if (!deviceOnline) {
    return {
      status: "waiting",
      reasonKey: "offline",
      battery: null,
    };
  }

  const lastUpdated = battery.lastUpdated;

  if (
    typeof lastUpdated !== "number" ||
    !Number.isFinite(lastUpdated)
  ) {
    return {
      status: "waiting",
      reasonKey: "waiting",
      battery: null,
    };
  }

  if (
    now - lastUpdated >
    DEFAULT_RECOMMENDATION_CONFIG.staleReadingMs
  ) {
    return {
      status: "waiting",
      reasonKey: "stale",
      battery: null,
    };
  }

  return {
    status: "ready",
    reasonKey: "recommended",
    battery,
  };
};

const reasonKeyFromVerdict = (
  verdict: Verdict,
  reason: string,
): SelectionReasonKey => {
  const normalized = reason.toLowerCase();

  if (normalized.includes("exceeds")) {
    return "overCap";
  }

  if (normalized.includes("voltage")) {
    return "unsafeVoltage";
  }

  if (normalized.includes("usable energy")) {
    return "highDrain";
  }

  if (normalized.includes("invalid wattage")) {
    return "invalidWattage";
  }

  if (verdict === "care") {
    return "care";
  }

  if (verdict === "notRecommended") {
    return "blocked";
  }

  return "recommended";
};

const buildAlternatives = (
  battery: BatteryStateInput,
  pool: SelectionAppliance[],
  selectedIds: string[],
  limit: number,
): SelectionAlternative[] => {
  const excluded = new Set(selectedIds);

  const available = pool.filter(
    (item) => !excluded.has(item.id),
  );

  const recommendations =
    recommendElectronicsBatch(
      battery,
      available.map(toElectronicsInput),
    ).recommendations;

  return recommendations
    .filter(
      (recommendation) =>
        recommendation.verdict !== "notRecommended",
    )
    .slice(0, limit)
    .map((recommendation) => {
      const source = available.find(
        (item) => item.id === recommendation.id,
      );

      return {
        id: recommendation.id,
        name: recommendation.name,
        area: recommendation.area,
        watts: source
          ? displayWatts(source)
          : "",
        verdict: recommendation.verdict,
        reasonKey: reasonKeyFromVerdict(
          recommendation.verdict,
          recommendation.reason,
        ),
        runtimeHours:
          recommendation.runtime.midHours,
        displayRuntime:
          recommendation.displayRuntime,
        imageKey: source?.imageKey,
        imageUrl: source?.imageUrl,
      };
    });
};

const emptyEvaluation = (
  status: SelectionStatus,
  reasonKey: SelectionReasonKey,
  totals: ReturnType<typeof computeLoadStack>,
  totalPeakWatts: number,
  tier: BatteryTier | null = null,
  reasons: string[] = [],
): SelectionEvaluation => ({
  status,
  reasonKey,
  verdict: null,
  tier,
  blocked: status !== "ready",
  reasons,
  totalMinWatts: totals.totalMinWatts,
  totalMidWatts: totals.totalMidWatts,
  totalMaxWatts: totals.totalMaxWatts,
  totalPeakWatts,
  combinedPeakWatts: 0,
  currentLoadW: 0,
  runtimeHours: null,
  runtimeLabel: MISSING_ETR,
  remainingPercent: null,
  usableRemainingWh: 0,
  usableCapacityWh: BATTERY_USABLE_WH,
  reserveWh: BATTERY_RESERVE_WH,
  selectedAcW: totals.totalMidWatts,
  selectedBatterySideW: toBatterySideWatts(
    totals.totalMidWatts,
  ),
  inverterIdleW: INVERTER_IDLE_W,
  inverterEfficiency: INVERTER_EFFICIENCY,
  alternatives: [],
  recommendations: [],
});

export const evaluateSelection = (
  battery: BatteryStateInput | null,
  selected: SelectionAppliance[],
  options: EvaluateSelectionOptions = {},
): SelectionEvaluation => {
  const inputs = selected.map(toElectronicsInput);
  const selectedIds = inputs.map((item) => item.id);
  const config = DEFAULT_RECOMMENDATION_CONFIG;
  const stack = computeLoadStack(
    battery ?? {
      soc: 0,
      voltage: 0,
      remainingWh: 0,
      lastUpdated: null,
    },
    inputs,
  );

  let totalPeakWatts = 0;

  for (const item of inputs) {
    const range = parseWattageRange(item.wattage);

    if (!range) {
      continue;
    }

    totalPeakWatts +=
      range.max *
      (item.motor
        ? config.motorSurgeMultiplier
        : 1);
  }

  if (selected.length === 0) {
    return emptyEvaluation(
      "waiting",
      "empty",
      stack,
      totalPeakWatts,
    );
  }

  const normalized = normalizeBatteryForSelection(
    battery,
    options.deviceOnline ?? true,
    options.now,
  );

  if (normalized.status === "waiting" || !normalized.battery) {
    return emptyEvaluation(
      "waiting",
      normalized.reasonKey,
      stack,
      totalPeakWatts,
    );
  }

  const activeBattery = normalized.battery;
  const classification = classifyBatteryState(
    activeBattery,
    config,
  );

  if (classification.blocked) {
    return emptyEvaluation(
      "blocked",
      "blocked",
      stack,
      totalPeakWatts,
      classification.tier,
      classification.reasons,
    );
  }

  const currentLoadW = Math.max(
    0,
    activeBattery.currentLoadW ?? 0,
  );

  const selectedBatterySideW =
    toBatterySideWatts(stack.totalMidWatts, config);

  const selectedPeakBatterySideW =
    toBatterySideWatts(totalPeakWatts, config);

  const combinedMidWatts =
    projectBatterySideLoadW({
      currentLoadW,
      batterySideLoadW: selectedBatterySideW,
    });

  const combinedPeakWatts =
    projectBatterySideLoadW({
      currentLoadW,
      batterySideLoadW: selectedPeakBatterySideW,
    });

  const runtimeHours =
    stack.totalMidWatts > 0
      ? estimateRuntime(
          classification.usableWh,
          combinedMidWatts,
        )
      : 0;

  const remainingPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (classification.usableWh /
          BATTERY_USABLE_WH) *
          100,
      ),
    ),
  );

  const wattCap = computeWattCap(
    activeBattery.soc,
    config,
  );

  const projectedVoltage =
    activeBattery.voltage -
    estimateVoltageDrop(
      Math.max(
        0,
        combinedPeakWatts - currentLoadW,
      ),
      config,
    );

  const drainRatio = computeDrainRatio(
    combinedMidWatts,
    classification.usableWh,
  );

  let verdict: Verdict;
  let reason: string;

  if (
    projectedVoltage <= config.unsafeVoltage
  ) {
    verdict = "notRecommended";
    reason = `Peak draw ${combinedPeakWatts}W would drop voltage to unsafe levels (${projectedVoltage.toFixed(1)}V).`;
  } else if (combinedPeakWatts > wattCap) {
    verdict = "notRecommended";
    reason = `Peak draw ${combinedPeakWatts}W exceeds the ${Math.round(wattCap)}W cap at ${Math.round(activeBattery.soc)}% battery.`;
  } else if (drainRatio > config.budgetCareMax) {
    verdict = "notRecommended";
    reason = `Uses ${(drainRatio * 100).toFixed(0)}% of the usable energy per hour.`;
  } else if (classification.tier === "Caution") {
    verdict = "care";
    reason =
      "Battery is in the caution zone — light loads only.";
  } else if (
    drainRatio > config.budgetRecommendedMax
  ) {
    verdict = "care";
    reason = `Uses a moderate ${(drainRatio * 100).toFixed(0)}% of the usable energy per hour.`;
  } else {
    verdict = "recommended";
    reason = "Safe to use.";
  }

  const recommendations =
    recommendElectronicsBatch(
      activeBattery,
      inputs,
    ).recommendations;

  const alternatives = buildAlternatives(
    activeBattery,
    options.alternativesPool ??
      CATALOG_ALTERNATIVES,
    selectedIds,
    options.alternativesLimit ?? 3,
  );

  return {
    status: "ready",
    reasonKey: reasonKeyFromVerdict(verdict, reason),
    verdict,
    tier: classification.tier,
    blocked: false,
    reasons: [reason],
    totalMinWatts: stack.totalMinWatts,
    totalMidWatts: stack.totalMidWatts,
    totalMaxWatts: stack.totalMaxWatts,
    totalPeakWatts,
    combinedPeakWatts,
    currentLoadW,
    runtimeHours,
    runtimeLabel: formatDuration(runtimeHours),
    remainingPercent,
    usableRemainingWh: classification.usableWh,
    usableCapacityWh: BATTERY_USABLE_WH,
    reserveWh: config.reserveWh,
    selectedAcW: stack.totalMidWatts,
    selectedBatterySideW,
    inverterIdleW: config.inverterIdleW,
    inverterEfficiency: config.inverterEfficiency,
    alternatives,
    recommendations,
  };
};
