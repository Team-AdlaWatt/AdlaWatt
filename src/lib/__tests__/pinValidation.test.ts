import {
  PIN_LENGTH,
  REPEATED_PINS,
  SEQUENTIAL_PINS,
  isRepeatedPin,
  isSequentialPin,
  sanitizePinInput,
  validatePin,
  validatePinPair,
} from "@/lib/pinValidation";

describe("PIN validation", () => {
  test("allows four digits with leading zeros", () => {
    expect(validatePin("0042")).toEqual({
      valid: true,
    });
    expect(validatePin("4829")).toEqual({
      valid: true,
    });
  });

  test("requires a PIN", () => {
    expect(validatePin("")).toEqual({
      valid: false,
      error: "pinRequired",
    });
  });

  test("rejects non-numeric input", () => {
    expect(validatePin("12a4")).toEqual({
      valid: false,
      error: "pinNumbersOnly",
    });
  });

  test("requires exactly four digits", () => {
    expect(validatePin("123")).toEqual({
      valid: false,
      error: "pinLength",
    });
    expect(validatePin("12345")).toEqual({
      valid: false,
      error: "pinLength",
    });
  });

  test("rejects every repeated PIN", () => {
    for (const pin of REPEATED_PINS) {
      expect(isRepeatedPin(pin)).toBe(true);
      expect(validatePin(pin)).toEqual({
        valid: false,
        error: "pinWeak",
      });
    }
  });

  test("rejects every sequential PIN", () => {
    for (const pin of SEQUENTIAL_PINS) {
      expect(isSequentialPin(pin)).toBe(true);
      expect(validatePin(pin)).toEqual({
        valid: false,
        error: "pinWeak",
      });
    }
  });

  test("does not ban wrap-around sequences", () => {
    expect(validatePin("7890")).toEqual({
      valid: true,
    });
    expect(validatePin("9012")).toEqual({
      valid: true,
    });
  });

  test("sanitizes non-digits and limits length", () => {
    expect(sanitizePinInput("12a4")).toBe("124");
    expect(sanitizePinInput("004256")).toBe("0042");
    expect(sanitizePinInput("abcd")).toBe("");
    expect(PIN_LENGTH).toBe(4);
  });

  test("rejects mismatched PIN confirmation", () => {
    expect(validatePinPair("4829", "4830")).toEqual({
      valid: false,
      error: "pinMismatch",
    });
    expect(validatePinPair("4829", "4829")).toEqual({
      valid: true,
    });
  });
});
