import * as Location from "expo-location";

import weatherJson from "@/data/weather.json";
import { requestManager } from "@/services/requestManager";
import { memoryCache, CACHE_TTL } from "@/services/memoryCache";
import {
  formatApiError,
  formatCoordFallback,
  formatLocalPlaceLabel,
  formatNetworkError,
  formatTimeoutError,
  getCoverageRadiusKm,
  getFeelsMode,
  getFeelsOffsetC,
  getLocalPlaces,
  resolveFeelsLike,
  roundTemperature,
  type FeelsLikeSource,
  type LocalPlace,
} from "@/services/weatherConfig";

// ============================================================
// OPENWEATHER WEATHER FETCHER
//
// Pure logic — no UI, no hooks, no components.
//
// Flow:
//   1. Validate the OpenWeather API key.
//   2. Request foreground location permission (re-asked on
//      every call — a denial is never cached in app state).
//      Denials and unavailable GPS throw; there is no
//      silent fallback point.
//   3. Read the current GPS coordinates (high accuracy) and
//      snap to the nearest configured Bukidnon sample within
//      the coverage radius; otherwise keep the raw fix.
//   4. Call OpenWeatherMap Current Weather:
//      /data/2.5/weather?lat={lat}&lon={lon}&appid={key}&units=metric
//   5. Validate the response and map it to WeatherData.
//
// No persistent cache: every reading is a live OpenWeather
// fetch. Failures throw so the UI can show an error state
// instead of stored data.
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
}

export interface WeatherData {
  temperature: number;
  // OWM `main.feels_like` (°C, 1-decimal). Optional: absent
  // when the response carries no usable value.
  feelsLike?: number;
  // Which path produced feelsLike: NOAA heat index from live
  // temp + humidity, or live OWM `feels_like`. Persisted with
  // the reading so logs stay conclusive.
  feelsSource?: FeelsLikeSource;
  // OWM `main.humidity` (%, 0-100). Optional like
  // feelsLike: shown with the feels-like line when present.
  humidity?: number;
  description: string;
  city: string;
  // True when no configured Bukidnon sample is within the
  // coverage radius, so the raw GPS fix and OpenWeather city
  // are used instead of a local place label.
  outsideScope: boolean;
  // Matched weather.json location id when the fix snapped to
  // a configured Bukidnon sample.
  localPlaceId?: string;
  // Stable OpenWeather group (Clear, Clouds, Rain, ...).
  // Kept for context; the Today card classifies by
  // conditionId, never by this string.
  mainGroup?: string;
  // OWM `dt` (ms): when the reading was made — the truthful
  // basis for "Updated Xm ago". Absent on malformed payloads.
  observedAt?: number;
  // OWM weather[0].id: the Today card's main classification.
  conditionId: number;
  // OWM weather[0].icon: day/night suffix + icon lookup.
  iconCode: string;
  // Measured rain (mm) from rain["1h"] ?? rain["3h"].
  // Null when the response carries no amount — never 0.
  rainMm: number | null;
}

export type WeatherErrorCode =
  | "missing_key"
  | "permission_denied"
  | "services_disabled"
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
// LOCATION (LIVE GPS, BUKIDNON SAMPLE SNAP)
//
// Each fetch uses the device's current GPS fix. Inside the
// configured Bukidnon coverage radius, OpenWeather is asked
// for the nearest sample's exact coordinates so current
// weather and forecast stay on the same area. Outside
// coverage, the raw fix is used and the UI shows a soft
// notice. Permission is re-requested on every call (the OS
// shows the dialog only while undetermined; once denied, the
// UI routes the user to app settings). Denied permission,
// disabled services, or a failed fix throw a descriptive
// WeatherError so the card can show a location error state
// instead of another city's weather.
//
// Coordinates round to coordDecimals (4 ≈ 11 m).
// ============================================================

function roundCoord(value: number): number {
  const factor =
    10 ** weatherJson.location.coordDecimals;

  return Math.round(value * factor) / factor;
}

// ============================================================
// LOCATION CHANGE DETECTION (HAVERSINE)
//
// Pure geometry helpers: distance between two fixes in km
// and a >=1km "user moved" predicate. The last successful fix
// of the session is kept in memory for change detection.
// ============================================================

const LOCATION_CHANGE_THRESHOLD_KM =
  typeof weatherJson.location.changeThresholdKm ===
    "number" &&
  Number.isFinite(weatherJson.location.changeThresholdKm)
    ? weatherJson.location.changeThresholdKm
    : 1;

const EARTH_RADIUS_KM = 6371.0088;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
  a: Coordinates,
  b: Coordinates,
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      sinLon * sinLon;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.asin(Math.min(1, Math.sqrt(h)))
  );
}

export function detectLocationChange(
  prev: Coordinates | null,
  next: Coordinates,
): boolean {
  if (!prev) {
    return true;
  }

  return (
    haversineDistanceKm(prev, next) >=
    LOCATION_CHANGE_THRESHOLD_KM
  );
}

