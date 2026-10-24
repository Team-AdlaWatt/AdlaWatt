import { Ionicons } from "@expo/vector-icons";

import weatherJson from "@/data/weather.json";

// ============================================================
// WEATHER CONFIG
//
// Typed gateway to src/data/weather.json — the single source
// of truth for every weather decision (endpoints, timeouts,
// thresholds, condition rules, messages, formats).
//
// Rule: numbers, strings, lists, and rankings live in JSON.
// Fetch calls, GPS, React state, and styles stay in TS.
// ============================================================

export type WeatherSeverity =
  keyof typeof weatherJson.severityRanks;

export type SolarOutlook =
  | "High"
  | "Moderate"
  | "Low";

interface ConditionRule {
  match: string[];
  icon: string;
  severity: string;
}

interface ResolvedCondition {
  icon: keyof typeof Ionicons.glyphMap;
  severity: WeatherSeverity;
}

export interface LocalPlace {
  id: string;
  name: string;
  municipality?: string;
  label?: string;
  lat: number;
  lon: number;
}

// ============================================================
// STARTUP ASSERT
//
// A JSON typo fails fast here with a clear message instead
// of rendering a blank icon or silently mistuning a rule.
// ============================================================

function assertWeatherConfig(): void {
  const ranks = weatherJson.severityRanks as Record<
    string,
    number
  >;

  const rules = weatherJson.conditions
    .rules as ConditionRule[];

  if (rules.length === 0) {
    throw new Error(
      "weather.json: conditions.rules must not be empty."
    );
  }

  for (const rule of rules) {
    if (
      typeof ranks[rule.severity] !== "number"
    ) {
      throw new Error(
        `weather.json: unknown severity "${rule.severity}".`
      );
    }

    if (
      rule.match.length === 0 ||
      typeof rule.icon !== "string" ||
      rule.icon.length === 0
    ) {
      throw new Error(
        "weather.json: every rule needs keywords and an icon."
      );
    }
  }

  const fallback = weatherJson.conditions
    .fallback as { icon: string; severity: string };

  if (
    typeof ranks[fallback.severity] !==
      "number" ||
    !(fallback.icon in Ionicons.glyphMap)
  ) {
    throw new Error(
      "weather.json: invalid conditions.fallback."
    );
  }

  const location = weatherJson.location as unknown as {
    coverageRadiusKm?: unknown;
    province?: unknown;
    places?: LocalPlace[];
  };

  if (
    typeof location.coverageRadiusKm !== "number" ||
    !Number.isFinite(location.coverageRadiusKm) ||
    location.coverageRadiusKm <= 0
  ) {
    throw new Error(
      "weather.json: location.coverageRadiusKm must be a positive number."
    );
  }

  if (
    typeof location.province !== "string" ||
    location.province.trim().length === 0
  ) {
    throw new Error(
      "weather.json: location.province must not be empty."
    );
  }

  if (
    !Array.isArray(location.places) ||
    location.places.length === 0
  ) {
    throw new Error(
      "weather.json: location.places must not be empty."
    );
  }

  const placeIds = new Set<string>();

  for (const place of location.places) {
    if (
      typeof place.id !== "string" ||
      place.id.trim().length === 0 ||
      placeIds.has(place.id)
    ) {
      throw new Error(
        "weather.json: every location place needs a unique id."
      );
    }

    placeIds.add(place.id);

    if (
      typeof place.name !== "string" ||
      place.name.trim().length === 0
    ) {
      throw new Error(
        `weather.json: location place "${place.id}" needs a name.`
      );
    }

    if (
      typeof place.lat !== "number" ||
      !Number.isFinite(place.lat) ||
      place.lat < -90 ||
      place.lat > 90 ||
      typeof place.lon !== "number" ||
      !Number.isFinite(place.lon) ||
      place.lon < -180 ||
      place.lon > 180
    ) {
      throw new Error(
        `weather.json: location place "${place.id}" has invalid coordinates.`
      );
    }

    for (const key of ["municipality", "label"] as const) {
      const value = place[key];

      if (
        value !== undefined &&
        (typeof value !== "string" ||
          value.trim().length === 0)
      ) {
        throw new Error(
          `weather.json: location place "${place.id}" has an invalid ${key}.`
        );
      }
    }
  }

  const localFormats = weatherJson.formats as unknown as {
    localPlaceLabel?: unknown;
    localOnlyLabel?: unknown;
  };

  const localPlaceLabel = localFormats.localPlaceLabel;
  const localOnlyLabel = localFormats.localOnlyLabel;

  if (
    typeof localPlaceLabel !== "string" ||
    !localPlaceLabel.includes("{place}") ||
    !localPlaceLabel.includes("{municipality}") ||
    !localPlaceLabel.includes("{province}")
  ) {
    throw new Error(
      "weather.json: formats.localPlaceLabel needs {place}, {municipality}, and {province}."
    );
  }

  if (
    typeof localOnlyLabel !== "string" ||
    !localOnlyLabel.includes("{place}") ||
    !localOnlyLabel.includes("{province}")
  ) {
    throw new Error(
      "weather.json: formats.localOnlyLabel needs {place} and {province}."
    );
  }

  const notices = (
    weatherJson.messages as unknown as {
      notices?: { outside_scope?: unknown };
    }
  ).notices;

  if (
    typeof notices?.outside_scope !== "string" ||
    notices.outside_scope.trim().length === 0
  ) {
    throw new Error(
      "weather.json: messages.notices.outside_scope must not be empty."
    );
  }

  const classification = (
    weatherJson as unknown as {
      classification?: {
        ranges?: unknown[];
        iconsByCode?: Record<string, unknown>;
      };
    }
  ).classification;

  if (
    !classification ||
    !Array.isArray(classification.ranges) ||
    classification.ranges.length === 0
  ) {
    throw new Error(
      "weather.json: classification.ranges must not be empty."
    );
  }

  for (const range of classification.ranges) {
    const entry = range as {
      id?: unknown;
      min?: unknown;
      max?: unknown;
      label?: unknown;
      day?: unknown;
      night?: unknown;
      icon?: unknown;
      iconNight?: unknown;
      severity?: unknown;
    };

    const hasId =
      typeof entry.id === "number" &&
      Number.isInteger(entry.id);
    const hasSpan =
      typeof entry.min === "number" &&
      Number.isInteger(entry.min) &&
      typeof entry.max === "number" &&
      Number.isInteger(entry.max) &&
      entry.max >= entry.min;

    if (!hasId && !hasSpan) {
      throw new Error(
        "weather.json: every classification range needs an id or a min/max span."
      );
    }

    const hasLabel =
      (typeof entry.label === "string" &&
        entry.label.length > 0) ||
      (typeof entry.day === "string" &&
        entry.day.length > 0 &&
        typeof entry.night === "string" &&
        entry.night.length > 0);

    if (!hasLabel) {
      throw new Error(
        "weather.json: every classification range needs a label or day/night labels."
      );
    }

    if (typeof ranks[entry.severity as string] !== "number") {
      throw new Error(
        `weather.json: unknown classification severity "${String(entry.severity)}".`
      );
    }

    for (const iconKey of ["icon", "iconNight"] as const) {
      const icon = entry[iconKey];

      if (icon === undefined) {
        continue;
      }

      if (
        typeof icon !== "string" ||
        !(icon in Ionicons.glyphMap)
      ) {
        throw new Error(
          `weather.json: unknown classification ${iconKey} "${String(icon)}".`
        );
      }
    }
  }

  const iconsByCode =
    classification.iconsByCode ?? {};

  for (const [code, icon] of Object.entries(
    iconsByCode,
  )) {
    if (
      typeof icon !== "string" ||
      !(icon in Ionicons.glyphMap)
    ) {
      throw new Error(
        `weather.json: unknown classification icon "${String(icon)}" for code "${code}".`
      );
    }
  }
}

