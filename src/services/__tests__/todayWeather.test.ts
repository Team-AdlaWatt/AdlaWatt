import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

import {
  canRefreshToday,
  formatDataAge,
  heatIndexC,
  isStaleReading,
  resolveCondition,
  resolveFeelsLike,
} from "@/services/weatherConfig";
import {
  TODAY_CACHE_KEY,
  getWeather,
} from "@/services/weatherForecast";

// expo-location ships native code that does not exist under
// Jest, so every GPS entry point is a jest.fn() here.
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const mockLocation = Location as unknown as {
  requestForegroundPermissionsAsync: jest.Mock;
  hasServicesEnabledAsync: jest.Mock;
  getLastKnownPositionAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};

const mockFetch = jest.fn();

const owmOk = (
  overrides: Record<string, unknown> = {},
) => ({
  dt: 1729000000,
  main: { temp: 32.4, feels_like: 34.2 },
  weather: [
    {
      id: 803,
      main: "Clouds",
      description: "broken clouds",
      icon: "04d",
    },
  ],
  clouds: { all: 70 },
  name: "Malaybalay",
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();

  mockFetch.mockReset();

  global.fetch = mockFetch as unknown as typeof fetch;

  return AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================================
// MAIN-GROUP RESOLUTION
// ============================================================

describe("resolveCondition main group", () => {
  test("Rain group resolves before description keywords", () => {
    expect(
      resolveCondition("light rain", "Rain"),
    ).toEqual({
      icon: "rainy-outline",
      severity: "light",
    });
  });

  test("Clear group resolves to sun", () => {
    expect(
      resolveCondition("clear sky", "Clear"),
    ).toEqual({
      icon: "sunny-outline",
      severity: "clear",
    });
  });

  test("Clouds group resolves to cloudy", () => {
    expect(
      resolveCondition(
        "overcast clouds",
        "Clouds",
      ).severity,
    ).toBe("cloudy");
  });

  test("unknown group falls back to description keywords", () => {
    expect(
      resolveCondition(
        "moderate rain",
        "BogusGroup",
      ).severity,
    ).toBe("moderate");
  });

  test("omitted group keeps legacy behavior", () => {
    expect(
      resolveCondition("few clouds"),
    ).toEqual({
      icon: "partly-sunny-outline",
      severity: "cloudy",
    });
  });
});

// ============================================================
// COORDINATES: FAST PATH, ROUNDING, FALLBACK
// ============================================================

describe("getWeather coordinates", () => {
  const grantLocation = () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );

    mockLocation.hasServicesEnabledAsync.mockResolvedValue(
      true,
    );
  };

  test("reuses a recent fix, rounded to 3 decimals", async () => {
    grantLocation();

    mockLocation.getLastKnownPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: 8.36789,
          longitude: 124.87321,
        },
      },
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    await getWeather();

    expect(
      mockLocation.getCurrentPositionAsync,
    ).not.toHaveBeenCalled();

    const url = String(
      mockFetch.mock.calls[0]?.[0] ?? "",
    );

    expect(url).toContain("lat=8.368");
    expect(url).toContain("lon=124.873");
  });

  test("fresh option skips the last-known reuse", async () => {
    grantLocation();

    mockLocation.getLastKnownPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: 8.36789,
          longitude: 124.87321,
        },
      },
    );

    mockLocation.getCurrentPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: 8.1,
          longitude: 125.1,
        },
      },
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    await getWeather({ fresh: true });

    expect(
      mockLocation.getLastKnownPositionAsync,
    ).not.toHaveBeenCalled();

    expect(
      mockLocation.getCurrentPositionAsync,
    ).toHaveBeenCalled();

    const url = String(
      mockFetch.mock.calls[0]?.[0] ?? "",
    );

    expect(url).toContain("lat=8.1");
    expect(url).toContain("lon=125.1");
  });

  test("explicit coordinates skip every GPS lookup", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    await getWeather({
      coordinates: { lat: 8.5, lon: 125.5 },
    });

    expect(
      mockLocation.requestForegroundPermissionsAsync,
    ).not.toHaveBeenCalled();

    expect(
      mockLocation.getLastKnownPositionAsync,
    ).not.toHaveBeenCalled();

    expect(
      mockLocation.getCurrentPositionAsync,
    ).not.toHaveBeenCalled();

    const url = String(
      mockFetch.mock.calls[0]?.[0] ?? "",
    );

    expect(url).toContain("lat=8.5");
    expect(url).toContain("lon=125.5");
  });

  test("falls back to a fresh fix without a recent one", async () => {
    grantLocation();

    mockLocation.getLastKnownPositionAsync.mockResolvedValue(
      null,
    );

    mockLocation.getCurrentPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: 8.1,
          longitude: 125.1,
        },
      },
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    const data = await getWeather();

    expect(
      mockLocation.getCurrentPositionAsync,
    ).toHaveBeenCalled();

    expect(data.mainGroup).toBe("Clouds");
    expect(data.city).toBe("Malaybalay");
  });

  test("denial resolves to the Manolo Fortich fallback", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      { status: "denied" },
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    const data = await getWeather();

    expect(
      mockLocation.getCurrentPositionAsync,
    ).not.toHaveBeenCalled();

    const url = String(
      mockFetch.mock.calls[0]?.[0] ?? "",
    );

    expect(url).toContain("lat=8.37");
    expect(url).toContain("lon=124.87");
    expect(data.isFallback).toBe(true);
  });

  test("granted fix carries no fallback flag", async () => {
    grantLocation();

    mockLocation.getLastKnownPositionAsync.mockResolvedValue(
      null,
    );

    mockLocation.getCurrentPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: 8.1,
          longitude: 125.1,
        },
      },
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    const data = await getWeather();

    expect(data.isFallback).toBeUndefined();
  });
});

