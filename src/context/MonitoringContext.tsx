import React, {
  createContext,
  useContext,
  useMemo,
} from "react";

import { useDeviceOnline } from "@/hooks/useDeviceOnline";
import type { MonitoringData } from "@/services/monitoringSchema";
import { useMonitoring } from "@/services/monitoringService";

interface MonitoringContextValue {
  monitoring: MonitoringData | null;
  loading: boolean;
  stale: boolean;
  cachedAt: number | null;
  refresh: () => Promise<void>;
  deviceOnline: boolean;
}

const MonitoringContext =
  createContext<MonitoringContextValue | null>(null);

const FALLBACK: MonitoringContextValue = {
  monitoring: null,
  loading: true,
  stale: false,
  cachedAt: null,
  refresh: async () => {},
  deviceOnline: false,
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
    refresh,
  } = useMonitoring();

  const deviceOnline = useDeviceOnline(
    monitoring?.last_seen,
    monitoring?.device_status,
  );

  const value = useMemo<MonitoringContextValue>(
    () => ({
      monitoring,
      loading,
      stale,
      cachedAt,
      refresh,
      deviceOnline,
    }),
    [
      monitoring,
      loading,
      stale,
      cachedAt,
      refresh,
      deviceOnline,
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
