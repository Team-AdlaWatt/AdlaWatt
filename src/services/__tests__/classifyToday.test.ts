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

  test("id 801 + 02d -> Partly sunny", () => {
    expect(
      classifyTodayById({
        id: 801,
        iconCode: "02d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Partly sunny",
      icon: "partly-sunny-outline",
    });
  });

  test("id 801 + 02n -> Partly cloudy", () => {
    expect(
      classifyTodayById({
        id: 801,
        iconCode: "02n",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Partly cloudy",
      icon: "cloudy-night-outline",
    });
  });

  test("id 802 + 03d -> Partly Cloudy", () => {
    expect(
      classifyTodayById({
        id: 802,
        iconCode: "03d",
        rainMm: null,
      }).label,
    ).toBe("Partly Cloudy");
  });

  test("id 803 -> Mostly Cloudy", () => {
    expect(
      classifyTodayById({
        id: 803,
        iconCode: "04d",
        rainMm: null,
      }).label,
    ).toBe("Mostly Cloudy");
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

  test("id 721 -> Haze", () => {
    expect(
      classifyTodayById({
        id: 721,
        iconCode: "50d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Haze",
      severity: "fog",
      icon: "cloud-outline",
    });
  });

  test("id 771 -> Squalls, not Haze", () => {
    expect(
      classifyTodayById({
        id: 771,
        iconCode: "50d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Squalls",
      severity: "severe",
    });
  });

  test("id 781 -> Tornado, never fog", () => {
    expect(
      classifyTodayById({
        id: 781,
        iconCode: "50d",
        rainMm: null,
      }),
    ).toMatchObject({
      label: "Tornado",
      severity: "severe",
    });
  });

  test("id 511 -> Freezing rain (not Heavy rain)", () => {
    expect(
      classifyTodayById({
        id: 511,
        iconCode: "10d",
        rainMm: 1.0,
      }),
    ).toMatchObject({
      label: "Freezing rain",
      severity: "severe",
      icon: "rainy-outline",
    });
  });

  test("shower intensities: 520 light, 521 moderate, 522 severe, 531 moderate", () => {
    expect(
      classifyTodayById({ id: 520, iconCode: "09d", rainMm: 1.0 })
        .severity,
    ).toBe("light");
    expect(
      classifyTodayById({ id: 521, iconCode: "09d", rainMm: 2.0 })
        .severity,
    ).toBe("moderate");
    expect(
      classifyTodayById({ id: 522, iconCode: "09d", rainMm: 8.0 })
        .severity,
    ).toBe("severe");
    expect(
      classifyTodayById({ id: 531, iconCode: "09d", rainMm: 2.0 })
        .severity,
    ).toBe("moderate");
  });

  test("icon matches classification (rain -> rainy, clear day -> sunny)", () => {
    expect(
      classifyTodayById({
        id: 500,
        iconCode: "10d",
        rainMm: 1.0,
      }).icon,
    ).toBe("rainy-outline");

    expect(
      classifyTodayById({
        id: 800,
        iconCode: "01d",
        rainMm: null,
      }).icon,
    ).toBe("sunny-outline");

    expect(
      classifyTodayById({
        id: 800,
        iconCode: "01n",
        rainMm: null,
      }).icon,
    ).toBe("moon-outline");
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
        "Mostly Cloudy",
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
