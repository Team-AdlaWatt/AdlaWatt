import * as Location from "expo-location";

import AsyncStorage from "@react-native-async-storage/async-storage";

import weatherJson from "@/data/weather.json";
import {
  formatApiError,
  formatCoordFallback,
  formatNetworkError,
  formatTimeoutError,
  roundTemperature,
} from "@/services/weatherConfig";

// ============================================================
// OPENWEATHER WEATHER FETCHER
//
// Pure logic — no UI, no hooks, no components.
//
// Flow:
//   1. Validate the OpenWeather API key.
//   2. Request foreground location permission.
//   3. Read the current GPS coordinates (balanced accuracy).
//   4. Call OpenWeatherMap Current Weather:
//      /data/2.5/weather?lat={lat}&lon={lon}&appid={key}&units=metric
//   5. Validate the response and map it to WeatherData.
// ============================================================

// The API key is declared in .env / .env.local as
// EXPO_PUBLIC_OWM_KEY and is inlined at build time.
// Endpoint, units, and timeout come from weather.json.
const OPEN_WEATHER_APP_ID =
  process.env.EXPO_PUBLIC_OWM_KEY;

const CURRENT_WEATHER_URL =
  weatherJson.api.currentUrl;

const UNITS = weatherJson.api.units;

/*
 * Every network call is aborted after this long so the weather
 * fetch never hangs on a slow or dead connection. The abort is
 * caught and re-thrown as a descriptive timeout error so the
 * raw "AbortError: signal is aborted without reason" never
 * reaches the console.
 */
const REQUEST_TIMEOUT_MS = weatherJson.api.timeoutMs;

// ============================================================
// TYPES
// ============================================================

export interface Coordinates {
  lat: number;
  lon: number;
  // True when the household fallback cell stands in for a
  // denied GPS fix (rendered as a default-location label).
  isFallback?: boolean;
}

export interface WeatherData {
  temperature: number;
  // OWM `main.feels_like` (°C, 1-decimal). Optional so v2
  // caches without it still validate and render.
  feelsLike?: number;
  description: string;
  city: string;
  // Stable OpenWeather group (Clear, Clouds, Rain, ...).
  // Kept for context; the Today card classifies by
  // conditionId, never by this string.
  mainGroup?: string;
  // OWM `dt` (ms): when the reading was made — the truthful
  // basis for "Updated Xm ago". Absent on legacy payloads.
  observedAt?: number;
  // True when the reading covers the fallback cell rather
  // than the user's own fix.
  isFallback?: boolean;
  // OWM weather[0].id: the Today card's main
  // classification. Required on fresh readings (cache v2).
  conditionId: number;
  // OWM weather[0].icon: day/night suffix + icon lookup.
  // Required on fresh readings.
  iconCode: string;
  // Measured rain (mm) from rain["1h"] ?? rain["3h"].
  // Null when the response carries no amount — never 0.
  rainMm: number | null;
  cacheVersion: number;
}

export const TODAY_CACHE_VERSION = 3;

export type WeatherErrorCode =
  | "missing_key"
  | "permission_denied"
  | "location_unavailable"
  | "api"
  | "timeout"
  | "network"
  | "invalid_response";

export class WeatherError extends Error {
  readonly code: WeatherErrorCode;

  constructor(
    code: WeatherErrorCode,
    message: string
  ) {
    super(message);

    this.name = "WeatherError";

    this.code = code;
  }
}

// ============================================================
// API KEY VALIDATION
//
// Runs before any other logic so a missing key fails with a
// clear message instead of a confusing 401 from OpenWeather.
// ============================================================

function validateApiKey(): void {
  if (
    !OPEN_WEATHER_APP_ID ||
    OPEN_WEATHER_APP_ID.trim().length === 0
  ) {
    throw new WeatherError(
      "missing_key",
      weatherJson.messages.errors.missing_key
    );
  }
}

// ============================================================
// LOCATION
//
// Denial resolves to the fixed household fallback cell
// (Manolo Fortich) so the Today card always paints useful
// sky instead of an error. Coordinates round to the
// configured decimals: same OWM cell, less GPS drift noise.
// ============================================================

function roundCoord(value: number): number {
  const factor =
    10 ** weatherJson.location.coordDecimals;

  return Math.round(value * factor) / factor;
}

function fallbackCoordinates(): Coordinates {
  return {
    lat: weatherJson.location.fallbackLat,
    lon: weatherJson.location.fallbackLon,
  };
}

