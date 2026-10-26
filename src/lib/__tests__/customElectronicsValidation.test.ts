import {
  CUSTOM_ELECTRONICS_HINT,
  CUSTOM_ELECTRONICS_INCOMPLETE_WATTS_MESSAGE,
  CUSTOM_ELECTRONICS_NAME_MESSAGE,
  CUSTOM_ELECTRONICS_WATTS_ORDER_MESSAGE,
  isValidCustomElectronicsName,
  parseCustomWattInterval,
  sanitizeWattSide,
  validateCustomElectronics,
} from "@/lib/customElectronicsValidation";

describe("custom electronics validation", () => {
  test("accepts a 3-character and a 30-character name", () => {
    expect(isValidCustomElectronicsName("Fan")).toBe(
      true,
    );
    expect(
      isValidCustomElectronicsName("A".repeat(30)),
    ).toBe(true);
  });

  test("rejects names outside the 3-30 character limit", () => {
    expect(isValidCustomElectronicsName("Ab")).toBe(
      false,
    );
    expect(
      isValidCustomElectronicsName("A".repeat(31)),
    ).toBe(false);
  });

  test("requires a leading letter and allowed characters", () => {
    expect(isValidCustomElectronicsName("1Fan")).toBe(
      false,
    );
    expect(
      isValidCustomElectronicsName("Electric Fan"),
    ).toBe(true);
    expect(
      isValidCustomElectronicsName("Fan (Large)"),
    ).toBe(false);
  });

  test("trims names before checking length", () => {
    expect(
      isValidCustomElectronicsName("  Fan  "),
    ).toBe(true);
  });

  test("parses a valid ascending interval", () => {
    expect(parseCustomWattInterval("15-25")).toEqual({
      min: 15,
      max: 25,
    });
    expect(
      parseCustomWattInterval("15.5 - 25.75"),
    ).toEqual({ min: 15.5, max: 25.75 });
  });

  test("rejects equal, reversed, and out-of-range intervals", () => {
    expect(parseCustomWattInterval("20-20")).toBe(
      null,
    );
    expect(parseCustomWattInterval("25-15")).toBe(
      null,
    );
    expect(parseCustomWattInterval("0-15")).toBe(
      null,
    );
    expect(parseCustomWattInterval("15-757")).toBe(
      null,
    );
  });

  test("accepts the 1W and 756W boundaries", () => {
    expect(parseCustomWattInterval("1-756")).toEqual({
      min: 1,
      max: 756,
    });
  });

  test("sanitizes each wattage side", () => {
    expect(sanitizeWattSide("15.25")).toBe("15.25");
    expect(sanitizeWattSide("")).toBe("");
    expect(sanitizeWattSide("15.255")).toBe(null);
    expect(sanitizeWattSide("757")).toBe(null);
    expect(sanitizeWattSide("12-")).toBe("12");
  });

  test("reports empty name and empty wattage requirements", () => {
    expect(validateCustomElectronics("", "")).toMatchObject({
      valid: false,
      message: "Electronics name is required.",
    });

    expect(
      validateCustomElectronics("Fan", ""),
    ).toMatchObject({
      valid: false,
      message:
        "Minimum and maximum wattage are required.",
    });
  });

  test("reports invalid names and incomplete wattages", () => {
    expect(
      validateCustomElectronics("Ab", "15-25"),
    ).toMatchObject({
      valid: false,
      message: CUSTOM_ELECTRONICS_NAME_MESSAGE,
    });

    expect(
      validateCustomElectronics("Fan", "15-"),
    ).toMatchObject({
      valid: false,
      message:
        "Enter both minimum and maximum wattage.",
    });

    expect(
      validateCustomElectronics("Fan", "15.255-25"),
    ).toMatchObject({
      valid: false,
      message:
        CUSTOM_ELECTRONICS_INCOMPLETE_WATTS_MESSAGE,
    });
  });

  test("reports equal and reversed wattages", () => {
    expect(
      validateCustomElectronics("Fan", "20-20"),
    ).toMatchObject({
      valid: false,
      message:
        CUSTOM_ELECTRONICS_WATTS_ORDER_MESSAGE,
    });

    expect(
      validateCustomElectronics("Fan", "25-15"),
    ).toMatchObject({
      valid: false,
      message:
        CUSTOM_ELECTRONICS_WATTS_ORDER_MESSAGE,
    });
  });

  test("reports out-of-range wattages", () => {
    expect(
      validateCustomElectronics("Fan", "0-15"),
    ).toMatchObject({
      valid: false,
      message: "Wattage must be between 1W and 756W.",
    });

    expect(
      validateCustomElectronics("Fan", "15-757"),
    ).toMatchObject({
      valid: false,
      message: "Wattage must be between 1W and 756W.",
    });
  });

  test("accepts a complete valid form", () => {
    expect(
      validateCustomElectronics("Electric Fan", "15-25"),
    ).toMatchObject({
      nameValid: true,
      wattsValid: true,
      valid: true,
      message: null,
      interval: { min: 15, max: 25 },
    });
  });

  test("exports the default hint", () => {
    expect(CUSTOM_ELECTRONICS_HINT).toContain("3–30");
  });
});