assertWeatherConfig();

// ============================================================
// MAIN-GROUP FAST PATH
//
// OpenWeather's `weather[0].main` is a stable enum (Clear,
// Clouds, Rain, ...) while `description` is free-form prose.
// Prefer the group when present; description keywords stay as
// the fallback for unknown groups. Icons mirror the closest
// description-rule equivalent so rendering never changes for
// already-correct cases.
// ============================================================

const MAIN_GROUP_CONDITIONS: Record<
  string,
  ResolvedCondition
> = {
  Thunderstorm: {
    icon: "thunderstorm-outline",
    severity: "severe",
  },
  Tornado: {
    icon: "thunderstorm-outline",
    severity: "severe",
  },
  Squall: {
    icon: "rainy-outline",
    severity: "moderate",
  },
  Snow: {
    icon: "snow-outline",
    severity: "severe",
  },
  Rain: {
    icon: "rainy-outline",
    severity: "light",
  },
  Drizzle: {
    icon: "rainy-outline",
    severity: "light",
  },
  Mist: {
    icon: "cloud-outline",
    severity: "fog",
  },
  Smoke: {
    icon: "cloud-outline",
    severity: "fog",
  },
  Haze: {
    icon: "cloud-outline",
    severity: "fog",
  },
  Dust: {
    icon: "cloud-outline",
    severity: "fog",
  },
  Fog: {
    icon: "cloud-outline",
    severity: "fog",
  },
  Sand: {
    icon: "cloud-outline",
    severity: "fog",
  },
  Ash: {
    icon: "cloud-outline",
    severity: "fog",
  },
  Clear: {
    icon: "sunny-outline",
    severity: "clear",
  },
  Clouds: {
    icon: "partly-sunny-outline",
    severity: "cloudy",
  },
};