// ============================================================
// WEATHER LOCATION RESOLUTION
//
// Compare the live GPS fix with the configured Bukidnon
// samples. Inside the coverage radius, OpenWeather is queried
// at the sample's exact coordinates so current weather and
// forecast stay pinned to the same area. Outside coverage,
// the raw GPS fix is used and the UI shows the soft notice.
// ============================================================

export interface ResolvedWeatherLocation {
  fix: Coordinates;
  coordinates: Coordinates;
  place: LocalPlace | null;
  label: string | null;
  outsideScope: boolean;
  distanceKm: number;
}

export function resolveWeatherLocation(
  fix: Coordinates,
): ResolvedWeatherLocation {
  const radiusKm = getCoverageRadiusKm();

  let nearest: LocalPlace | null = null;
  let nearestKm = Number.POSITIVE_INFINITY;

  for (const place of getLocalPlaces()) {
    const km = haversineDistanceKm(fix, {
      lat: place.lat,
      lon: place.lon,
    });

    if (km < nearestKm) {
      nearest = place;
      nearestKm = km;
    }
  }

  if (nearest && nearestKm <= radiusKm) {
    return {
      fix,
      coordinates: {
        lat: nearest.lat,
        lon: nearest.lon,
      },
      place: nearest,
      label: formatLocalPlaceLabel(nearest),
      outsideScope: false,
      distanceKm: nearestKm,
    };
  }

  return {
    fix,
    coordinates: fix,
    place: null,
    label: null,
    outsideScope: true,
    distanceKm: nearestKm,
  };
}

// Last successful GPS fix of this app session (module scope:
// resets on app restart, never persisted).
let lastKnownLocation: Coordinates | null = null;

export function getLastKnownLocation(): Coordinates | null {
  return lastKnownLocation;
}

async function getCoordinates(_options?: {
  fresh?: boolean;
}): Promise<Coordinates> {
  const { status } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new WeatherError(
      "permission_denied",
      weatherJson.messages.errors.permission_denied,
    );
  }

  const servicesEnabled =
    await Location.hasServicesEnabledAsync();

  if (!servicesEnabled) {
    throw new WeatherError(
      "services_disabled",
      weatherJson.messages.errors.services_disabled,
    );
  }

  // A fresh high-accuracy fix so the reading tracks the
  // user's live location (no last-known reuse).
  try {
    const location =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

    const { latitude, longitude } =
      location.coords;

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      const coords: Coordinates = {
        lat: roundCoord(latitude),
        lon: roundCoord(longitude),
      };

      lastKnownLocation = coords;

      return coords;
    }
  } catch {
    // Falls through to the throw below.
  }

  throw new WeatherError(
    "location_unavailable",
    weatherJson.messages.errors.location_unavailable,
  );
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
// retrying offline only delays the error the UI shows.
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
    humidity?: unknown;
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
// both temp and feels_like at parse time so the card always
// sees corrected values. Tune in JSON, no TS change needed.
//
// Day/night offsets (tempOffsetDayC / tempOffsetNightC) apply
// to the Today card only; when both are 0 the base
// tempOffsetC is used (the value the forecast leg keeps using).
function getTempOffsetC(isDay?: boolean): number {
  const calibration = (
    weatherJson as unknown as {
      calibration?: {
        tempOffsetC?: unknown;
        tempOffsetDayC?: unknown;
        tempOffsetNightC?: unknown;
      };
    }
  ).calibration;

  const pick = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value)
      ? value
      : 0;

  const base = pick(calibration?.tempOffsetC);
  const day = pick(calibration?.tempOffsetDayC);
  const night = pick(calibration?.tempOffsetNightC);

  if (day === 0 && night === 0) {
    return base;
  }

  if (typeof isDay !== "boolean") {
    return base;
  }

  return isDay ? day : night;
}

