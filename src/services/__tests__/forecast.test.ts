import { getForecast } from "@/services/forecast";

const mockFetch = jest.fn();

const RealDate = Date;

const entry = (overrides: Record<string, unknown> = {}) => ({
  dt: 1729051200,
  dt_txt: "2024-10-16 04:00:00",
  main: { temp: 30, temp_min: 28, temp_max: 32, humidity: 70 },
  weather: [
    { id: 800, main: "Clear", description: "clear sky", icon: "01d" },
  ],
  clouds: { all: 10 },
  pop: 0,
  ...overrides,
});

// Local-noon UTC stamp for a day offset from today in the
// location timezone (28800 = UTC+8 Philippines).
const localNoonDt = (dayOffset: number, tz: number): number => {
  const nowSec = Math.floor(Date.now() / 1000);
  const todayStartLocal =
    Math.floor((nowSec + tz) / 86400) * 86400 - tz;

  return todayStartLocal + dayOffset * 86400 + 12 * 3600;
};

beforeEach(() => {
  jest.clearAllMocks();

  mockFetch.mockReset();

  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();

  global.Date = RealDate;
});

describe("getForecast upcoming days", () => {
  test("excludes today, returns next days sorted from live OWM list", async () => {
    const tz = 28800;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [0, 1, 2, 3, 4, 5].map((offset) =>
          entry({
            dt: localNoonDt(offset, tz),
            dt_txt: "2024-10-16 04:00:00",
            main: {
              temp: 30 + offset,
              temp_min: 28 + offset,
              temp_max: 32 + offset,
              humidity: 70,
            },
          }),
        ),
        city: { name: "Malaybalay", timezone: tz },
      }),
    });

    const result = await getForecast(8.368, 124.873);

    // Today excluded, next 4 kept (forecast.days 5 - 1).
    expect(result.upcoming).toHaveLength(4);

    const dates = result.upcoming.map((day) => day.date);

    expect([...dates].sort()).toEqual(dates);

    expect(result.cityName).toBe(
      "Manolo Fortich, Bukidnon",
    );

    const url = String(
      mockFetch.mock.calls[0]?.[0] ?? "",
    );

    expect(url).toContain("lat=8.37");
    expect(url).toContain("lon=124.86");

    // No calibration offset (tempOffsetC 0 in weather.json).
    expect(result.upcoming[0].tempMax).toBe(32 + 1);
    expect(result.upcoming[0].tempMin).toBe(28 + 1);
  });

  test("keeps raw coordinates outside coverage", async () => {
    const tz = 28800;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [entry({ dt: localNoonDt(1, tz) })],
        city: { name: "Malaybalay", timezone: tz },
      }),
    });

    const result = await getForecast(8.5, 125.5);

    const url = String(
      mockFetch.mock.calls[0]?.[0] ?? "",
    );

    expect(url).toContain("lat=8.5");
    expect(url).toContain("lon=125.5");
    expect(result.cityName).toBe("Malaybalay");
  });

  test("peak label + icon come from the id classifier (confirmed rain)", async () => {
    const tz = 28800;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          entry({
            dt: localNoonDt(1, tz),
            weather: [
              {
                id: 500,
                main: "Rain",
                description: "clear sky",
                icon: "10d",
              },
            ],
            rain: { "3h": 0.6 },
            clouds: { all: 40 },
          }),
        ],
        city: { name: "Malaybalay", timezone: tz },
      }),
    });

    const result = await getForecast(8.368, 124.873);

    expect(result.upcoming).toHaveLength(1);

    // Same classifier as the Today card: measured rain
    // confirms the id, so the label is the real condition.
    expect(result.upcoming[0].peakDescription).toBe("Light rain");
    expect(result.upcoming[0].peakIcon).toBe("rainy-outline");
    expect(result.upcoming[0].peakSeverity).toBe("light");
    expect(result.upcoming[0].peakSubtext).toBeUndefined();
  });

  test("unconfirmed rain softens to 'possible' with subtext", async () => {
    const tz = 28800;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          entry({
            dt: localNoonDt(1, tz),
            weather: [
              {
                id: 500,
                main: "Rain",
                description: "light rain",
                icon: "10d",
              },
            ],
            // No rain amount -> not confirmed nearby.
            clouds: { all: 40 },
          }),
        ],
        city: { name: "Malaybalay", timezone: tz },
      }),
    });

    const result = await getForecast(8.368, 124.873);

    expect(result.upcoming[0].peakDescription).toBe("Rain possible");
    expect(result.upcoming[0].peakSubtext).toBe("Not confirmed nearby");
    expect(result.upcoming[0].peakSeverity).toBe("cloudy");
  });

  test("clear id 800 resolves to Sunny with the day icon", async () => {
    const tz = 28800;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          entry({
            dt: localNoonDt(1, tz),
            weather: [
              {
                id: 800,
                main: "Clear",
                description: "clear sky",
                icon: "01d",
              },
            ],
          }),
        ],
        city: { name: "Malaybalay", timezone: tz },
      }),
    });

    const result = await getForecast(8.368, 124.873);

    expect(result.upcoming[0].peakDescription).toBe("Sunny");
    expect(result.upcoming[0].peakIcon).toBe("sunny-outline");
  });

  test("popMax is the all-day max across night and day slots", async () => {
    const tz = 28800;
    const noon = localNoonDt(1, tz);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          entry({
            dt: noon,
            dt_txt: "2024-10-16 04:00:00",
            pop: 0.1,
          }),
          entry({
            // Night slot (00:00 local) with the highest pop.
            dt: noon - 12 * 3600,
            dt_txt: "2024-10-16 04:00:00",
            pop: 0.8,
          }),
        ],
        city: { name: "Malaybalay", timezone: tz },
      }),
    });

    const result = await getForecast(8.368, 124.873);

    expect(result.upcoming[0].popMax).toBeCloseTo(0.8);
  });

  test("slot without an id falls back to the keyword path", async () => {
    const tz = 28800;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          entry({
            dt: localNoonDt(1, tz),
            weather: [
              {
                main: "Rain",
                description: "moderate rain",
                icon: "10d",
              },
            ],
          }),
        ],
        city: { name: "Malaybalay", timezone: tz },
      }),
    });

    const result = await getForecast(8.368, 124.873);

    expect(result.upcoming[0].peakDescription).toBe(
      "moderate rain",
    );
    expect(result.upcoming[0].peakIcon).toBe("rainy-outline");
  });

  test("rejects invalid slots, throws when none remain", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          entry({ main: { temp_min: 1, temp_max: 2 } }),
          entry({ weather: [{ main: "Clear" }] }),
          entry({ dt: undefined, dt_txt: "bogus" }),
        ],
        city: { name: "Malaybalay", timezone: 28800 },
      }),
    });

    await expect(
      getForecast(8.368, 124.873),
    ).rejects.toThrow();
  });

  test("day condition prefers daytime slots over night extremes", async () => {
    const tz = 28800;
    const noon = localNoonDt(1, tz);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        list: [
          // Severe night storm (02:00 local) must not label
          // a solar-planning day when daytime is mild.
          entry({
            dt: noon - 10 * 3600,
            dt_txt: "2024-10-16 04:00:00",
            weather: [
              {
                id: 211,
                main: "Thunderstorm",
                description: "thunderstorm",
                icon: "11n",
              },
            ],
            clouds: { all: 90 },
          }),
          entry({
            dt: noon,
            dt_txt: "2024-10-16 04:00:00",
            weather: [
              {
                id: 800,
                main: "Clear",
                description: "clear sky",
                icon: "01d",
              },
            ],
            clouds: { all: 5 },
          }),
        ],
        city: { name: "Malaybalay", timezone: tz },
      }),
    });

    const result = await getForecast(8.368, 124.873);

    expect(result.upcoming).toHaveLength(1);
    expect(
      result.upcoming[0].peakSeverity,
    ).toBe("clear");
  });
});
