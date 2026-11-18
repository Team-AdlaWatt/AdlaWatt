import { useEffect, useState } from "react";
import { useFonts } from "expo-font";

import {
  Inter_300Light,
  Inter_400Regular,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import {
  Roboto_300Light,
  Roboto_400Regular,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";

import { captureAppError } from "@/services/sentry";

// ============================================================
// APP FONTS
//
// Bundled display fonts for Typography preferences.
// System Default / Monospace / Serif need no bundle.
//
// Never block the app on a font failure: a corrupt bundle or
// a rejected load used to leave splash/auth/dashboard waiting
// forever (infinite spinner). Proceed with the platform
// fallback after a short grace period and report once.
// ============================================================

const FONT_FALLBACK_MS = 5000;

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_700Bold,
    Roboto_300Light,
    Roboto_400Regular,
    Roboto_700Bold,
  });

  const [timedOut, setTimedOut] =
    useState(false);

  useEffect(() => {
    if (loaded || error) {
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, FONT_FALLBACK_MS);

    return () => clearTimeout(timer);
  }, [loaded, error]);

  useEffect(() => {
    if (!error) {
      return;
    }

    console.warn(
      "[fonts] Bundled fonts failed to load; using the system fallback.",
    );
    captureAppError(error, {
      source: "fonts",
    });
  }, [error]);

  return loaded || Boolean(error) || timedOut;
}
