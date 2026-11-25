import React, {
  createContext,
  useContext,
  useMemo,
} from "react";

import { useDeviceOnline } from "@/hooks/useDeviceOnline";
import type { MonitoringData } from "@/services/monitoringSchema";
import { isDbReadingFresh } from "@/utils/monitoringDisplay";
import { useMonitoring } from "@/services/monitoringService";

export type DeviceConnectionStatus =
  | "loading"
  | "online"
  | "offline"
  | "error";

interface MonitoringContextValue {
  monitoring: MonitoringData | null;
  loading: boolean;
  stale: boolean;
  cachedAt: number | null;
  error: boolean;
  refresh: () => Promise<void>;
  deviceOnline: boolean;
  dbReadingFresh: boolean;
  connectionStatus: DeviceConnectionStatus;
}

const MonitoringContext =
  createContext<MonitoringContextValue | null>(null);

const FALLBACK: MonitoringContextValue = {
  monitoring: null,
  loading: true,
  stale: false,
  cachedAt: null,
  error: false,
  refresh: async () => {},
  deviceOnline: false,
  dbReadingFresh: false,
  connectionStatus: "loading",
};

export function MonitoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    monitoring,
    loading,
    stale,
    cachedAt,
    error,
    refresh,
  } = useMonitoring();

  const deviceOnline = useDeviceOnline(
    monitoring?.device_status,
  );

  const dbReadingFresh = isDbReadingFresh(
    monitoring,
  );

  // A cached row painted on cold start can be minutes old. It
  // stays visible (flagged stale), but must not flash Offline
  // before the live fetch has had a chance to land.
  const connectionStatus: DeviceConnectionStatus =
    monitoring === null
      ? error
        ? "error"
        : "loading"
      : deviceOnline
        ? "online"
        : stale
          ? "loading"
          : "offline";

  const value = useMemo<MonitoringContextValue>(
    () => ({
      monitoring,
      loading,
      stale,
      cachedAt,
      error,
      refresh,
      deviceOnline,
      dbReadingFresh,
      connectionStatus,
    }),
    [
      monitoring,
      loading,
      stale,
      cachedAt,
      error,
      refresh,
      deviceOnline,
      dbReadingFresh,
      connectionStatus,
    ],
  );

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoringContext(): MonitoringContextValue {
  return useContext(MonitoringContext) ?? FALLBACK;
}