// ============================================================
// CONDITION RESOLUTION
//
// First-match wins (rule order = priority). Falls back to a
// validated icon so rendering can never receive undefined.
// ============================================================

export function resolveCondition(
  description: string,
  main?: string,
): ResolvedCondition {
  if (main) {
    const direct =
      MAIN_GROUP_CONDITIONS[main.trim()];

    if (direct) {
      return direct;
    }
  }

  const text = description.toLowerCase();

  const rules = weatherJson.conditions
    .rules as ConditionRule[];

  for (const rule of rules) {
    const hit = rule.match.some(
      (keyword) => text.includes(keyword)
    );

    if (!hit) {
      continue;
    }

    if (rule.icon in Ionicons.glyphMap) {
      return {
        icon: rule.icon as keyof typeof Ionicons.glyphMap,
        severity: rule.severity as WeatherSeverity,
      };
    }
  }

  const fallback = weatherJson.conditions
    .fallback as { icon: string; severity: string };

  return {
    icon: fallback.icon as keyof typeof Ionicons.glyphMap,
    severity: fallback.severity as WeatherSeverity,
  };
}

export function severityRank(
  severity: WeatherSeverity
): number {
  const ranks = weatherJson.severityRanks as Record<
    string,
    number
  >;

  return ranks[severity] ?? 0;
}

// ============================================================
// DAY PEAK
//
// The most extreme condition present wins (any rain beats
// mere clouds). Ties resolve to the slot nearest midday.
// ============================================================

export function peakOfDay<T extends { description: string }>(
  slots: T[],
  hourOf: (slot: T) => number
): T | null {
  if (slots.length === 0) {
    return null;
  }

  let best = slots[0];
  let bestRank = severityRank(
    resolveCondition(best.description).severity
  );
  let bestDistance = Math.abs(hourOf(best) - 12);

  for (let index = 1; index < slots.length; index += 1) {
    const slot = slots[index];

    const rank = severityRank(
      resolveCondition(slot.description).severity
    );

    const distance = Math.abs(hourOf(slot) - 12);

    if (
      rank > bestRank ||
      (rank === bestRank && distance < bestDistance)
    ) {
      best = slot;
      bestRank = rank;
      bestDistance = distance;
    }
  }

  return best;
}

// ============================================================
// SOLAR SCORING
//
// Sunlight proxy per day: clear-slot share + average cloud
// cover + rain presence. Cutoffs come from JSON thresholds.
// ============================================================

export function scoreSolarDay(args: {
  clearShare: number;
  cloudAvg: number;
  hasRain: boolean;
}): SolarOutlook {
  const thresholds = weatherJson.thresholds;

  if (
    args.hasRain ||
    args.cloudAvg > thresholds.cloudHighPct
  ) {
    return "Low";
  }

  if (
    args.clearShare >=
      thresholds.clearShareForHigh &&
    args.cloudAvg <= thresholds.cloudLowPct
  ) {
    return "High";
  }

  return "Moderate";
}

// ============================================================
// FORMATTING
// ============================================================

export function getLocalPlaces(): readonly LocalPlace[] {
  return weatherJson.location
    .places as unknown as LocalPlace[];
}

export function getCoverageRadiusKm(): number {
  return weatherJson.location.coverageRadiusKm;
}

