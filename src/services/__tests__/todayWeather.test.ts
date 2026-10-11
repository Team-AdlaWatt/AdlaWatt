import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

import {
  canRefreshToday,
  formatDataAge,
  isStaleReading,
  resolveCondition,
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
  main: { temp: 32.4 },
  weather: [
    {
      main: "Rain",
      description: "light rain",
    },
  ],
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

  test("reuses a recent fix, rounded to 2 decimals", async () => {
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

    expect(url).toContain("lat=8.37");
    expect(url).toContain("lon=124.87");
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

    expect(data.mainGroup).toBe("Rain");
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

    expect(live.temperature).toBe(32.4);

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
