import weatherJson from "@/data/weather.json";
import {
  formatApiError,
  formatForecastDay,
  formatNetworkError,
  formatTimeoutError,
  peakOfDay,
  resolveCondition,
  scoreSolarDay,
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
  popMax: number;
  solarOutlook: SolarOutlook;
  tempFlag: TempFlag;
}

export interface ForecastResult {
  upcoming: DailyForecast[];
  bestSunDay: string | null;
  cityName: string;
  fetchedAt: string;
  // Today's remaining slots as an actual-temp range
  // (min temp_min / max temp_max + offset). Null when no
  // slots remain for today — the Today card then shows
  // the live temp alone. OWM values only, never local
  // running minima.
  todayRange: {
    tempMin: number;
    tempMax: number;
  } | null;
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
    peakOfDay(pool, (slot) => slot.hour) ??
    slots[0];

  // Stable OWM main group first (Clear/Clouds/Rain/...),
  // description keywords as fallback — same rule as Today.
  const peakResolved = resolveCondition(
    peak.description,
    peak.mainGroup,
  );

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
    peakDescription: peak.description,
    peakIcon: peakResolved.icon,
    peakSeverity: peakResolved.severity,
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

  // Today's remaining range from OWM slots alone (live
  // temp is folded in at display so the low can never sit
  // above the current temp). Null when nothing remains.
  const todaySlots =
    groups.get(todayKey) ?? [];

  const offsetC = getTempOffsetC();

  const todayRange =
    todaySlots.length > 0
      ? {
          tempMin: Math.round(
            Math.min(
              ...todaySlots.map(
                (slot) => slot.tempMin + offsetC,
              ),
            ),
          ),
          tempMax: Math.round(
            Math.max(
              ...todaySlots.map(
                (slot) => slot.tempMax + offsetC,
              ),
            ),
          ),
        }
      : null;

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
    todayRange,
  };
}
