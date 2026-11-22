import {
  evaluateBaselineRecoveryDwell,
  evaluateDwell,
  evaluateNewLoadDwell,
  getLoadExcessW,
  isLoadNearBaseline,
  isNewLoadDetected,
} from "@/services/loadDetection";

describe("load detection helpers", () => {
  test("measures excess above the 6 W baseline", () => {
    expect(getLoadExcessW(13)).toBe(7);
    expect(getLoadExcessW(12)).toBe(6);
    expect(getLoadExcessW(6)).toBe(0);
    expect(getLoadExcessW(null)).toBe(0);
  });

  test("detects only a 7 W or greater increase", () => {
    expect(isNewLoadDetected(12)).toBe(false);
    expect(isNewLoadDetected(13)).toBe(true);
    expect(isNewLoadDetected(30)).toBe(true);
  });

  test("recognizes baseline recovery within tolerance", () => {
    expect(isLoadNearBaseline(8)).toBe(true);
    expect(isLoadNearBaseline(9)).toBe(false);
    expect(isLoadNearBaseline(null)).toBe(false);
  });

  test("requires the full verification period", () => {
    expect(
      evaluateDwell(true, 1_000, 30_999).active,
    ).toBe(false);
    expect(
      evaluateDwell(true, 1_000, 31_000).active,
    ).toBe(true);
    expect(
      evaluateDwell(false, 1_000, 60_000),
    ).toEqual({
      active: false,
      startedAt: null,
    });
  });

  test("resets sustained detection when load drops", () => {
    const first = evaluateNewLoadDwell(
      15,
      null,
      1_000,
    );

    expect(first).toEqual({
      active: false,
      startedAt: 1_000,
    });

    const dropped = evaluateNewLoadDwell(
      12,
      first.startedAt,
      2_000,
    );

    expect(dropped).toEqual({
      active: false,
      startedAt: null,
    });
  });

  test("verifies sustained baseline recovery", () => {
    const started = evaluateBaselineRecoveryDwell(
      7,
      null,
      5_000,
    );

    expect(
      evaluateBaselineRecoveryDwell(
        8,
        started.startedAt,
        35_000,
      ).active,
    ).toBe(true);
  });
});
