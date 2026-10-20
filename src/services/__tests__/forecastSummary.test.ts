import { formatForecastSummary } from "@/services/weatherConfig";

interface DayOverrides {
  weekday: string;
  isRainy?: boolean;
  isHighSun?: boolean;
  isCold?: boolean;
  isHot?: boolean;
}

function day(overrides: DayOverrides) {
  return {
    weekday: overrides.weekday,
    isRainy: overrides.isRainy ?? false,
    isHighSun: overrides.isHighSun ?? false,
    isCold: overrides.isCold ?? false,
    isHot: overrides.isHot ?? false,
  };
}

describe("formatForecastSummary", () => {
  test("counts rainy days when at least the cutoff are rainy", () => {
    const summary = formatForecastSummary([
      day({ weekday: "Mon", isRainy: true }),
      day({ weekday: "Tue", isRainy: true }),
      day({ weekday: "Wed" }),
      day({ weekday: "Thu", isHighSun: true }),
    ]);

    expect(summary).toBe(
      "2 rainy days ahead — keep the battery topped up.",
    );
  });

  test("names the best sun day when few rainy days", () => {
    const summary = formatForecastSummary([
      day({ weekday: "Mon", isRainy: true }),
      day({ weekday: "Tue", isHighSun: true }),
      day({ weekday: "Wed", isHighSun: true }),
      day({ weekday: "Thu" }),
    ]);

    expect(summary).toBe(
      "Best sun: Tue — good day to charge fully.",
    );
  });

  test("names the coolest day when no sun and no rain cluster", () => {
    const summary = formatForecastSummary([
      day({ weekday: "Mon" }),
      day({ weekday: "Tue", isCold: true }),
      day({ weekday: "Wed" }),
      day({ weekday: "Thu" }),
    ]);

    expect(summary).toBe("Coolest Tue.");
  });

  test("falls back to mixed skies when nothing stands out", () => {
    const summary = formatForecastSummary([
      day({ weekday: "Mon" }),
      day({ weekday: "Tue" }),
      day({ weekday: "Wed" }),
      day({ weekday: "Thu" }),
    ]);

    expect(summary).toBe(
      "Mixed skies — charge whenever the sun is out.",
    );
  });

  test("rainy wins over a bright day once the cutoff is hit", () => {
    const summary = formatForecastSummary([
      day({ weekday: "Mon", isRainy: true }),
      day({ weekday: "Tue", isRainy: true }),
      day({ weekday: "Wed", isHighSun: true }),
      day({ weekday: "Thu", isHighSun: true }),
    ]);

    expect(summary).toBe(
      "2 rainy days ahead — keep the battery topped up.",
    );
  });
});
