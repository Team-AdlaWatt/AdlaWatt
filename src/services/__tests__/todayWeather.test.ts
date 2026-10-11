import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

import { resolveCondition } from "@/services/weatherConfig";
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
