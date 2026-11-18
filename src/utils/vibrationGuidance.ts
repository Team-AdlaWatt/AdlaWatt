import { Routes } from "@/constants/routes";
import type { AlertVibrationTrigger } from "@/services/alertVibration";

export interface VibrationGuidanceGateInput {
  platformOS: string;
  appState: string;
  pathname: string;
  guidanceEnabled: boolean;
  vibrationEnabled: boolean;
  introSeen: boolean;
  source: AlertVibrationTrigger;
  shownThisSession: boolean;
}

export function shouldShowVibrationGuidance(
  input: VibrationGuidanceGateInput,
): boolean {
  if (input.platformOS === "web") {
    return false;
  }

  if (input.appState !== "active") {
    return false;
  }

  if (
    input.source !== "reenable" &&
    (input.pathname === Routes.NOTIFICATIONS ||
      input.pathname === Routes.MENU ||
      input.pathname === Routes.PREFERENCES)
  ) {
    return false;
  }

  if (
    !input.guidanceEnabled ||
    !input.vibrationEnabled
  ) {
    return false;
  }

  if (input.source === "reenable") {
    return true;
  }

  if (input.shownThisSession) {
    return false;
  }

  if (!input.introSeen) {
    return true;
  }

  return input.source === "insert";
}