async function getCoordinates(options?: {
  fresh?: boolean;
}): Promise<Coordinates> {
  const { status } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    console.warn(
      "Location denied — using Manolo Fortich fallback.",
    );

    return {
      ...fallbackCoordinates(),
      isFallback: true,
    };
  }

  const servicesEnabled =
    await Location.hasServicesEnabledAsync();

  if (!servicesEnabled) {
    throw new WeatherError(
      "location_unavailable",
      weatherJson.messages.errors.services_disabled
    );
  }

  // Fast path: indoor GPS can be slow, so reuse a recent
  // fix before paying for a fresh one. Manual refresh
  // passes fresh:true to skip this and force a new fix.
  if (!options?.fresh) {
    try {
      const lastKnown =
        await Location.getLastKnownPositionAsync({
          maxAge:
            weatherJson.location.lastKnownMaxAgeMs,
        });

      const known = lastKnown?.coords;

      if (
        known &&
        Number.isFinite(known.latitude) &&
        Number.isFinite(known.longitude)
      ) {
        return {
          lat: roundCoord(known.latitude),
          lon: roundCoord(known.longitude),
        };
      }
    } catch {
      // Fall through to a fresh fix below.
    }
  }

  // Balanced accuracy: fast to resolve and battery-friendly.
  try {
    const location =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

    const {
      latitude,
      longitude,
    } = location.coords;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new WeatherError(
        "location_unavailable",
        weatherJson.messages.errors.invalid_coordinates
      );
    }

    return {
      lat: roundCoord(latitude),
      lon: roundCoord(longitude),
    };
  } catch (error) {
    if (error instanceof WeatherError) {
      throw error;
    }

    throw new WeatherError(
      "location_unavailable",
      weatherJson.messages.errors.location_unavailable
    );
  }
}

// ============================================================
// FETCH WITH TIMEOUT + RETRY
//
// Uses an AbortController so a hanging request is cancelled
// after REQUEST_TIMEOUT_MS. The abort is converted into a
// descriptive timeout error instead of a raw AbortError.
//
// Retry: HTTP 429 + 5xx only, up to 3 attempts ~1s apart.
// 401 (bad key), other 4xx, timeouts, and network errors
// fail immediately — retrying a bad key burns quota and
// retrying offline only delays the cache fallback.
// ============================================================

const MAX_FETCH_ATTEMPTS = 3;

const RETRY_DELAY_MS = 1000;

function isRetriableStatus(
  status: number,
): boolean {
  return (
    status === 429 ||
    (status >= 500 && status <= 599)
  );
}

const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

