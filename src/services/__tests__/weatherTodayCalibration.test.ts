import { getWeather } from "@/services/weatherForecast";

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();

  global.fetch = mockFetch as unknown as typeof fetch;

  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      cod: 200,
      dt: 1729000000,
      weather: [
        {
          id: 803,
          main: "Clouds",
          description: "broken clouds",
          icon: "04d",
        },
      ],
      main: {
        temp: 27.66,
        feels_like: 30.26,
        humidity: 72,
      },
      name: "Damilag",
    }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("today-card calibration", () => {
  test("adds exactly 1C to temperature and feels-like", async () => {
    const weather = await getWeather({
      coordinates: { lat: 8.37, lon: 124.87 },
    });

    expect(weather.temperature).toBe(28);
    expect(weather.feelsLike).toBe(30);
    expect(weather.humidity).toBe(72);
  });
});