// ============================================================
// TODAY CACHE
// ============================================================

describe("getWeather cache", () => {
  const grantFresh = () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );

    mockLocation.hasServicesEnabledAsync.mockResolvedValue(
      true,
    );

    mockLocation.getLastKnownPositionAsync.mockResolvedValue(
      null,
    );

    mockLocation.getCurrentPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: 8.37,
          longitude: 124.87,
        },
      },
    );
  };

  test("seeds the cache on success, serves it on failure", async () => {
    grantFresh();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    const live = await getWeather();

    // No calibration offset (tempOffsetC 0): 32.4 -> 32, 34.2 -> 34
    expect(live.temperature).toBe(32);
    expect(live.feelsLike).toBe(34);
    expect(live.conditionId).toBe(803);
    expect(live.iconCode).toBe("04d");
    expect(live.rainMm).toBeNull();
    expect(live.cacheVersion).toBe(3);

    const stored = await AsyncStorage.getItem(
      TODAY_CACHE_KEY,
    );

    expect(stored).not.toBeNull();

    mockFetch.mockRejectedValueOnce(
      new Error("offline"),
    );

    const cached = await getWeather();

    expect(cached).toEqual(live);
  });

  test("humidity parses live and feels-like uses heat index", async () => {
    grantFresh();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () =>
        owmOk({
          main: {
            temp: 27.12,
            feels_like: 30.01,
            humidity: 80,
          },
        }),
    });

    const live = await getWeather({
      coordinates: { lat: 8.37, lon: 124.87 },
    });

    // 27C actual, heat-index feels ~30C, live humidity kept.
    expect(live.temperature).toBe(27);
    expect(live.feelsLike).toBeGreaterThanOrEqual(
      29,
    );
    expect(live.feelsLike).toBeLessThanOrEqual(
      31,
    );
    expect(live.humidity).toBe(80);
  });

  test("throws when nothing is cached and fetch fails", async () => {
    grantFresh();

    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
    });

    await expect(
      getWeather(),
    ).rejects.toThrow();
  });

  test("missing weather id is invalid and never cached", async () => {
    grantFresh();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () =>
        owmOk({
          weather: [
            {
              main: "Clouds",
              description: "broken clouds",
              icon: "04d",
            },
          ],
        }),
    });

    await expect(
      getWeather(),
    ).rejects.toThrow();

    expect(
      await AsyncStorage.getItem(TODAY_CACHE_KEY),
    ).toBeNull();
  });
});

// ============================================================
// OBSERVED-AT AGE
// ============================================================

describe("observedAt age", () => {
  test("owm dt becomes the observation time", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      { status: "denied" },
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    const data = await getWeather();

    expect(data.observedAt).toBe(
      1729000000 * 1000,
    );
  });

  test("missing dt falls back to the fetch time", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      { status: "denied" },
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () =>
        owmOk({ dt: undefined }),
    });

    const before = Date.now();
    const data = await getWeather();

    expect(
      typeof data.observedAt,
    ).toBe("number");

    expect(data.observedAt ?? 0).toBeGreaterThanOrEqual(
      before,
    );
  });
});

// ============================================================
// AGE LABEL / STALE RULE / REFRESH GUARD
// ============================================================

describe("formatDataAge", () => {
  const now = 1_729_000_000_000;

  test("just now under a minute", () => {
    expect(
      formatDataAge(now - 20_000, now),
    ).toBe("just now");
  });

  test("minutes under an hour", () => {
    expect(
      formatDataAge(now - 12 * 60000, now),
    ).toBe("12m ago");
  });

  test("hours beyond", () => {
    expect(
      formatDataAge(now - 125 * 60000, now),
    ).toBe("2h ago");
  });
});

describe("isStaleReading", () => {
  const now = 1_729_000_000_000;

  test("fresh reading is not stale", () => {
    expect(
      isStaleReading(now - 12 * 60000, now),
    ).toBe(false);
  });

  test("reading past 30 minutes is stale", () => {
    expect(
      isStaleReading(now - 45 * 60000, now),
    ).toBe(true);
  });

  test("missing timestamp counts as stale", () => {
    expect(
      isStaleReading(undefined, now),
    ).toBe(true);
  });
});

describe("canRefreshToday", () => {
  const now = 1_729_000_000_000;

  test("never attempted allows refresh", () => {
    expect(
      canRefreshToday(null, now),
    ).toBe(true);
  });

  test("recent attempt blocks refresh", () => {
    expect(
      canRefreshToday(now - 60_000, now),
    ).toBe(false);
  });

  test("old attempt allows refresh", () => {
    expect(
      canRefreshToday(now - 5 * 60000, now),
    ).toBe(true);
  });
});

