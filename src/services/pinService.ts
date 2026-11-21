import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";
import {
  sanitizePinInput,
  validatePin,
} from "@/lib/pinValidation";
import i18n from "@/services/i18n";

type PinResult =
  | { success: true; pin: string }
  | { success: false; error: string };

type VerifyResult =
  | { success: true }
  | { success: false; error: string };

interface DatabaseError {
  code?: unknown;
  message?: unknown;
}

const asDatabaseError = (
  error: unknown,
): DatabaseError | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  return error as DatabaseError;
};

const mapPinUpdateError = (error: unknown): string => {
  const dbError = asDatabaseError(error);
  const code =
    typeof dbError?.code === "string"
      ? dbError.code
      : "";
  const message =
    typeof dbError?.message === "string"
      ? dbError.message
      : "";

  if (
    code === "23505" ||
    message.includes("users_tft_pin_key")
  ) {
    return i18n.t("validation.pinAlreadyUsed");
  }

  if (
    message.includes("users_tft_pin_format_check")
  ) {
    return i18n.t("validation.pinNumbersOnly");
  }

  if (
    code === "23514" ||
    message.includes("users_tft_pin_not_weak_check")
  ) {
    return i18n.t("validation.pinWeak");
  }

  if (
    message.includes("Unable to allocate a unique TFT PIN")
  ) {
    return i18n.t("validation.pinUnavailable");
  }

  return i18n.t("menu.updateFailed");
};

export async function verifyPinPassword(
  password: string,
): Promise<VerifyResult> {
  if (!password) {
    return {
      success: false,
      error: i18n.t("menu.currentPasswordRequired"),
    };
  }

  const user = await getAuthenticatedUserSafe();

  if (!user) {
    return {
      success: false,
      error: i18n.t("common.authRequired"),
    };
  }

  if (!user.email) {
    return {
      success: false,
      error: i18n.t("menu.updateFailed"),
    };
  }

  try {
    const { error } =
      await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

    if (error) {
      return {
        success: false,
        error: i18n.t("pin.passwordInvalid"),
      };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: i18n.t("menu.updateFailedNow"),
    };
  }
}

export async function updateMyTftPin(
  pin: string,
): Promise<PinResult> {
  const cleanPin = sanitizePinInput(pin);
  const validation = validatePin(cleanPin);

  if (!validation.valid) {
    return {
      success: false,
      error: i18n.t(`validation.${validation.error}`),
    };
  }

  const user = await getAuthenticatedUserSafe();

  if (!user) {
    return {
      success: false,
      error: i18n.t("common.authRequired"),
    };
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .update({ tft_pin: cleanPin })
      .eq("id", user.id)
      .select("tft_pin")
      .single();

    if (error) {
      return {
        success: false,
        error: mapPinUpdateError(error),
      };
    }

    if (data?.tft_pin !== cleanPin) {
      return {
        success: false,
        error: i18n.t("menu.updateFailed"),
      };
    }

    return { success: true, pin: cleanPin };
  } catch (error) {
    return {
      success: false,
      error: mapPinUpdateError(error),
    };
  }
}
