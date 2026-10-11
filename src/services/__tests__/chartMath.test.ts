// chartMath unit tests (pure helpers only — the theme hook
// and themed color resolver are UI concerns, not units).

import {
  CHART_HEIGHT,
  clampPercent,
  getChartColors,
  niceCeil,
} from "@/services/chartMath";
import { Colors } from "@/constants/colors";
import type { AppColors } from "@/hooks/useAppColors";

// Minimal theme objects: getChartColors only reads the
// palette fields, so tests supply those plus the hook
// wrapper fields via cast.
const lightTheme = {
  ...Colors.light,
  glass: Colors.glass,
  isDark: false,
  resolvedTheme: "light",
} as AppColors;

const darkTheme = {
  ...Colors.dark,
  glass: Colors.glassDark,
  isDark: true,
  resolvedTheme: "dark",
} as AppColors;

describe("clampPercent", () => {
  test("passes through in-range values", () => {
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(42.5)).toBe(42.5);
    expect(clampPercent(100)).toBe(100);
  });

  test("clamps outside 0-100", () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(120)).toBe(100);
  });

  test("non-finite input yields 0", () => {
    expect(clampPercent(NaN)).toBe(0);
    expect(clampPercent(Infinity)).toBe(0);
    expect(
      clampPercent(-Infinity),
    ).toBe(0);
  });
});

describe("niceCeil", () => {
  test("rounds up to 1/2/2.5/5/10 steps", () => {
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(1.2)).toBe(2);
    expect(niceCeil(2.3)).toBe(2.5);
    expect(niceCeil(3)).toBe(5);
    expect(niceCeil(7)).toBe(10);
    expect(niceCeil(90)).toBe(100);
    expect(niceCeil(210)).toBe(250);
  });

  test("exact steps stay put", () => {
    expect(niceCeil(10)).toBe(10);
    expect(niceCeil(100)).toBe(100);
  });

  test("non-positive or non-finite yields 1", () => {
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(-40)).toBe(1);
    expect(niceCeil(NaN)).toBe(1);
  });

  test("small fractions scale down", () => {
    expect(niceCeil(0.3)).toBeCloseTo(
      0.5,
    );
  });
});

describe("chart constants and themed colors", () => {
  test("chart height matches the shared layout constant", () => {
    // UI-STANDARDS.md baseline: 240 (was 190 pre-standards).
    expect(CHART_HEIGHT).toBe(240);
  });

  test("getChartColors resolves theme tokens", () => {
    const resolved = getChartColors(
      lightTheme,
    );

    expect(resolved.green).toBe(
      Colors.light.primary,
    );
    expect(resolved.red).toBe(
      Colors.light.error,
    );
    expect(resolved.muted).toBe(
      Colors.light.border,
    );

    const dark = getChartColors(
      darkTheme,
    );

    expect(dark.green).toBe(
      Colors.dark.primary,
    );
    expect(dark.grid).toBe(
      Colors.dark.chart.grid,
    );
  });
});
