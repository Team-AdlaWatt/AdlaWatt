export const PIN_LENGTH = 4;

export const REPEATED_PINS = [
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
] as const;

export const SEQUENTIAL_PINS = [
  "0123",
  "1234",
  "2345",
  "3456",
  "4567",
  "5678",
  "6789",
  "3210",
  "4321",
  "5432",
  "6543",
  "7654",
  "8765",
  "9876",
] as const;

const REPEATED_PIN_SET = new Set<string>(REPEATED_PINS);
const SEQUENTIAL_PIN_SET = new Set<string>(SEQUENTIAL_PINS);

export type PinErrorCode =
  | "pinRequired"
  | "pinNumbersOnly"
  | "pinLength"
  | "pinWeak"
  | "pinMismatch";

export type PinValidationResult =
  | { valid: true }
  | { valid: false; error: PinErrorCode };

export const sanitizePinInput = (raw: string): string =>
  raw.replace(/[^0-9]/g, "").slice(0, PIN_LENGTH);

export const isRepeatedPin = (pin: string): boolean =>
  REPEATED_PIN_SET.has(pin);

export const isSequentialPin = (pin: string): boolean =>
  SEQUENTIAL_PIN_SET.has(pin);

export const validatePin = (
  pin: string,
): PinValidationResult => {
  if (!pin) {
    return { valid: false, error: "pinRequired" };
  }

  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: "pinNumbersOnly" };
  }

  if (pin.length !== PIN_LENGTH) {
    return { valid: false, error: "pinLength" };
  }

  if (isRepeatedPin(pin) || isSequentialPin(pin)) {
    return { valid: false, error: "pinWeak" };
  }

  return { valid: true };
};

export const validatePinPair = (
  pin: string,
  confirmPin: string,
): PinValidationResult => {
  if (pin !== confirmPin) {
    return { valid: false, error: "pinMismatch" };
  }

  return { valid: true };
};