async function fetchCurrentWeather(
  coordinates: Coordinates,
  attempt: number = 1,
): Promise<unknown> {
  const params = new URLSearchParams({
    lat: coordinates.lat.toString(),
    lon: coordinates.lon.toString(),
    appid: OPEN_WEATHER_APP_ID as string,
    units: UNITS,
  });

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${CURRENT_WEATHER_URL}?${params.toString()}`,
      {
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      if (
        attempt < MAX_FETCH_ATTEMPTS &&
        isRetriableStatus(response.status)
      ) {
        await sleep(RETRY_DELAY_MS);

        return fetchCurrentWeather(
          coordinates,
          attempt + 1,
        );
      }

      throw new WeatherError(
        "api",
        formatApiError(response.status)
      );
    }

    try {
      return await response.json();
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

    // The AbortController fired the configured timeout.
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
// RESPONSE PARSING
// ============================================================

interface OpenWeatherCurrentResponse {
  cod?: unknown;
  dt?: unknown;
  weather?: {
    id?: unknown;
    main?: unknown;
    description?: unknown;
    icon?: unknown;
  }[];
  main?: {
    temp?: unknown;
    feels_like?: unknown;
  };
  clouds?: {
    all?: unknown;
  };
  rain?: {
    "1h"?: unknown;
    "3h"?: unknown;
  };
  name?: unknown;
}

function toFiniteNumber(
  value: unknown,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function toRainMm(
  rain: OpenWeatherCurrentResponse["rain"],
): number | null {
  const oneH = toFiniteNumber(rain?.["1h"]);
  const threeH = toFiniteNumber(rain?.["3h"]);

  if (oneH !== null && oneH >= 0) {
    return oneH;
  }

  if (threeH !== null && threeH >= 0) {
    return threeH;
  }

  return null;
}

// Local calibration offset (°C) from weather.json. Added to
// both temp and feels_like at parse time so the card and
// cache always see corrected values. Tune in JSON, no TS
// change needed.
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

function parseWeatherResponse(
  data: unknown,
  coordinates: Coordinates
): WeatherData {
  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new WeatherError(
      "invalid_response",
      weatherJson.messages.errors.invalid_response
    );
  }

  const payload =
    data as OpenWeatherCurrentResponse;

  // Belt-and-suspenders behind response.ok: an explicit
  // non-200 code means the body is an error document, never
  // a reading — reject before anything can be cached.
  if (
    payload.cod !== undefined &&
    payload.cod !== 200 &&
    payload.cod !== "200"
  ) {
    throw new WeatherError(
      "invalid_response",
      weatherJson.messages.errors.invalid_response
    );
  }

  const temperature =
    payload.main?.temp;

  const rawId = payload.weather?.[0]?.id;

  const rawIcon = payload.weather?.[0]?.icon;

  const rawMain =
    payload.weather?.[0]?.main;

  const description =
    payload.weather?.[0]?.description;

  if (
    typeof temperature !== "number" ||
    !Number.isFinite(temperature)
  ) {
    throw new WeatherError(
      "invalid_response",
      weatherJson.messages.errors.missing_temperature
    );
  }

  // The Today card classifies by weather[0].id. A reading
  // without it is unusable — reject before caching.
  const conditionId = toFiniteNumber(rawId);

  if (
    conditionId === null ||
    !Number.isInteger(conditionId)
  ) {
    throw new WeatherError(
      "invalid_response",
      weatherJson.messages.errors.invalid_response
    );
  }

  if (
    typeof rawIcon !== "string" ||
    rawIcon.trim().length === 0
  ) {
    throw new WeatherError(
      "invalid_response",
      weatherJson.messages.errors.invalid_response
    );
  }

  if (
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    throw new WeatherError(
      "invalid_response",
      weatherJson.messages.errors.missing_description
    );
  }

  const city =
    typeof payload.name === "string" &&
    payload.name.trim().length > 0
      ? payload.name.trim()
      : formatCoordFallback(
          coordinates.lat,
          coordinates.lon
        );

  const mainGroup =
    typeof rawMain === "string" &&
    rawMain.trim().length > 0
      ? rawMain.trim()
      : undefined;

  // OWM `dt` is unix seconds: when the reading was made.
  // Invalid values fall back to the fetch time in getWeather.
  const rawDt = payload.dt;

  const observedAt =
    typeof rawDt === "number" &&
    Number.isFinite(rawDt) &&
    rawDt > 0
      ? rawDt * 1000
      : undefined;

  const rainMm = toRainMm(payload.rain);

  const iconCode = (rawIcon as string).trim();

  // Feels-like is the primary display: present when OWM
  // sends a finite main.feels_like, otherwise omitted and
  // the card falls back to temperature.
  const rawFeelsLike = toFiniteNumber(
    payload.main?.feels_like,
  );

  const offsetC = getTempOffsetC();

  const feelsLike =
    rawFeelsLike !== null
      ? roundTemperature(rawFeelsLike + offsetC)
      : undefined;

  return {
    temperature:
      roundTemperature(temperature + offsetC),
    ...(feelsLike !== undefined
      ? { feelsLike }
      : {}),
    description:
      description.trim(),
    city,
    ...(mainGroup
      ? { mainGroup }
      : {}),
    ...(observedAt
      ? { observedAt }
      : {}),
    ...(coordinates.isFallback
      ? { isFallback: true as const }
      : {}),
    conditionId,
    iconCode,
    rainMm,
    cacheVersion: TODAY_CACHE_VERSION,
  };
}

// ============================================================
// TODAY CACHE (v3)
//
// Write-through AsyncStorage copy of the last good reading.
// Served when the network, the API, or GPS fails so the
// Today card paints cached sky instead of going blank — the
// same offline pattern as the monitoring last-reading cache.
// Best-effort: a blocked store never breaks the fetch.
//
// v3 stores the id-based classifier fields (conditionId,
// iconCode, rainMm) plus feelsLike + calibration offset.
// Entries without cacheVersion 3 are legacy and are
// discarded, never classified.
// ============================================================

export const TODAY_CACHE_KEY =
  "adlawatt.weather.today.v3";

interface CachedTodayWeather {
  data: WeatherData;
  fetchedAt: number;
  cacheVersion: number;
  // Fix the reading was taken at. Entries written before
  // coords were stored omit it and still serve.
  lat?: number;
  lon?: number;
}

// ~5km degree box (0.05° lat ≈ 5.5km; lon similar near the
// equator). A fresh fix outside the cached cell ignores the
// cache so weather is never shown for the wrong place.
const CACHE_MAX_SHIFT_DEG = 0.05;

function readCacheCoords(
  parsed: Partial<CachedTodayWeather>,
): Pick<Coordinates, "lat" | "lon"> | null {
  if (
    typeof parsed.lat === "number" &&
    Number.isFinite(parsed.lat) &&
    typeof parsed.lon === "number" &&
    Number.isFinite(parsed.lon)
  ) {
    return {
      lat: parsed.lat,
      lon: parsed.lon,
    };
  }

  return null;
}

async function readTodayCache(): Promise<CachedTodayWeather | null> {
  try {
    const raw = await AsyncStorage.getItem(
      TODAY_CACHE_KEY,
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CachedTodayWeather>;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.data ||
      typeof parsed.data !== "object" ||
      typeof parsed.fetchedAt !== "number"
    ) {
      return null;
    }

    // Discard legacy entries: no version, older version, or
    // a payload without classifier fields. Never classify
    // legacy readings.
    if (
      parsed.cacheVersion !== TODAY_CACHE_VERSION
    ) {
      return null;
    }

    const data = parsed.data as Partial<WeatherData>;

    if (
      typeof data.conditionId !== "number" ||
      !Number.isFinite(data.conditionId) ||
      typeof data.iconCode !== "string" ||
      data.iconCode.trim().length === 0 ||
      typeof data.temperature !== "number" ||
      !Number.isFinite(data.temperature) ||
      typeof data.city !== "string"
    ) {
      return null;
    }

    // feelsLike stays optional: drop it when corrupt so a
    // bad cache value never reaches the card.
    const cached = parsed.data as WeatherData;

    if (
      cached.feelsLike !== undefined &&
      (typeof cached.feelsLike !== "number" ||
        !Number.isFinite(cached.feelsLike))
    ) {
      delete (cached as Partial<WeatherData>).feelsLike;
    }

    return {
      data: cached,
      fetchedAt: parsed.fetchedAt,
      cacheVersion: TODAY_CACHE_VERSION,
      ...(readCacheCoords(parsed) ?? {}),
    };
  } catch {
    return null;
  }
}

async function writeTodayCache(
  data: WeatherData,
  coordinates: Coordinates,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      TODAY_CACHE_KEY,
      JSON.stringify({
        data,
        fetchedAt: Date.now(),
        cacheVersion: TODAY_CACHE_VERSION,
        lat: coordinates.lat,
        lon: coordinates.lon,
      }),
    );
  } catch {
    // Intentionally ignored.
  }
}

declare const __DEV__: boolean | undefined;

function isDev(): boolean {
  try {
    return (
      typeof __DEV__ !== "undefined" && __DEV__
    );
  } catch {
    return false;
  }
}

function debugTodayReading(
  source: "live" | "cache",
  coordinates: Coordinates,
  raw: unknown,
  data: WeatherData,
): void {
  if (!isDev()) {
    return;
  }

  const payload = (raw ?? {}) as {
    weather?: { id?: unknown; main?: unknown; description?: unknown; icon?: unknown }[];
    main?: { temp?: unknown; feels_like?: unknown };
    clouds?: { all?: unknown };
    rain?: { "1h"?: unknown; "3h"?: unknown };
    name?: unknown;
    dt?: unknown;
  };

  const first = payload.weather?.[0];
  const ageMin =
    typeof data.observedAt === "number"
      ? Math.max(
          0,
          Math.round(
            (Date.now() - data.observedAt) / 60000,
          ),
        )
      : null;

  console.debug("[today-weather]", {
    source,
    lat: coordinates.lat,
    lon: coordinates.lon,
    gps: coordinates.isFallback
      ? "fallback-Manolo-Fortich"
      : "gps",
    name:
      typeof payload.name === "string"
        ? payload.name
        : data.city,
    dt: payload.dt ?? null,
    ageMin,
    id: first?.id ?? data.conditionId,
    main: first?.main ?? null,
    icon: first?.icon ?? data.iconCode,
    temp: payload.main?.temp ?? data.temperature,
    feelsLike:
      payload.main?.feels_like ?? data.feelsLike ?? null,
    clouds: payload.clouds?.all ?? null,
    rain1h: payload.rain?.["1h"] ?? null,
    rain3h: payload.rain?.["3h"] ?? null,
    rainMm: data.rainMm,
    fromCache: source === "cache",
  });
}

// ============================================================
// GET WEATHER
//
// Concurrent callers share one in-flight request, so an old
// response can never overwrite newer state or cache — there
// is only ever a single writer. A manual refresh passes
// fresh:true to force a new GPS fix + fetch even while
// another fetch is in flight.
// ============================================================

let inflightToday: Promise<WeatherData> | null =
  null;

export function getWeather(options?: {
  fresh?: boolean;
  // Explicit fix (e.g. one fresh fix shared with the forecast
  // leg). Bypasses the shared in-flight slot — a shared
  // response for different coordinates would paint the
  // wrong cell — and skips its own GPS lookup.
  coordinates?: Coordinates;
}): Promise<WeatherData> {
  if (options?.fresh || options?.coordinates) {
    inflightToday = runWeatherFetch(options).finally(
      () => {
        inflightToday = null;
      },
    );

    return inflightToday;
  }

  if (!inflightToday) {
    inflightToday = runWeatherFetch().finally(
      () => {
        inflightToday = null;
      },
    );
  }

  return inflightToday;
}

async function runWeatherFetch(options?: {
  fresh?: boolean;
  coordinates?: Coordinates;
}): Promise<WeatherData> {
  validateApiKey();

  const coordinates =
    options?.coordinates ??
    (await getCoordinates(options));

  try {
    const response =
      await fetchCurrentWeather(
        coordinates
      );

    const parsed = parseWeatherResponse(
      response,
      coordinates
    );

    const data: WeatherData =
      typeof parsed.observedAt === "number"
        ? parsed
        : {
            ...parsed,
            observedAt: Date.now(),
          };

    debugTodayReading(
      "live",
      coordinates,
      response,
      data,
    );

    await writeTodayCache(data, coordinates);

    return data;
  } catch (error) {
    // A missing key is a config bug, not weather — surface
    // it loudly instead of masking it with stale cache.
    if (
      error instanceof WeatherError &&
      error.code === "missing_key"
    ) {
      throw error;
    }

    const cached = await readTodayCache();

    if (cached) {
      if (
        cached.lat !== undefined &&
        cached.lon !== undefined &&
        (Math.abs(
          cached.lat - coordinates.lat,
        ) > CACHE_MAX_SHIFT_DEG ||
          Math.abs(
            cached.lon - coordinates.lon,
          ) > CACHE_MAX_SHIFT_DEG)
      ) {
        console.warn(
          "Cached weather is from >~5km away — ignoring.",
        );
      } else {
        const ageMin = Math.round(
          (Date.now() - cached.fetchedAt) / 60000,
        );

        console.warn(
          `Weather fetch failed — serving ${ageMin}m-old cache:`,
          error instanceof Error
            ? error.message
            : error,
        );

        debugTodayReading(
          "cache",
          coordinates,
          null,
          cached.data,
        );

        return cached.data;
      }
    }

    throw error;
  }
}

// ============================================================
// CURRENT COORDINATES
//
// Shared balanced-accuracy fix for consumers that need raw
// coordinates (e.g. the 5-day forecast) without fetching
// current weather.
// ============================================================

export async function getCurrentCoordinates(options?: {
  fresh?: boolean;
}): Promise<Coordinates> {
  validateApiKey();

  return getCoordinates(options);
}

// ============================================================
// CITY TEST PATH (TEST ONLY — NOT WIRED TO UI)
//
// Parallel `q={city}` fetch to compare accuracy against the
// GPS path above. The GPS flow is untouched and remains the
// live path: nothing here is called by the app.
// To undo: delete this block (and its forecast twin).
// To promote: rewire callers to pass city, then delete GPS.
// Uses a call-time API key (not the module const) so it can
// run outside the dummy-key jest setup.
// ============================================================

export const TEST_CITY_QUERY =
  "Manolo Fortich,PH";

export async function getWeatherByCityTest(
  query: string = TEST_CITY_QUERY,
): Promise<WeatherData> {
  const apiKey =
    process.env.EXPO_PUBLIC_OWM_KEY;

  if (
    !apiKey ||
    apiKey.trim().length === 0
  ) {
    throw new WeatherError(
      "missing_key",
      weatherJson.messages.errors.missing_key,
    );
  }

  const params = new URLSearchParams({
    q: query,
    appid: apiKey,
    units: UNITS,
  });

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `${CURRENT_WEATHER_URL}?${params.toString()}`,
      {
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new WeatherError(
        "api",
        formatApiError(response.status),
      );
    }

    const raw = await response.json();

    const parsed = parseWeatherResponse(
      raw,
      fallbackCoordinates(),
    );

    return typeof parsed.observedAt ===
      "number"
      ? parsed
      : {
          ...parsed,
          observedAt: Date.now(),
        };
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
        formatTimeoutError(),
      );
    }

    throw new WeatherError(
      "network",
      formatNetworkError(
        error instanceof Error
          ? error.message
          : "Network error.",
      ),
    );
  } finally {
    clearTimeout(timeout);
  }
}