export function formatLocalPlaceLabel(
  place: LocalPlace,
): string {
  const province = weatherJson.location.province;

  const placeName =
    place.label?.trim() || place.name.trim();

  const municipality =
    place.municipality?.trim();

  const template =
    municipality &&
    municipality !== placeName
      ? weatherJson.formats.localPlaceLabel
      : weatherJson.formats.localOnlyLabel;

  return template
    .replace("{place}", placeName)
    .replace("{municipality}", municipality ?? "")
    .replace("{province}", province);
}

export function outsideScopeNotice(): string {
  const raw = (
    weatherJson.messages as unknown as {
      notices?: { outside_scope?: unknown };
    }
  ).notices?.outside_scope;

  return typeof raw === "string" && raw.length > 0
    ? raw
    : "Outside the known Bukidnon coverage area — showing weather for your current location.";
}

export function formatApiError(
  status: number
): string {
  return weatherJson.messages.errors.api.replace(
    "{status}",
    String(status)
  );
}

export function formatTimeoutError(): string {
  const seconds = Math.round(
    weatherJson.api.timeoutMs / 1000
  );

  return weatherJson.messages.errors.timeout.replace(
    "{seconds}",
    String(seconds)
  );
}

export function formatNetworkError(
  detail: string
): string {
  return weatherJson.messages.errors.network.replace(
    "{detail}",
    detail
  );
}

export function formatCoordFallback(
  lat: number,
  lon: number
): string {
  const decimals =
    weatherJson.formats.coordDecimals;

  return weatherJson.formats.coordFallback
    .replace("{lat}", lat.toFixed(decimals))
    .replace("{lon}", lon.toFixed(decimals));
}

