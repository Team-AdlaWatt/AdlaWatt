import { BATTERY_MAX_ELECTRONICS_W } from "@/constants/battery";

export const CUSTOM_ELECTRONICS_NAME_MIN_LENGTH = 3;
export const CUSTOM_ELECTRONICS_NAME_MAX_LENGTH = 30;

export const CUSTOM_ELECTRONICS_NAME_PATTERN =
  /^[A-Za-z][A-Za-z0-9 /&.'-]*$/;

export const CUSTOM_ELECTRONICS_NAME_MESSAGE =
  "Name must start with a letter and be 3–30 characters.";

export const CUSTOM_ELECTRONICS_HINT =
  "Name (3–30 characters) and both wattages are required. Max must be greater than min. Example: 15-25W.";

export const CUSTOM_ELECTRONICS_INCOMPLETE_WATTS_MESSAGE =
  "Enter a complete wattage interval, for example 15-25.";

export const CUSTOM_ELECTRONICS_WATTS_ORDER_MESSAGE =
  "Maximum wattage must be greater than minimum wattage.";

export type CustomWattInterval = {
  min: number;
  max: number;
};

export type CustomElectronicsValidation = {
  nameValid: boolean;
  wattsValid: boolean;
  valid: boolean;
  message: string | null;
  interval: CustomWattInterval | null;
};

export const sanitizeWattSide = (
  text: string,
): string | null => {
  const clean = text.replace(/-/g, "");

  if (clean === "") {
    return "";
  }

  if (!/^\d{0,3}(\.\d{0,2})?$/.test(clean)) {
    return null;
  }

  const intPart = clean.split(".")[0] ?? "";

  if (
    intPart !== "" &&
    Number(intPart) > BATTERY_MAX_ELECTRONICS_W
  ) {
    return null;
  }

  return clean;
};

export const isValidCustomElectronicsName = (
  name: string,
): boolean => {
  const trimmed = name.trim();

  return (
    trimmed.length >= CUSTOM_ELECTRONICS_NAME_MIN_LENGTH &&
    trimmed.length <= CUSTOM_ELECTRONICS_NAME_MAX_LENGTH &&
    CUSTOM_ELECTRONICS_NAME_PATTERN.test(trimmed)
  );
};

export const parseCustomWattInterval = (
  raw: string,
): CustomWattInterval | null => {
  const text = raw.trim();

  const match = text.match(
    /^(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)$/,
  );

  if (!match) {
    return null;
  }

  const min = Number(match[1]);
  const max = Number(match[2]);

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min < 1 ||
    max > BATTERY_MAX_ELECTRONICS_W ||
    min >= max
  ) {
    return null;
  }

  return { min, max };
};

const splitWattSides = (
  raw: string,
): [string, string] => {
  const text = raw.trim();
  const dash = text.indexOf("-");

  if (dash < 0) {
    return [text, ""];
  }

  return [
    text.slice(0, dash).trim(),
    text.slice(dash + 1).trim(),
  ];
};

export const validateCustomElectronics = (
  name: string,
  watts: string,
): CustomElectronicsValidation => {
  const nameValid = isValidCustomElectronicsName(name);
  const interval = parseCustomWattInterval(watts);
  const wattsValid = interval !== null;
  const text = watts.trim();

  let message: string | null = null;

  if (!nameValid) {
    message =
      name.trim().length === 0
        ? "Electronics name is required."
        : CUSTOM_ELECTRONICS_NAME_MESSAGE;
  } else if (!text) {
    message =
      "Minimum and maximum wattage are required.";
  } else {
    const [minRaw, maxRaw] = splitWattSides(text);

    if (!minRaw || !maxRaw) {
      message =
        "Enter both minimum and maximum wattage.";
    } else if (
      !/^\d+(?:\.\d{1,2})?$/.test(minRaw) ||
      !/^\d+(?:\.\d{1,2})?$/.test(maxRaw)
    ) {
      message =
        CUSTOM_ELECTRONICS_INCOMPLETE_WATTS_MESSAGE;
    } else {
      const min = Number(minRaw);
      const max = Number(maxRaw);

      if (
        min < 1 ||
        max > BATTERY_MAX_ELECTRONICS_W
      ) {
        message = `Wattage must be between 1W and ${BATTERY_MAX_ELECTRONICS_W}W.`;
      } else if (min >= max) {
        message =
          CUSTOM_ELECTRONICS_WATTS_ORDER_MESSAGE;
      } else if (!interval) {
        message =
          CUSTOM_ELECTRONICS_INCOMPLETE_WATTS_MESSAGE;
      }
    }
  }

  return {
    nameValid,
    wattsValid,
    valid: nameValid && wattsValid,
    message,
    interval,
  };
};
