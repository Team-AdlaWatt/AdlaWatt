import {
  classifyTodayById,
  resolveTodayDisplay,
} from "@/services/weatherConfig";

describe("classifyTodayById", () => {
  test("id 500 + rain.1h 0.6 -> Rain", () => {
    expect(
      classifyTodayById({
        id: 500,
        iconCode: "10d",
        rainMm: 0.6,
      }),
    ).toMatchObject({
      label: "Light rain",
      severity: "light",
      icon: "rainy-outline",
      isDay: true,
    });
  });

  test("id 500 + no rain field -> Rain possible + Not confirmed nearby", () => {
    expect(
      classifyTodayById({
        id: 500,
        iconCode: "10d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Rain possible",
      subtext: "Not confirmed nearby",
      severity: "cloudy",
      isDay: true,
    });
  });

  test("id 300 + no rain field -> Drizzle possible", () => {
    expect(
      classifyTodayById({
        id: 300,
        iconCode: "09d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Drizzle possible",
      subtext: "Not confirmed nearby",
    });
  });

  test("id 300 + rain amount -> Drizzle", () => {
    expect(
      classifyTodayById({
        id: 300,
        iconCode: "09d",
        rainMm: 0.4,
      }).label,
    ).toBe("Drizzle");
  });

  test("id 211 -> Thunderstorm even with no rain field", () => {
    expect(
      classifyTodayById({
        id: 211,
        iconCode: "11d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Thunderstorm",
      severity: "severe",
      icon: "thunderstorm-outline",
    });
  });

  test("id 501 -> Moderate rain, id 502 -> Heavy rain", () => {
    expect(
      classifyTodayById({
        id: 501,
        iconCode: "10d",
        rainMm: 3.0,
      }),
    ).toMatchObject({
      label: "Moderate rain",
      severity: "moderate",
    });

    expect(
      classifyTodayById({
        id: 502,
        iconCode: "10d",
        rainMm: 8.0,
      }),
    ).toMatchObject({
      label: "Heavy rain",
      severity: "severe",
    });
  });

  test("id 800 + 01d -> Sunny, never from description", () => {
    expect(
      classifyTodayById({
        id: 800,
        iconCode: "01d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Sunny",
      severity: "clear",
      icon: "sunny-outline",
      isDay: true,
    });
  });

  test("id 800 + 01n -> Clear, never Sunny", () => {
    const result = classifyTodayById({
      id: 800,
      iconCode: "01n",
      rainMm: null,
    });

    expect(result.label).toBe("Clear");
    expect(result.isDay).toBe(false);
    expect(result.icon).toBe("moon-outline");
  });

  test("id 801 + 02d -> Mostly sunny", () => {
    expect(
      classifyTodayById({
        id: 801,
        iconCode: "02d",
        rainMm: null,
      }).label,
    ).toBe("Mostly sunny");
  });

  test("id 801 + 02n -> Mostly clear", () => {
    expect(
      classifyTodayById({
        id: 801,
        iconCode: "02n",
        rainMm: null,
      }).label,
    ).toBe("Mostly clear");
  });

  test("id 802 + 03d -> Partly sunny", () => {
    expect(
      classifyTodayById({
        id: 802,
        iconCode: "03d",
        rainMm: null,
      }).label,
    ).toBe("Partly sunny");
  });

  test("id 803 -> Mostly cloudy", () => {
    expect(
      classifyTodayById({
        id: 803,
        iconCode: "04d",
        rainMm: null,
      }).label,
    ).toBe("Mostly cloudy");
  });

  test("id 804 -> Overcast", () => {
    expect(
      classifyTodayById({
        id: 804,
        iconCode: "04n",
        rainMm: null,
      }).label,
    ).toBe("Overcast");
  });

  test("id 721 -> Hazy", () => {
    expect(
      classifyTodayById({
        id: 721,
        iconCode: "50d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Hazy",
      severity: "fog",
    });
  });

  test("id 771 -> Squalls, not Hazy", () => {
    expect(
      classifyTodayById({
        id: 771,
        iconCode: "50d",
        rainMm: null,
      }).label,
    ).toBe("Squalls");
  });

  test("unknown id -> Condition unavailable", () => {
    const result = classifyTodayById({
      id: 999,
      iconCode: "50d",
      rainMm: null,
    });

    expect(result.label).toBe(
      "Condition unavailable",
    );
  });
});

describe("resolveTodayDisplay", () => {
  const fresh = {
    conditionId: 803,
    iconCode: "04d",
    rainMm: null,
    observedAt: Date.now(),
  };

  test("fresh reading resolves live", () => {
    const result = resolveTodayDisplay(fresh);

    expect(result.kind).toBe("live");

    if (result.kind === "live") {
      expect(result.classified.label).toBe(
        "Mostly cloudy",
      );
    }
  });

  test("legacy reading without classifier fields resolves neutral", () => {
    expect(
      resolveTodayDisplay(null).kind,
    ).toBe("neutral");
    expect(
      resolveTodayDisplay({}).kind,
    ).toBe("neutral");
  });

  test("reading older than 30 min resolves neutral", () => {
    const result = resolveTodayDisplay({
      ...fresh,
      observedAt: Date.now() - 31 * 60000,
    });

    expect(result.kind).toBe("neutral");
  });

  test("unconfirmed rain resolves live with possible label", () => {
    const result = resolveTodayDisplay({
      conditionId: 500,
      iconCode: "10d",
      rainMm: null,
      observedAt: Date.now(),
    });

    expect(result.kind).toBe("live");

    if (result.kind === "live") {
      expect(result.classified.label).toBe(
        "Rain possible",
      );
      expect(result.classified.subtext).toBe(
        "Not confirmed nearby",
      );
    }
  });
});
