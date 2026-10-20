import weatherJson from "@/data/weather.json";
import {
  classifyTodayById,
  formatApiError,
  formatForecastDay,
  formatNetworkError,
  formatTimeoutError,
  resolveCondition,
  scoreSolarDay,
  severityRankById,
  type SolarOutlook,
  type WeatherSeverity,
} from "@/services/weatherConfig";
import { WeatherError } from "@/services/weatherForecast";

// ============================================================
// 5-DAY FORECAST FETCHER
//
// OpenWeatherMap /forecast returns 3-hour steps (~40 entries).
// This module groups them into daily summaries tuned for
// solar planning: each upcoming day reports its PEAK condition
// (most extreme present, not the majority vote), a solar
// outlook, and hot/cold flags. Today is rendered live from
// current weather, so only the upcoming days are returned.
//
// Every limit, cutoff, and message comes from weather.json.
// ============================================================

export type TempFlag =
  | "hot"
  | "cold"
  | "both"
  | null;

export interface DailyForecast {
  date: string;
  weekday: string;
  dateLabel: string;
  tempMin: number;
  tempMax: number;
  peakDescription: string;
  peakIcon: string;
  peakSeverity: WeatherSeverity;
  // Honesty note when the peak's condition softened (e.g.
  // "Not confirmed nearby"). Absent otherwise.
  peakSubtext?: string;
  // All-day maximum OWM `pop` (probability of precipitation,
  // 0-1) across every slot of the day, including night slots.
  popMax: number;
  solarOutlook: SolarOutlook;
  tempFlag: TempFlag;
}

export interface ForecastResult {
  upcoming: DailyForecast[];
  bestSunDay: string | null;
  cityName: string;
  fetchedAt: string;
}

interface ForecastSlot {
  date: string;
  hour: number;
  temp: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  description: string;
  mainGroup?: string;
  iconCode?: string;
  conditionId?: number;
  clouds: number;
  pop: number;
  // Measured rain (mm) for this 3-hour slot from
  // rain["3h"] ?? rain["1h"]. Null when absent — never 0.
  // Feeds the id classifier's confirm rule so a forecast day
  // matches the Today card's rain handling.
  rainMm: number | null;
}

interface ForecastApiEntry {
  dt?: unknown;
  dt_txt?: unknown;
  main?: {
    temp?: unknown;
    temp_min?: unknown;
    temp_max?: unknown;
    humidity?: unknown;
  };
  weather?: {
    id?: unknown;
    main?: unknown;
    description?: unknown;
    icon?: unknown;
  }[];
  clouds?: {
    all?: unknown;
  };
  pop?: unknown;
  rain?: {
    "1h"?: unknown;
    "3h"?: unknown;
  };
}

interface ForecastApiResponse {
  list?: unknown;
  city?: {
    name?: unknown;
    timezone?: unknown;
  };
}

// ============================================================
// FETCH WITH TIMEOUT
// ============================================================

