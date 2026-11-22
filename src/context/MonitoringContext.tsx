import React, {
  createContext,
  useContext,
  useMemo,
} from "react";

import { useDeviceOnline } from "@/hooks/useDeviceOnline";
import type { MonitoringData } from "@/services/monitoringSchema";
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
    monitoring?.last_seen,
    monitoring?.device_status,
  );

  const connectionStatus: DeviceConnectionStatus =
    monitoring === null
      ? error
        ? "error"
        : "loading"
      : deviceOnline
        ? "online"
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
