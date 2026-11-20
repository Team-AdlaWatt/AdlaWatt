import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppState, Platform } from "react-native";
import { usePathname } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import {
  subscribeAlertVibration,
  type AlertVibrationTrigger,
} from "@/services/alertVibration";
import {
  loadMessagePanelIntroSeen,
  loadMessagePanelSetting,
  loadVibrationSetting,
  markMessagePanelIntroSeen,
  saveMessagePanelSetting,
} from "@/services/settings";
import { shouldShowVibrationGuidance } from "@/utils/vibrationGuidance";

export interface VibrationGuidanceState {
  visible: boolean;
  close: () => void;
  disableForever: () => void;
}

export function useVibrationGuidance(): VibrationGuidanceState {
  const { isSignedIn, user } = useAuth();
  const userId = user?.id ?? null;
  const pathname = usePathname();

  const [visibleForUser, setVisibleForUser] =
    useState<string | null>(null);

  const visible =
    isSignedIn &&
    userId !== null &&
    visibleForUser === userId;

  const shownThisSessionRef = useRef(false);
  const evaluatingRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const userIdRef = useRef<string | null>(userId);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (userIdRef.current !== userId) {
      userIdRef.current = userId;
      shownThisSessionRef.current = false;
    }

    if (!isSignedIn || !userId) {
      shownThisSessionRef.current = false;
      return;
    }

    let mounted = true;

    const handle = async (
      active: boolean,
      source: AlertVibrationTrigger,
    ) => {
      if (
        !mounted ||
        !active ||
        visibleForUser === userId ||
        evaluatingRef.current
      ) {
        return;
      }

      evaluatingRef.current = true;

      try {
        const [
          guidanceEnabled,
          vibrationEnabled,
          introSeen,
        ] = await Promise.all([
          loadMessagePanelSetting(),
          loadVibrationSetting(),
          loadMessagePanelIntroSeen(),
        ]);

        if (!mounted) {
          return;
        }

        const shouldShow =
          shouldShowVibrationGuidance({
            platformOS: Platform.OS,
            appState: AppState.currentState ?? "unknown",
            pathname: pathnameRef.current,
            guidanceEnabled,
            vibrationEnabled,
            introSeen,
            source,
            shownThisSession:
              shownThisSessionRef.current,
          });

        if (!shouldShow) {
          return;
        }

        shownThisSessionRef.current = true;

        if (!introSeen) {
          void markMessagePanelIntroSeen();
        }

        setVisibleForUser(userId);
      } finally {
        evaluatingRef.current = false;
      }
    };

    const unsubscribe = subscribeAlertVibration(
      (active, source) => {
        void handle(active, source);
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isSignedIn, userId, visibleForUser]);

  const close = useCallback(() => {
    setVisibleForUser(null);
  }, []);

  const disableForever = useCallback(() => {
    setVisibleForUser(null);
    void saveMessagePanelSetting(false);
  }, []);

  return { visible, close, disableForever };
}