async function fetchForecastResponse(
  lat: number,
  lon: number
): Promise<ForecastApiResponse> {
  const apiKey = process.env.EXPO_PUBLIC_OWM_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new WeatherError(
      "missing_key",
      weatherJson.messages.errors.missing_key
    );
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    appid: apiKey,
    units: weatherJson.api.units,
  });

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    weatherJson.api.timeoutMs
  );

  try {
    const response = await fetch(
      `${weatherJson.api.forecastUrl}?${params.toString()}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new WeatherError(
        "api",
        formatApiError(response.status)
      );
    }

    try {
      return (await response.json()) as ForecastApiResponse;
    } catch {
      throw new WeatherError(
        "invalid_response",
        weatherJson.messages.errors.invalid_json
      );
    }
  } catch (error) {
    if (error instanceof WeatherError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new WeatherError(
        "timeout",
        formatTimeoutError()
      );
    }

    throw new WeatherError(
      "network",
      formatNetworkError(
        error instanceof Error
          ? error.message
          : "Network error."
      )
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// SLOT PARSING
// ============================================================

function toNumber(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

// Measured rain (mm) for a slot: rain["3h"] ?? rain["1h"].
// Returns null (never 0) when the slot carries no amount, so
// the classifier can tell "no rain recorded" apart from
// "0 mm recorded".
function toRainMm(
  rain: ForecastApiEntry["rain"],
): number | null {
  const threeH = toNumber(rain?.["3h"]);
  const oneH = toNumber(rain?.["1h"]);

  if (threeH !== null && threeH >= 0) {
    return threeH;
  }

  if (oneH !== null && oneH >= 0) {
    return oneH;
  }

  return null;
}

// Local calibration offset (°C) shared with current weather.
// Applied to daily min/max at summary time; tune in JSON.
function getTempOffsetC(): number {
  const raw = (
    weatherJson as unknown as {
      calibration?: { tempOffsetC?: unknown };
    }
  ).calibration?.tempOffsetC;

  return typeof raw === "number" && Number.isFinite(raw)
    ? raw
    : 0;
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
}

// OWM `dt` is unix UTC seconds; `city.timezone` is the
// location offset in seconds. Grouping by location-local day
// keeps 3-hour slots on the right date instead of UTC.
// Falls back to `dt_txt` when dt/timezone are absent.
function parseSlot(
  entry: ForecastApiEntry,
  tzOffsetSec: number | null,
): ForecastSlot | null {
  const temp = toNumber(entry.main?.temp);
  const description = entry.weather?.[0]?.description;

  if (
    temp === null ||
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    return null;
  }

  const rawDt = toNumber(entry.dt);
  let date: string | null = null;
  let hour: number | null = null;

  if (
    rawDt !== null &&
    tzOffsetSec !== null &&
    Number.isInteger(rawDt)
  ) {
    const local = new Date((rawDt + tzOffsetSec) * 1000);

    date = toDateKey(
      local.getUTCFullYear(),
      local.getUTCMonth() + 1,
      local.getUTCDate(),
    );

    hour = local.getUTCHours();
  } else if (
    typeof entry.dt_txt === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
      entry.dt_txt,
    )
  ) {
    const [d, time] = entry.dt_txt.split(" ");

    date = d;

    hour = Number(time.split(":")[0]);
  }

  if (
    date === null ||
    hour === null ||
    !Number.isFinite(hour)
  ) {
    return null;
  }

  const rawMain = entry.weather?.[0]?.main;
  const rawIcon = entry.weather?.[0]?.icon;
  const rawId = toNumber(entry.weather?.[0]?.id);

  return {
    date,
    hour,
    temp,
    tempMin:
      toNumber(entry.main?.temp_min) ?? temp,
    tempMax:
      toNumber(entry.main?.temp_max) ?? temp,
    humidity:
      toNumber(entry.main?.humidity) ?? 0,
    description: description.trim(),
    ...(typeof rawMain === "string" && rawMain.trim().length > 0
      ? { mainGroup: rawMain.trim() }
      : {}),
    ...(typeof rawIcon === "string" && rawIcon.trim().length > 0
      ? { iconCode: rawIcon.trim() }
      : {}),
    ...(rawId !== null && Number.isInteger(rawId)
      ? { conditionId: rawId }
      : {}),
    clouds: toNumber(entry.clouds?.all) ?? 0,
    pop: toNumber(entry.pop) ?? 0,
    rainMm: toRainMm(entry.rain),
  };
}

// ============================================================
// DAY SUMMARY
// ============================================================

function isPrecipitation(slot: {
  description: string;
  mainGroup?: string;
}): boolean {
  const icon = resolveCondition(
    slot.description,
    slot.mainGroup,
  ).icon;

  return (
    icon === "rainy-outline" ||
    icon === "thunderstorm-outline" ||
    icon === "snow-outline"
  );
}

// Most extreme slot wins, using the SAME id taxonomy as the
// Today card (severityRankById). Ties resolve to the slot
// nearest midday. Mirrors peakOfDay's intent without touching
// that (Today-owned) helper.
function pickPeakSlot(
  slots: ForecastSlot[],
): ForecastSlot | null {
  if (slots.length === 0) {
    return null;
  }

  const rankOf = (slot: ForecastSlot): number =>
    severityRankById({
      id: slot.conditionId,
      description: slot.description,
      main: slot.mainGroup,
    });

  let best = slots[0];
  let bestRank = rankOf(best);
  let bestDistance = Math.abs(best.hour - 12);

  for (let index = 1; index < slots.length; index += 1) {
    const slot = slots[index];
    const rank = rankOf(slot);
    const distance = Math.abs(slot.hour - 12);

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

function summarizeDay(
  date: string,
  slots: ForecastSlot[]
): DailyForecast {
  // Daytime pool first (06:00-18:00 local): a night storm
  // must not label a solar-planning day. Falls back to
  // all slots when the day has no daytime coverage.
  const daytime = slots.filter(
    (slot) =>
      slot.hour >= 6 && slot.hour <= 18,
  );

  const pool =
    daytime.length > 0 ? daytime : slots;

  const peak =
    pickPeakSlot(pool) ?? slots[0];

  // Peak condition label + icon come from the SAME
  // id-based classifier the Today card uses, so a forecast
  // day reads exactly like Today (day/night label, matching
  // icon, and the rain-confirm rule). Slots without an id
  // fall back to the description-keyword path.
  let peakDescription: string;
  let peakIcon: string;
  let peakSeverity: WeatherSeverity;
  let peakSubtext: string | undefined;

  if (
    typeof peak.conditionId === "number" &&
    Number.isInteger(peak.conditionId) &&
    typeof peak.iconCode === "string" &&
    peak.iconCode.trim().length > 0
  ) {
    const classified = classifyTodayById({
      id: peak.conditionId,
      iconCode: peak.iconCode,
      rainMm: peak.rainMm,
    });

    peakDescription = classified.label;
    peakIcon = classified.icon;
    peakSeverity = classified.severity;
    peakSubtext = classified.subtext;
  } else {
    const peakResolved = resolveCondition(
      peak.description,
      peak.mainGroup,
    );

    peakDescription = peak.description;
    peakIcon = peakResolved.icon;
    peakSeverity = peakResolved.severity;
  }

  const clearSlots = slots.filter(
    (slot) =>
      resolveCondition(slot.description, slot.mainGroup)
        .severity === "clear"
  );

  const cloudAvg =
    slots.reduce(
      (sum, slot) => sum + slot.clouds,
      0
    ) / slots.length;

  const hasRain = slots.some((slot) =>
    isPrecipitation(slot)
  );

  const solarOutlook = scoreSolarDay({
    clearShare: clearSlots.length / slots.length,
    cloudAvg,
    hasRain,
  });

  const offsetC = getTempOffsetC();

  const tempMin = Math.min(
    ...slots.map((slot) => slot.tempMin + offsetC)
  );

  const tempMax = Math.max(
    ...slots.map((slot) => slot.tempMax + offsetC)
  );

  const thresholds = weatherJson.thresholds;

  const isHot = tempMax >= thresholds.hotC;
  const isCold = tempMin <= thresholds.coldC;

  const noon = new Date(`${date}T12:00:00`);

  const labels = formatForecastDay(noon);

  return {
    date,
    weekday: labels.weekday,
    dateLabel: labels.date,
    tempMin: Math.round(tempMin),
    tempMax: Math.round(tempMax),
    peakDescription,
    peakIcon,
    peakSeverity,
    ...(peakSubtext ? { peakSubtext } : {}),
    // All-day max pop (every slot, including night) — the
    // day's highest 3-hour precipitation probability.
    popMax: Math.max(
      ...slots.map((slot) => slot.pop)
    ),
    solarOutlook,
    tempFlag: isHot
      ? isCold
        ? "both"
        : "hot"
      : isCold
        ? "cold"
        : null,
  };
}

const OUTLOOK_ORDER: Record<SolarOutlook, number> = {
  High: 2,
  Moderate: 1,
  Low: 0,
};

// ============================================================
// GET FORECAST
// ============================================================

export async function getForecast(
  lat: number,
  lon: number
): Promise<ForecastResult> {
  const response = await fetchForecastResponse(
    lat,
    lon
  );

  if (!response || !Array.isArray(response.list)) {
    throw new WeatherError(
      "invalid_response",
      weatherJson.messages.errors.invalid_response
    );
  }

  const tzRaw = (response as { city?: { timezone?: unknown } }).city
    ?.timezone;

  const tzOffsetSec =
    typeof tzRaw === "number" && Number.isFinite(tzRaw)
      ? Math.trunc(tzRaw)
      : null;

  const slots: ForecastSlot[] = [];

  for (const entry of response.list) {
    const slot = parseSlot(
      entry as ForecastApiEntry,
      tzOffsetSec,
    );

    if (slot) {
      slots.push(slot);
    }
  }

  if (slots.length === 0) {
    throw new WeatherError(
      "invalid_response",
      weatherJson.messages.errors.invalid_response
    );
  }

  const groups = new Map<string, ForecastSlot[]>();

  for (const slot of slots) {
    const group = groups.get(slot.date);

    if (group) {
      group.push(slot);
    } else {
      groups.set(slot.date, [slot]);
    }
  }

  // Today in the location's own timezone so the upcoming
  // strip starts tomorrow where the user is, not in UTC.
  const nowSec = Math.floor(Date.now() / 1000);

  const todayKey =
    tzOffsetSec !== null
      ? toDateKey(
          new Date((nowSec + tzOffsetSec) * 1000).getUTCFullYear(),
          new Date((nowSec + tzOffsetSec) * 1000).getUTCMonth() + 1,
          new Date((nowSec + tzOffsetSec) * 1000).getUTCDate(),
        )
      : (() => {
          const today = new Date();

          return toDateKey(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate(),
          );
        })();

  const upcoming = [...groups.entries()]
    .filter(([date]) => date > todayKey)
    .sort(([left], [right]) =>
      left < right ? -1 : 1
    )
    .slice(0, weatherJson.forecast.days - 1)
    .map(([date, daySlots]) =>
      summarizeDay(date, daySlots)
    );

  let bestSunDay: string | null = null;
  let bestScore = OUTLOOK_ORDER.Low;

  for (const day of upcoming) {
    const score = OUTLOOK_ORDER[day.solarOutlook];

    if (score > bestScore) {
      bestScore = score;
      bestSunDay = day.weekday;
    }
  }

  // A "best sun" marker is only meaningful when at least one
  // upcoming day beats Low.
  if (bestScore <= OUTLOOK_ORDER.Low) {
    bestSunDay = null;
  }

  const cityName =
    typeof response.city?.name === "string" &&
    response.city.name.trim().length > 0
      ? response.city.name.trim()
      : "";

  return {
    upcoming,
    bestSunDay,
    cityName,
    fetchedAt: new Date().toISOString(),
  };
}