function parseWeatherResponse(
  data: unknown,
  location: ResolvedWeatherLocation
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
  // a reading — reject it.
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
  // without it is unusable — reject it.
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
    location.label ??
    (typeof payload.name === "string" &&
    payload.name.trim().length > 0
      ? payload.name.trim()
      : formatCoordFallback(
          location.coordinates.lat,
          location.coordinates.lon
        ));

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

  // Feels-like is the secondary display below actual.
  // OWM `feels_like` reads low in humid tropics, so the
  // value is the NOAA heat index from live temp + live
  // humidity when valid, else live OWM `feels_like`.
  // Anything absent stays absent: no static fallback.
  const rawFeelsLike = toFiniteNumber(
    payload.main?.feels_like,
  );

  const rawHumidity = toFiniteNumber(
    payload.main?.humidity,
  );

  const humidity =
    rawHumidity !== null &&
    rawHumidity >= 0 &&
    rawHumidity <= 100
      ? Math.round(rawHumidity)
      : undefined;

  const isDay = !iconCode.endsWith("n");

  const offsetC = getTempOffsetC(isDay);

  const correctedTemp = temperature + offsetC;

  // feelsMode picks the source: "heat-index" (NOAA, from temp
  // + humidity) or "openweather" (OWM's own feels_like).
  const feelsMode = getFeelsMode();

  const resolvedFeels = resolveFeelsLike(
    correctedTemp,
    feelsMode === "openweather"
      ? null
      : (humidity ?? null),
    rawFeelsLike !== null
      ? rawFeelsLike + offsetC
      : null,
  );

  const feelsOffsetC = getFeelsOffsetC();

  const feelsLike =
    resolvedFeels !== null
      ? roundTemperature(
          resolvedFeels.value + feelsOffsetC,
        )
      : undefined;

  return {
    temperature:
      roundTemperature(correctedTemp),
    ...(feelsLike !== undefined
      ? { feelsLike }
      : {}),
    ...(resolvedFeels !== null
      ? { feelsSource: resolvedFeels.source }
      : {}),
    ...(humidity !== undefined
      ? { humidity }
      : {}),
    description:
      description.trim(),
    city,
    outsideScope: location.outsideScope,
    ...(location.place
      ? { localPlaceId: location.place.id }
      : {}),
    ...(mainGroup
      ? { mainGroup }
      : {}),
    ...(observedAt
      ? { observedAt }
      : {}),
    conditionId,
    iconCode,
    rainMm,
  };
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
  location: ResolvedWeatherLocation,
  raw: unknown,
  data: WeatherData,
): void {
  if (!isDev()) {
    return;
  }

  const payload = (raw ?? {}) as {
    weather?: { id?: unknown; main?: unknown; description?: unknown; icon?: unknown }[];
    main?: { temp?: unknown; feels_like?: unknown; humidity?: unknown };
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

  const parsed = data as Partial<WeatherData>;

  console.debug("[today-weather]", {
    lat: location.fix.lat,
    lon: location.fix.lon,
    requestLat: location.coordinates.lat,
    requestLon: location.coordinates.lon,
    place: location.place?.id ?? null,
    outsideScope: location.outsideScope,
    distanceKm: Number(
      location.distanceKm.toFixed(2),
    ),
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
    // Feels path diagnosis: raw OWM inputs plus which
    // rule produced the displayed feels-like.
    humidityRaw: payload.main?.humidity ?? null,
    humidity: parsed.humidity ?? null,
    feelsSource: parsed.feelsSource ?? null,
    parsedFeelsLike: data.feelsLike ?? null,
    clouds: payload.clouds?.all ?? null,
    rain1h: payload.rain?.["1h"] ?? null,
    rain3h: payload.rain?.["3h"] ?? null,
    rainMm: data.rainMm,
  });
}

// ============================================================
// GET WEATHER
//
// Concurrent callers share one in-flight request, so an old
// response can never overwrite newer state — there is only
// ever a single writer. A manual refresh passes fresh:true
// to force a new GPS fix + fetch even while another fetch is
// in flight.
//
// Every call is a live OpenWeather fetch; failures propagate
// to the caller (no stored reading is ever substituted).
// ============================================================

let inflightToday: Promise<WeatherData> | null =
  null;

export function getWeather(options?: {
  fresh?: boolean;
  // Explicit fix (e.g. one fresh fix shared with the forecast
  // leg). Bypasses the shared in-flight slot — a shared
  // response for different coordinates would paint the
  // wrong place — and skips its own GPS lookup.
  coordinates?: Coordinates;
}): Promise<WeatherData> {
  // Check memory cache for non-fresh requests
  if (!options?.fresh && !options?.coordinates) {
    const cacheKey = "weather:today:default";
    const cached = memoryCache.get<WeatherData>(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }
  }

  const fetcher = async () => {
    const result = await runWeatherFetch(options);
    // Cache non-fresh results
    if (!options?.fresh && !options?.coordinates) {
      memoryCache.set("weather:today:default", result, CACHE_TTL.WEATHER);
    }
    return result;
  };

  if (options?.fresh || options?.coordinates) {
    inflightToday = fetcher().finally(
      () => {
        inflightToday = null;
      },
    );

    return inflightToday;
  }

  if (!inflightToday) {
    inflightToday = fetcher().finally(
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

  const fix =
    options?.coordinates ??
    (await getCoordinates(options));

  const location =
    resolveWeatherLocation(fix);

  const response =
    await fetchCurrentWeather(
      location.coordinates,
    );

  const parsed = parseWeatherResponse(
    response,
    location,
  );

  const data: WeatherData =
    typeof parsed.observedAt === "number"
      ? parsed
      : {
          ...parsed,
          observedAt: Date.now(),
        };

  debugTodayReading(
    location,
    response,
    data,
  );

  return data;
}

// ============================================================
// CURRENT COORDINATES
//
// Shared high-accuracy fix for consumers that need raw
// coordinates (e.g. the 5-day forecast) without fetching
// current weather.
// ============================================================

export async function getCurrentCoordinates(options?: {
  fresh?: boolean;
}): Promise<Coordinates> {
  validateApiKey();

  return getCoordinates(options);
}