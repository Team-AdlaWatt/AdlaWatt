import {
  prepareAnalyticsMetricChart,
} from "@/components/charts/AnalyticsMetricChart";

describe("prepareAnalyticsMetricChart", () => {
  test("returns a finite empty chart", () => {
    const result =
      prepareAnalyticsMetricChart([], 320);

    expect(result.isEmpty).toBe(true);
    expect(result.data).toEqual([
      { value: 0, label: "" },
      { value: 0, label: "" },
    ]);
    expect(Number.isFinite(result.spacing)).toBe(
      true,
    );
  });

  test("duplicates a single real bucket instead of creating infinite spacing", () => {
    const result =
      prepareAnalyticsMetricChart(
        [{ label: "Mon", value: 12.5 }],
        320,
      );

    expect(result.isEmpty).toBe(true);
    expect(result.data).toEqual([
      { value: 12.5, label: "Mon" },
      { value: 12.5, label: "" },
    ]);
    expect(Number.isFinite(result.spacing)).toBe(
      true,
    );
    expect(result.spacing).toBe(284);
  });

  test("keeps real buckets when there are two or more", () => {
    const result =
      prepareAnalyticsMetricChart(
        [
          { label: "Mon", value: 10 },
          { label: "Tue", value: 20 },
        ],
        320,
      );

    expect(result.isEmpty).toBe(false);
    expect(result.data).toEqual([
      { value: 10, label: "Mon" },
      { value: 20, label: "Tue" },
    ]);
    expect(result.spacing).toBe(284);
  });
});