export function roundTemperature(
  value: number
): number {
  const decimals =
    weatherJson.formats.tempDecimals;

  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

export function formatClockTime(
  date: Date
): string {
  let hours = date.getHours();

  const minutes = date
    .getMinutes()
    .toString()
    .padStart(2, "0");

  const suffix = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${hours}:${minutes} ${suffix}`;
}

export function formatForecastDay(
  date: Date
): { weekday: string; date: string } {
  const format = weatherJson.forecast.dateFormat;

  const weekday = date.toLocaleDateString("en-US", {
    weekday:
      format.weekday as "short" | "long" | "narrow",
  });

  const month = date.toLocaleDateString("en-US", {
    month:
      format.month as "short" | "long" | "narrow",
  });

  return {
    weekday,
    date: `${month} ${date.getDate()}`,
  };
}

export function formatBestSunSummary(
  day: string | null
): string {
  const summaries =
    weatherJson.forecast.bestSunSummary;

  if (!day) {
    return summaries.poor;
  }

  return summaries.good.replace("{day}", day);
}

// ============================================================
// FORECAST SUMMARY
//
// Data-driven footer line for the 4-day strip. Branches come
// from weather.json (forecast.summary) and are driven by the
// days' real classified conditions, rain chance, temp flags,
// and solar outlook — never a fixed string.
// ============================================================

interface ForecastSummaryInput {
  weekday: string;
  isRainy: boolean;
  isHighSun: boolean;
  isCold: boolean;
  isHot: boolean;
}

export function formatForecastSummary(
  days: ForecastSummaryInput[],
): string {
  const summary = (
    weatherJson as unknown as {
      forecast?: {
        summary?: {
          rainyDayCount?: number;
          rainyDays?: string;
          bestSun?: string;
          coolest?: string;
          mixed?: string;
        };
      };
    }
  ).forecast?.summary;

  const rainyDaysText =
    summary?.rainyDays ??
    "{count} rainy days ahead — keep the battery topped up.";
  const bestSunText =
    summary?.bestSun ??
    "Best sun: {day} — good day to charge fully.";
  const coolestText =
    summary?.coolest ?? "Coolest {day}.";
  const mixedText =
    summary?.mixed ??
    "Mixed skies — charge whenever the sun is out.";

  const cutoff =
    typeof summary?.rainyDayCount === "number" &&
    Number.isInteger(summary.rainyDayCount)
      ? summary.rainyDayCount
      : 2;

  const rainyDays = days.filter((day) => day.isRainy);

  if (rainyDays.length >= cutoff) {
    return rainyDaysText.replace(
      "{count}",
      String(rainyDays.length),
    );
  }

  const bestSunDay = days.find((day) => day.isHighSun);

  if (bestSunDay) {
    return bestSunText.replace("{day}", bestSunDay.weekday);
  }

  const coldDay = days.find((day) => day.isCold);

  if (coldDay) {
    return coolestText.replace("{day}", coldDay.weekday);
  }

  return mixedText;
}

// ============================================================
// DATA AGE / STALENESS / REFRESH GUARD
//
// Pure helpers for honest age display ("Updated 12m ago"),
// the 30-minute stale rule for cached readings, and the
// 2-minute tap-to-refresh block. Thresholds come from
// weather.json (cache.staleMinutes, timing.minRefreshMs).
// ============================================================

export function formatDataAge(
  observedAtMs: number,
  nowMs: number = Date.now()
): string {
  const minutes = Math.max(
    0,
    Math.round((nowMs - observedAtMs) / 60000)
  );

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours}h ago`;
}

export function isStaleReading(
  observedAtMs: number | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (
    typeof observedAtMs !== "number" ||
    !Number.isFinite(observedAtMs)
  ) {
    return true;
  }

  return (
    nowMs - observedAtMs >
    weatherJson.cache.staleMinutes * 60000
  );
}

export function canRefreshToday(
  lastAttemptMs: number | null,
  nowMs: number = Date.now()
): boolean {
  if (
    typeof lastAttemptMs !== "number" ||
    !Number.isFinite(lastAttemptMs)
  ) {
    return true;
  }

  return (
    nowMs - lastAttemptMs >=
    weatherJson.timing.minRefreshMs
  );
}

// ============================================================
// TODAY CLASSIFIER (OWM condition code)
//
// The Today card follows OpenWeather's own weather[0].id —
// no description-keyword matching, no cloud bands, no
// forecast cross-check, no humidity rules. One safety rule
// only: rain/drizzle ids without any measured rain amount
// soften to a "possible" label. Thunderstorm is never
// softened. Day/night comes from the icon suffix alone, so
// "Sunny" can never render at night.
//
// Id ranges, labels, and icon codes live in
// weather.json classification.
// ============================================================

interface IdRange {
  id?: number;
  min?: number;
  max?: number;
  label?: string;
  day?: string;
  night?: string;
  icon?: string;
  iconNight?: string;
  severity: WeatherSeverity;
}

function classificationRanges(): IdRange[] {
  return (
    (
      weatherJson as unknown as {
        classification?: { ranges?: IdRange[] };
      }
    ).classification?.ranges ?? []
  );
}

function classificationText(
  key:
    | "rainPossibleLabel"
    | "drizzlePossibleLabel"
    | "unconfirmedSubtext"
    | "unavailableLabel"
    | "estimateSubtext"
    | "skyNote",
  fallback: string,
): string {
  const raw = (
    weatherJson as unknown as {
      classification?: Record<string, unknown>;
    }
  ).classification?.[key];

  return typeof raw === "string" && raw.length > 0
    ? raw
    : fallback;
}

function classificationConfirmRange(): {
  min: number;
  max: number;
  drizzleMax: number;
  confirmMinMm: number;
} {
  const raw = (
    weatherJson as unknown as {
      classification?: {
        confirmRange?: {
          min?: unknown;
          max?: unknown;
          drizzleMax?: unknown;
          confirmMinMm?: unknown;
        };
      };
    }
  ).classification?.confirmRange;

  const pick = (
    value: unknown,
    fallback: number,
  ): number =>
    typeof value === "number" &&
    Number.isInteger(value)
      ? value
      : fallback;

  const pickFloat = (
    value: unknown,
    fallback: number,
  ): number =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
      ? value
      : fallback;

  return {
    min: pick(raw?.min, 300),
    max: pick(raw?.max, 531),
    drizzleMax: pick(raw?.drizzleMax, 321),
    confirmMinMm: pickFloat(
      raw?.confirmMinMm,
      0.2,
    ),
  };
}

function findIdRange(
  id: number,
): IdRange | null {
  for (const range of classificationRanges()) {
    if (
      typeof range.id === "number" &&
      range.id === id
    ) {
      return range;
    }

    if (
      typeof range.min === "number" &&
      typeof range.max === "number" &&
      id >= range.min &&
      id <= range.max
    ) {
      return range;
    }
  }

  return null;
}

function iconForCode(
  iconCode: string,
): keyof typeof Ionicons.glyphMap {
  const table = (
    weatherJson as unknown as {
      classification?: {
        iconsByCode?: Record<string, string>;
      };
    }
  ).classification?.iconsByCode;

  const mapped = table?.[iconCode.trim()];

  if (
    mapped &&
    mapped in Ionicons.glyphMap
  ) {
    return mapped as keyof typeof Ionicons.glyphMap;
  }

  const fallback = weatherJson.conditions
    .fallback as { icon: string };

  return fallback.icon as keyof typeof Ionicons.glyphMap;
}

// The Today card's icon is derived from the same classification
// range as its label, so the two can never disagree. Day/night
// variants come from the range (`icon` / `iconNight`); a range
// without an icon falls back to the OWM icon-code lookup.
function iconForRange(
  range: IdRange,
  isDay: boolean,
): keyof typeof Ionicons.glyphMap | null {
  const candidate = isDay
    ? range.icon
    : (range.iconNight ?? range.icon);

  if (
    typeof candidate === "string" &&
    candidate in Ionicons.glyphMap
  ) {
    return candidate as keyof typeof Ionicons.glyphMap;
  }

  return null;
}

export interface ClassifiedToday {
  label: string;
  subtext?: string;
  icon: keyof typeof Ionicons.glyphMap;
  severity: WeatherSeverity;
  isDay: boolean;
}

export function classifyTodayById(args: {
  id: number;
  iconCode: string;
  rainMm: number | null;
}): ClassifiedToday {
  const isDay = !args.iconCode.trim().endsWith("n");
  const codeIcon = iconForCode(args.iconCode);
  const confirm = classificationConfirmRange();

  const range = findIdRange(args.id);

  if (!range) {
    return {
      label: classificationText(
        "unavailableLabel",
        "Condition unavailable",
      ),
      subtext: classificationText(
        "estimateSubtext",
        "Estimate",
      ),
      icon: codeIcon,
      severity: "cloudy",
      isDay,
    };
  }

  const icon = iconForRange(range, isDay) ?? codeIcon;

  const label =
    typeof range.label === "string"
      ? range.label
      : isDay
        ? (range.day as string)
        : (range.night as string);

  // One safety rule: rain/drizzle ids with less than a
  // measurable amount (< 0.2mm in either 1h or 3h) soften
  // to "possible". Thunderstorm ids sit outside the
  // confirm range, so they are never softened.
  const needsConfirm =
    args.id >= confirm.min && args.id <= confirm.max;

  const confirmed =
    args.rainMm !== null &&
    Number.isFinite(args.rainMm) &&
    (args.rainMm as number) >=
      confirm.confirmMinMm;

  if (needsConfirm && !confirmed) {
    const possibleLabel =
      args.id <= confirm.drizzleMax
        ? classificationText(
            "drizzlePossibleLabel",
            "Drizzle possible",
          )
        : classificationText(
            "rainPossibleLabel",
            "Rain possible",
          );

    return {
      label: possibleLabel,
      subtext: classificationText(
        "unconfirmedSubtext",
        "Not confirmed nearby",
      ),
      icon,
      severity: "cloudy",
      isDay,
    };
  }

  return {
    label,
    icon,
    severity: range.severity,
    isDay,
  };
}

// ============================================================
// ID-BASED PEAK RANKING (forecast)
//
// Ranks a 3-hour forecast slot using the same id taxonomy the
// Today card classifies with, so "most extreme wins" agrees
// with the label the day later shows. Falls back to the
// description-keyword severity when a slot carries no id.
// Does not alter any Today-card behavior.
// ============================================================

export function severityRankById(args: {
  id?: number;
  description: string;
  main?: string;
}): number {
  if (
    typeof args.id === "number" &&
    Number.isInteger(args.id)
  ) {
    const range = findIdRange(args.id);

    if (range) {
      return severityRank(range.severity);
    }
  }

  return severityRank(
    resolveCondition(args.description, args.main).severity,
  );
}

export function todaySkyNote(): string {
  return classificationText(
    "skyNote",
    "Condition comes from OpenWeather's standard codes. Not solar power.",
  );
}

export function todayUnavailableLabel(): string {
  return classificationText(
    "unavailableLabel",
    "Condition unavailable",
  );
}

export function todayEstimateSubtext(): string {
  return classificationText(
    "estimateSubtext",
    "Estimate",
  );
}

// ============================================================
// TODAY DISPLAY DECISION
//
// Pure, exported for tests: legacy readings (no classifier
// fields) and stale readings (older than 30 min) resolve to
// neutral so the card never shows a possibly-false label.
// The card still renders temp + Updated-age around it.
// ============================================================

export interface TodayReading {
  conditionId?: number;
  iconCode?: string;
  rainMm?: number | null;
  observedAt?: number;
}

export function resolveTodayDisplay(
  weather: TodayReading | null,
): { kind: "neutral" } | { kind: "live"; classified: ClassifiedToday } {
  const hasClassifierFields =
    !!weather &&
    typeof weather.conditionId === "number" &&
    Number.isFinite(weather.conditionId) &&
    typeof weather.iconCode === "string" &&
    weather.iconCode.trim().length > 0 &&
    typeof weather.observedAt === "number" &&
    Number.isFinite(weather.observedAt);

  if (
    !hasClassifierFields ||
    isStaleReading(weather?.observedAt)
  ) {
    return { kind: "neutral" };
  }

  const source = weather as Required<
    Pick<
      TodayReading,
      "conditionId" | "iconCode" | "observedAt"
    >
  > &
    TodayReading;

  return {
    kind: "live",
    classified: classifyTodayById({
      id: source.conditionId,
      iconCode: source.iconCode,
      rainMm:
        typeof source.rainMm === "number" &&
        Number.isFinite(source.rainMm)
          ? source.rainMm
          : null,
    }),
  };
}

// ============================================================
// HEAT INDEX (NOAA)
//
// OWM `feels_like` reads low in humid tropics, so the card's
// feels-like is the heat index computed from OWM temp +
// humidity when valid (about 27C+ and 40%+ RH), falling back
// to OWM `feels_like` otherwise. Pure, exported for tests.
// ============================================================

const cToF = (c: number): number =>
  (c * 9) / 5 + 32;

const fToC = (f: number): number =>
  ((f - 32) * 5) / 9;

export function heatIndexC(
  tempC: number,
  rh: number,
): number | null {
  if (
    !Number.isFinite(tempC) ||
    !Number.isFinite(rh)
  ) {
    return null;
  }

  const T = cToF(tempC);

  if (T < 80 || rh < 40) {
    return null;
  }

  const simple =
    0.5 *
    (T + 61 + (T - 68) * 1.2 + rh * 0.094);

  if ((simple + T) / 2 < 80) {
    return fToC(simple);
  }

  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * rh -
    0.22475541 * T * rh -
    0.00683783 * T * T -
    0.05481717 * rh * rh +
    0.00122874 * T * T * rh +
    0.00085282 * T * rh * rh -
    0.00000199 * T * T * rh * rh;

  if (rh > 85 && T <= 87) {
    hi += ((rh - 85) / 10) * ((87 - T) / 5);
  }

  return fToC(hi);
}

export type FeelsLikeSource =
  | "heat-index"
  | "openweather";

export function resolveFeelsLike(
  tempC: number,
  rh: number | null,
  owmFeels: number | null,
): {
  value: number;
  source: FeelsLikeSource;
} | null {
  const humidity =
    typeof rh === "number" && Number.isFinite(rh)
      ? rh
      : null;

  if (humidity !== null) {
    const hi = heatIndexC(tempC, humidity);

    if (hi !== null && Number.isFinite(hi)) {
      return { value: hi, source: "heat-index" };
    }
  }

  if (
    typeof owmFeels === "number" &&
    Number.isFinite(owmFeels)
  ) {
    return {
      value: owmFeels,
      source: "openweather",
    };
  }

  return null;
}

// ============================================================
// CALIBRATION
//
// Config-driven bias correction (weather.json calibration).
// `feelsMode` picks the feels-like source; `feelsOffsetC` is an
// optional nudge applied after the value is resolved. Defaults
// keep behavior unchanged (heat index, no offset).
// ============================================================

export type FeelsMode = "heat-index" | "openweather";

export function getFeelsMode(): FeelsMode {
  const raw = (
    weatherJson as unknown as {
      calibration?: { feelsMode?: unknown };
    }
  ).calibration?.feelsMode;

  return raw === "openweather"
    ? "openweather"
    : "heat-index";
}

export function getFeelsOffsetC(): number {
  const raw = (
    weatherJson as unknown as {
      calibration?: { feelsOffsetC?: unknown };
    }
  ).calibration?.feelsOffsetC;

  return typeof raw === "number" && Number.isFinite(raw)
    ? raw
    : 0;
}