// ============================================================
// HEAT INDEX (NOAA)
// ============================================================

describe("heatIndexC", () => {
  test("tropical humidity yields ~30C at 27C/80%", () => {
    const hi = heatIndexC(27, 80);

    expect(hi).not.toBeNull();
    expect(hi as number).toBeGreaterThan(29);
    expect(hi as number).toBeLessThan(31);
  });

  test("cool air returns null (below 80F)", () => {
    expect(heatIndexC(26, 80)).toBeNull();
  });

  test("dry air returns null (below 40% RH)", () => {
    expect(heatIndexC(32, 30)).toBeNull();
  });

  test("non-finite inputs return null", () => {
    expect(heatIndexC(NaN, 80)).toBeNull();
    expect(heatIndexC(30, NaN)).toBeNull();
  });
});

describe("resolveFeelsLike", () => {
  test("prefers heat index when valid", () => {
    const result = resolveFeelsLike(
      27.12,
      80,
      30.01,
    );

    expect(result).not.toBeNull();
    expect(result?.source).toBe("heat-index");
    expect(result?.value as number).toBeGreaterThan(
      29,
    );
  });

  test("falls back to OWM feels_like when too cool", () => {
    const result = resolveFeelsLike(
      24,
      80,
      25.5,
    );

    expect(result).toEqual({
      value: 25.5,
      source: "openweather",
    });
  });

  test("falls back to OWM feels_like without humidity", () => {
    const result = resolveFeelsLike(
      32.4,
      null,
      34.2,
    );

    expect(result).toEqual({
      value: 34.2,
      source: "openweather",
    });
  });

  test("returns null with neither source", () => {
    expect(
      resolveFeelsLike(32.4, null, null),
    ).toBeNull();
  });
});

// ============================================================
// RETRY (429/5xx only, never 401)
// ============================================================

describe("fetch retry", () => {
  const grantFresh = (
    lat: number = 8.37,
    lon: number = 124.87,
  ) => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );

    mockLocation.hasServicesEnabledAsync.mockResolvedValue(
      true,
    );

    mockLocation.getLastKnownPositionAsync.mockResolvedValue(
      null,
    );

    mockLocation.getCurrentPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: lat,
          longitude: lon,
        },
      },
    );
  };

  test("retries 429/5xx up to success", async () => {
    grantFresh();

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
      })
      .mockResolvedValue({
        ok: true,
        json: async () => owmOk(),
      });

    const data = await getWeather();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(data.city).toBe("Malaybalay");
  });

  test("401 fails immediately without retry", async () => {
    grantFresh();

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(
      getWeather(),
    ).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("network failure does not retry", async () => {
    grantFresh();

    mockFetch.mockRejectedValue(
      new Error("offline"),
    );

    await expect(
      getWeather(),
    ).rejects.toThrow("offline");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// SHARED IN-FLIGHT REQUEST
// ============================================================

describe("shared flight", () => {
  test("concurrent callers share one fetch", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );

    mockLocation.hasServicesEnabledAsync.mockResolvedValue(
      true,
    );

    mockLocation.getLastKnownPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: 8.37,
          longitude: 124.87,
        },
      },
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    const [first, second] = await Promise.all([
      getWeather(),
      getWeather(),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });
});

// ============================================================
// CACHE COORDS + DISTANCE RULE + COD
// ============================================================

describe("cache coords", () => {
  const grantFresh = (
    lat: number,
    lon: number,
  ) => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      { status: "granted" },
    );

    mockLocation.hasServicesEnabledAsync.mockResolvedValue(
      true,
    );

    mockLocation.getLastKnownPositionAsync.mockResolvedValue(
      null,
    );

    mockLocation.getCurrentPositionAsync.mockResolvedValue(
      {
        coords: {
          latitude: lat,
          longitude: lon,
        },
      },
    );
  };

  test("far fix ignores the cache", async () => {
    grantFresh(8.37, 124.87);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    await getWeather();

    grantFresh(9.0, 125.5);

    mockFetch.mockRejectedValue(
      new Error("offline"),
    );

    await expect(
      getWeather(),
    ).rejects.toThrow("offline");
  });

  test("legacy v1 cache is discarded", async () => {
    grantFresh(8.37, 124.87);

    await AsyncStorage.setItem(
      TODAY_CACHE_KEY,
      JSON.stringify({
        data: {
          temperature: 30,
          description: "clear sky",
          city: "Cached",
        },
        fetchedAt: Date.now(),
      }),
    );

    mockFetch.mockRejectedValue(
      new Error("offline"),
    );

    await expect(
      getWeather(),
    ).rejects.toThrow("offline");
  });

  test("non-200 cod never caches, serves cache instead", async () => {
    grantFresh(8.37, 124.87);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => owmOk(),
    });

    await getWeather();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () =>
        owmOk({ cod: 404 }),
    });

    const data = await getWeather();

    expect(data.city).toBe("Malaybalay");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
