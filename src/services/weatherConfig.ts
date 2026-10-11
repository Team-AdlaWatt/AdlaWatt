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
