import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import { useMonitoringContext } from "@/context/MonitoringContext";
import {
  ENERGY_RECOVERY_RATIO,
  computeBatteryEnergy,
} from "@/services/batteryEnergy";
import {
  deriveProtectionState,
} from "@/services/batteryProtection";
import {
  evaluateDwell,
  isLoadNearBaseline,
} from "@/services/loadDetection";

type CriticalWarningContextValue = {
  active: boolean;
  recovering: boolean;
};

type CriticalWarningState = {
  active: boolean;
  recovering: boolean;
};

type CriticalWarningAction =
  | "critical"
  | "idle"
  | "recovering"
  | "cleared";

const CriticalWarningContext =
  createContext<CriticalWarningContextValue | null>(
    null,
  );

const FALLBACK: CriticalWarningContextValue = {
  active: false,
  recovering: false,
};

const reducer = (
  state: CriticalWarningState,
  action: CriticalWarningAction,
): CriticalWarningState => {
  switch (action) {
    case "critical":
      return { active: true, recovering: false };
    case "idle":
      return state.recovering
        ? { active: true, recovering: false }
        : state;
    case "recovering":
      return state.recovering
        ? state
        : { active: true, recovering: true };
    case "cleared":
      return { active: false, recovering: false };
  }
};

export function CriticalWarningProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    monitoring,
    deviceOnline,
  } = useMonitoringContext();
  const [state, dispatch] = useReducer(reducer, {
    active: false,
    recovering: false,
  });
  const recoverySinceRef = useRef<number | null>(
    null,
  );

  const batteryEnergy = useMemo(
    () =>
      computeBatteryEnergy({
        wattHours:
          monitoring?.watt_hours ?? null,
        batteryLevel:
          monitoring?.battery_level ?? null,
        deviceOnline,
        lastUpdated:
          deviceOnline && monitoring?.last_seen
            ? Date.parse(monitoring.last_seen)
            : null,
      }),
    [deviceOnline, monitoring],
  );

  const critical = useMemo(() => {
    if (batteryEnergy.status === "waiting") {
      return false;
    }

    const protection = deriveProtectionState({
      energy: batteryEnergy,
      voltage: monitoring?.voltage ?? null,
      dodStatus:
        monitoring?.dod_status ?? null,
      currentLoadW:
        monitoring?.current_load ?? null,
      selectedBatterySideW: 0,
    });

    return protection.level === "critical";
  }, [batteryEnergy, monitoring]);

  useEffect(() => {
    if (critical) {
      recoverySinceRef.current = null;
      dispatch("critical");
      return;
    }

    if (!state.active) {
      return;
    }

    const energyRecovered =
      batteryEnergy.usablePercent >=
      ENERGY_RECOVERY_RATIO * 100;
    const loadRecovered = isLoadNearBaseline(
      monitoring?.current_load,
    );

    if (!energyRecovered || !loadRecovered) {
      recoverySinceRef.current = null;
      dispatch("idle");
      return;
    }

    const result = evaluateDwell(
      true,
      recoverySinceRef.current,
      Date.now(),
    );

    recoverySinceRef.current = result.startedAt;
    dispatch("recovering");

    if (result.active) {
      recoverySinceRef.current = null;
      dispatch("cleared");
    }
  }, [
    batteryEnergy.usablePercent,
    critical,
    monitoring?.current_load,
    state.active,
  ]);

  const value = useMemo(
    () => ({
      active: state.active,
      recovering: state.recovering,
    }),
    [state],
  );

  return (
    <CriticalWarningContext.Provider value={value}>
      {children}
    </CriticalWarningContext.Provider>
  );
}

export function useCriticalWarning() {
  return useContext(CriticalWarningContext) ?? FALLBACK;
}
