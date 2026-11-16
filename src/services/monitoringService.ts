import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";
import { requestManager, RequestManager } from "@/services/requestManager";
import { memoryCache, CACHE_TTL } from "@/services/memoryCache";
import {
  subscribeResilientChannel,
  type ResilientSubscription,
} from "@/services/realtimeResubscribe";
import {
  MONITORING_SCHEMA_VERSION,
  MONITORING_SELECT,
  getMissingMonitoringColumns,
  isMonitoringRow,
  normalizeMonitoringData,
  normalizeMonitoringRow,
  type BatteryStatus,
  type DeviceStatus,
  type DoDStatus,
  type MonitoringData,
  type MonitoringRow,
  type SolarStatus,
  type TemperatureStatus,
} from "@/services/monitoringSchema";
import { isDeviceOnline } from "@/utils/monitoringDisplay";

export type {
  BatteryStatus,
  DeviceStatus,
  DoDStatus,
  MonitoringData,
  MonitoringRow,
  SolarStatus,
  TemperatureStatus,
};

// ============================================================
// PERF INSTRUMENTATION (gated)
// ============================================================
//
// Lightweight timings for the monitoring fetch path. Disabled
// in production unless EXPO_PUBLIC_PERF_LOG=1, so normal
// installs pay nothing but a boolean check.
// ============================================================

const PERF_LOG_ENABLED =
  (typeof __DEV__ !== "undefined" && __DEV__) ||
  process.env.EXPO_PUBLIC_PERF_LOG === "1";

const perfNow = (): number =>
  typeof performance !== "undefined" &&
  typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const roundMs = (value: number): number =>
  Math.round(value * 10) / 10;

const perfLog = (
  label: string,
  fields: Record<string, unknown>,
): void => {
  if (!PERF_LOG_ENABLED) {
    return;
  }

  console.info(
    `[perf][monitoring] ${label}`,
    fields,
  );
};

// ============================================================
// LAST-READING CACHE (offline resilience)
// ============================================================
//
// The last successful monitoring row, per user. The dashboard
// paints it instantly on cold start (flagged stale) so an
// offline open shows real readings instead of nulls, then the
// live fetch overwrites it. Best-effort like every other
// AsyncStorage cache in this codebase: failures stay silent.
// ============================================================

const MONITORING_CACHE_KEY =
  "adlawatt.monitoring.last.v3";

const scopedMonitoringKey = (
  userId: string,
): string =>
  `${MONITORING_CACHE_KEY}:${userId}`;

const monitoringMemoryKey = (
  userId: string,
): string =>
  `monitoring:v${MONITORING_SCHEMA_VERSION}:${userId}`;

interface CachedMonitoring {
  schemaVersion: typeof MONITORING_SCHEMA_VERSION;
  data: MonitoringData;
  savedAt: number;
}

interface StoredCachedMonitoring {
  schemaVersion?: unknown;
  data?: unknown;
  savedAt?: unknown;
}

const isFiniteNumber = (
  value: unknown,
): value is number =>
  typeof value === "number" &&
  Number.isFinite(value);

export const saveCachedMonitoring = async (
  data: MonitoringData,
  userId?: string | null,
): Promise<void> => {
  if (!userId) {
    return;
  }

  try {
    await AsyncStorage.setItem(
      scopedMonitoringKey(userId),
      JSON.stringify({
        schemaVersion: MONITORING_SCHEMA_VERSION,
        data,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Intentionally ignored.
  }
};

export const loadCachedMonitoring = async (
  userId?: string | null,
): Promise<CachedMonitoring | null> => {
  if (!userId) {
    return null;
  }

  try {
    const raw = await AsyncStorage.getItem(
      scopedMonitoringKey(userId),
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(
      raw,
    ) as StoredCachedMonitoring;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.schemaVersion !==
        MONITORING_SCHEMA_VERSION ||
      !isFiniteNumber(parsed.savedAt)
    ) {
      return null;
    }

    return {
      schemaVersion: MONITORING_SCHEMA_VERSION,
      // Re-normalized on load so corrupt or legacy shapes
      // can never leak untrusted values into the UI.
      data: normalizeMonitoringData(
        parsed.data,
      ),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
};

// ============================================================
// SESSION MONITOR ID CACHE + ALIGNED FETCH (user_id/RLS)
// ============================================================

const monitorIdByUser = new Map<string, number>();

const rememberMonitorId = (
  userId: string,
  monitorId: unknown,
): void => {
  if (typeof monitorId === "number" && Number.isFinite(monitorId)) {
    monitorIdByUser.set(userId, monitorId);
  }
};

export const clearMonitoringSessionCache = (
  userId?: string,
): void => {
  if (userId) {
    monitorIdByUser.delete(userId);
    memoryCache.delete(monitoringMemoryKey(userId));
    return;
  }
  monitorIdByUser.clear();
};

// Back-compat export: resolve monitor_id for callers that need it.
export const getMonitorIdForUser = async (
  userId: string,
): Promise<number | null> => {
  const cached = monitorIdByUser.get(userId);
  if (cached != null) {
    return cached;
  }

  // Aligned primary path: read the user's own monitoring row (RLS by user_id).
  const { data, error } = await supabase
    .from("monitoring")
    .select("monitor_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data?.monitor_id != null) {
    const id = Number(data.monitor_id);
    rememberMonitorId(userId, id);
    return id;
  }

  // Fallback for legacy profile linkage.
  const { data: profile } = await supabase
    .from("users")
    .select("monitor_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.monitor_id != null) {
    const id = Number(profile.monitor_id);
    rememberMonitorId(userId, id);
    return id;
  }

  return null;
};

// Aligned: fetch the full 25-column live row for this user in one query.
export const fetchMonitoringRowForUser = async (
  userId: string,
): Promise<MonitoringRow | null> => {
  const { data, error } = await supabase
    .from("monitoring")
    .select(MONITORING_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Error loading monitoring data:",
      error.message,
    );
    return null;
  }

  if (!data) {
    return null;
  }

  if (!isMonitoringRow(data)) {
    console.error(
      "[monitoring] Row is missing columns:",
      getMissingMonitoringColumns(data),
    );
    return null;
  }

  rememberMonitorId(userId, data.monitor_id);
  return data;
};

// Back-compat export.
export const fetchMonitoringRow = async (
  monitorId: number,
): Promise<MonitoringRow | null> => {
  const { data, error } = await supabase
    .from("monitoring")
    .select(MONITORING_SELECT)
    .eq("monitor_id", monitorId)
    .maybeSingle();

  if (error) {
    console.error(
      "Error loading monitoring data:",
      error.message,
    );
    return null;
  }

  if (!data) {
    return null;
  }

  if (!isMonitoringRow(data)) {
    console.error(
      "[monitoring] Row is missing columns:",
      getMissingMonitoringColumns(data),
    );
    return null;
  }

  return data;
};

// ============================================================
// FETCH MONITORING DATA
// ============================================================

export const getMonitoringData = async (
  options: {
    forceRefresh?: boolean;
  } = {},
): Promise<MonitoringData | null> => {
  const totalStart = perfNow();

  const user = await getAuthenticatedUserSafe();
  const authMs = roundMs(perfNow() - totalStart);

  if (!user) {
    perfLog("fetch", {
      result: "no-user",
      authMs,
      totalMs: roundMs(perfNow() - totalStart),
    });
    return null;
  }

  const cacheKey = monitoringMemoryKey(user.id);

  // Fast path: serve in-memory cache before any extra network
  // work. Pull-to-refresh/explicit callers can force a refetch.
  if (!options.forceRefresh) {
    const cached = memoryCache.get<MonitoringData>(cacheKey);
    if (cached) {
      perfLog("fetch", {
        result: "cache-hit",
        authMs,
        totalMs: roundMs(perfNow() - totalStart),
      });
      return cached;
    }
  } else {
    memoryCache.delete(cacheKey);
  }

  // Coalesce the full aligned fetch (single RTT by user_id).
  return requestManager.execute(
    RequestManager.userKey(user.id, "monitoring"),
    async () => {
      const fetchStart = perfNow();
      const row = await fetchMonitoringRowForUser(user.id);
      const fetchMs = roundMs(perfNow() - fetchStart);

      if (!row) {
        perfLog("fetch", {
          result: "empty",
          authMs,
          fetchMs,
          totalMs: roundMs(perfNow() - totalStart),
        });
        return null;
      }

      const normalizeStart = perfNow();
      // Normalize exact table columns into the UI model (values
      // come from the row; nulls stay null).
      const normalized = normalizeMonitoringRow(row);
      const normalizeMs = roundMs(perfNow() - normalizeStart);

      memoryCache.set(
        cacheKey,
        normalized,
        CACHE_TTL.MONITORING,
      );

      void saveCachedMonitoring(normalized, user.id);

      perfLog("fetch", {
        result: "network",
        authMs,
        fetchMs,
        normalizeMs,
        totalMs: roundMs(perfNow() - totalStart),
      });

      return normalized;
    },
    { force: options.forceRefresh === true },
  );
};

// ============================================================
// FETCH DEVICE STATUS (aligned, from latest monitoring data)
// ============================================================

export const getDeviceStatus = async (): Promise<DeviceStatus> => {
  const data = await getMonitoringData();
  return isDeviceOnline(data?.last_seen, data?.device_status)
    ? "Online"
    : "Offline";
};

// ============================================================
// REALTIME SUBSCRIPTIONS (resilient, aligned by user_id)
// ============================================================

type MonitoringSubscriptionHandle =
  | ResilientSubscription
  | null;

export const subscribeToMonitoring = async (
  onChange: (data: MonitoringData | null) => void,
  options?: {
    onSubscribed?: () => void;
  },
): Promise<MonitoringSubscriptionHandle> => {
  const user = await getAuthenticatedUserSafe();

  if (!user) {
    return null;
  }

  const userId = user.id;
  let firstPayloadLogged = false;
  const subscribeStartedAt = perfNow();

  return subscribeResilientChannel({
    topic: `monitoring-user-${userId}`,
    label: `monitoring-user-${userId}`,
    build: (base) =>
      base.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monitoring",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!firstPayloadLogged) {
            firstPayloadLogged = true;
            perfLog("realtime-first-payload", {
              ms: roundMs(perfNow() - subscribeStartedAt),
              event: payload.eventType,
            });
          }

          if (payload.eventType === "DELETE") {
            onChange(null);
            return;
          }

          if (!payload.new || !isMonitoringRow(payload.new)) {
            console.error(
              "[monitoring] Realtime payload is missing columns; refetching:",
              getMissingMonitoringColumns(payload.new),
            );
            void getMonitoringData({ forceRefresh: true }).then(
              (fresh) => {
                if (fresh) {
                  onChange(fresh);
                }
              },
            );
            return;
          }

          const normalized = normalizeMonitoringRow(payload.new);
          memoryCache.set(
            monitoringMemoryKey(userId),
            normalized,
            CACHE_TTL.MONITORING,
          );
          void saveCachedMonitoring(normalized, userId);
          // Emit latest table values immediately (including when
          // hardware becomes active / ESP32S3 Status is Online).
          onChange(normalized);
        },
      ),
    isAlive: () => true,
    onSubscribed: () => {
      // Converge on latest DB state on connect/reconnect so no
      // active update is missed while channel was down.
      options?.onSubscribed?.();
    },
  });
};

export const subscribeToDeviceStatus = async (
  onChange: (status: DeviceStatus) => void,
  options?: {
    onSubscribed?: () => void;
  },
): Promise<MonitoringSubscriptionHandle> => {
  const user = await getAuthenticatedUserSafe();

  if (!user) {
    onChange("Offline");
    return null;
  }

  const userId = user.id;

  return subscribeResilientChannel({
    topic: `device-status-user-${userId}`,
    label: `device-status-user-${userId}`,
    build: (base) =>
      base.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monitoring",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            onChange("Offline");
            return;
          }

          const next = payload.new as Record<string, unknown> | null;
          onChange(
            isDeviceOnline(
              next?.["ESP32S3 Last seen"] as string | null | undefined,
              next?.["ESP32S3 Status"] as string | null | undefined,
            )
              ? "Online"
              : "Offline",
          );
        },
      ),
    isAlive: () => true,
    onSubscribed: () => {
      options?.onSubscribed?.();
    },
  });
};

// ============================================================
// UNSUBSCRIBE
// ============================================================

export const unsubscribeFromMonitoring = (
  handle:
    | MonitoringSubscriptionHandle
    | { stop?: () => void }
    | { unsubscribe?: () => void }
    | null,
): void => {
  if (!handle) return;
  if (typeof (handle as { stop?: () => void }).stop === "function") {
    (handle as { stop: () => void }).stop();
    return;
  }
  if (typeof (handle as { unsubscribe?: () => void }).unsubscribe === "function") {
    try {
      (handle as { unsubscribe: () => void }).unsubscribe();
    } catch {
      // ignore
    }
  }
};

export const unsubscribeFromDeviceStatus = (
  handle:
    | MonitoringSubscriptionHandle
    | { stop?: () => void }
    | { unsubscribe?: () => void }
    | null,
): void => {
  unsubscribeFromMonitoring(handle);
};

// ============================================================
// USE MONITORING HOOK
// ============================================================

export const useMonitoring =
  () => {

    const [
      monitoring,
      setMonitoring,
    ] = useState<
      MonitoringData | null
    >(null);

    const [
      loading,
      setLoading,
    ] = useState(true);

    // True while the shown row may not be live: painted from
    // the offline cache, or the live fetch failed leaving the
    // cache on screen. False after any successful network or
    // Realtime row. Additive to the return shape — existing
    // { monitoring, loading } destructurings keep compiling.
    const [
      stale,
      setStale,
    ] = useState(false);

    const [
      cachedAt,
      setCachedAt,
    ] = useState<number | null>(null);

    // Mount + in-flight guards for the manual refresh()
    // below. The mount effect's `mounted` flag is closure-
    // local to that effect, so refresh() needs its own.
    const mountedRef = useRef(true);

    const refreshInflightRef = useRef(false);

    useEffect(
      () => {
        mountedRef.current = true;

        return () => {
          mountedRef.current = false;
        };
      },
      [],
    );

    // Manual re-fetch of the latest monitoring row, exposed
    // for pull-to-refresh. No timestamp gate — only one
    // fetch runs at a time; failures keep the last painted
    // row on screen exactly like background refreshes.
    const refresh = useCallback(
      async () => {
        if (refreshInflightRef.current) {
          return;
        }

        refreshInflightRef.current = true;

        try {
          const data =
            await getMonitoringData({
              forceRefresh: true,
            });

          if (
            !mountedRef.current
          ) {
            return;
          }

          if (data) {
            setMonitoring(data);

            setStale(false);

            setCachedAt(Date.now());
          }
        } catch (error) {
          console.warn(
            "Monitoring refresh failed:",
            error instanceof Error
              ? error.message
              : error,
          );
        } finally {
          refreshInflightRef.current = false;
        }
      },
      [],
    );

    useEffect(
      () => {
        let mounted = true;
        let painted = false;
        let channel: Awaited<
          ReturnType<typeof subscribeToMonitoring>
        > = null;
        let activeUserId: string | null = null;

        const refetchLatest = async () => {
          try {
            const data = await getMonitoringData({
              forceRefresh: true,
            });
            if (!mounted) return;
            if (data) {
              setMonitoring(data);
              setStale(false);
              setCachedAt(Date.now());
              painted = true;
            }
          } catch (error) {
            console.warn(
              "Monitoring refetch failed:",
              error instanceof Error ? error.message : error,
            );
          }
        };

        const initializeMonitoring = async () => {
          try {
            const cachedUser = await getAuthenticatedUserSafe();
            activeUserId = cachedUser?.id ?? null;

            const cached = await loadCachedMonitoring(
              activeUserId,
            );

            if (mounted && cached) {
              setMonitoring(cached.data);
              setStale(true);
              setCachedAt(cached.savedAt);
              painted = true;
            }

            const data = await getMonitoringData();

            if (!mounted) {
              return;
            }

            if (data) {
              setMonitoring(data);
              setStale(false);
              setCachedAt(Date.now());
              painted = true;
            } else if (!cached) {
              setMonitoring(null);
            }

            channel = await subscribeToMonitoring(
              (updatedData) => {
                if (!mounted) {
                  return;
                }

                setMonitoring(updatedData);

                if (updatedData) {
                  setStale(false);
                  setCachedAt(Date.now());
                  if (activeUserId) {
                    void saveCachedMonitoring(
                      updatedData,
                      activeUserId,
                    );
                  }
                }
              },
              {
                // On connect/reconnect, immediately pull latest
                // DB row so active hardware updates are shown
                // even if an event was missed.
                onSubscribed: () => {
                  void refetchLatest();
                },
              },
            );

            // Extra convergence fetch right after subscribe setup.
            void refetchLatest();
          } catch (error) {
            console.error(
              "Unexpected monitoring error:",
              error,
            );

            if (mounted && !painted) {
              setMonitoring(null);
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        };

        initializeMonitoring();

        const appStateSub = AppState.addEventListener(
          "change",
          (state) => {
            if (state === "active") {
              void refetchLatest();
            }
          },
        );

        return () => {
          mounted = false;
          appStateSub.remove();
          unsubscribeFromMonitoring(channel);
        };
      },
      [],
    );

    return {
      monitoring,
      loading,
      stale,
      cachedAt,
      refresh,
    };
  };

// ============================================================
// USE DEVICE STATUS HOOK
// ============================================================

export const useDeviceStatus =
  () => {

    const [
      deviceStatus,
      setDeviceStatus,
    ] = useState<DeviceStatus>(
      "Offline",
    );

    const [
      loading,
      setLoading,
    ] = useState(true);

    useEffect(
      () => {
        let mounted = true;
        let channel: Awaited<
          ReturnType<typeof subscribeToDeviceStatus>
        > = null;

        const refetchStatus = async () => {
          try {
            const status = await getDeviceStatus();
            if (mounted) {
              setDeviceStatus(status);
            }
          } catch {
            // keep last known
          }
        };

        const initializeDeviceStatus = async () => {
          try {
            const status = await getDeviceStatus();
            if (!mounted) return;
            setDeviceStatus(status);

            channel = await subscribeToDeviceStatus(
              (updatedStatus) => {
                if (!mounted) return;
                setDeviceStatus(updatedStatus);
              },
              {
                onSubscribed: () => {
                  void refetchStatus();
                },
              },
            );

            void refetchStatus();
          } catch (error) {
            console.error(
              "Unexpected device status error:",
              error,
            );
            if (mounted) {
              setDeviceStatus("Offline");
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        };

        initializeDeviceStatus();

        const appStateSub = AppState.addEventListener(
          "change",
          (state) => {
            if (state === "active") {
              void refetchStatus();
            }
          },
        );

        return () => {
          mounted = false;
          appStateSub.remove();
          unsubscribeFromDeviceStatus(channel);
        };
      },
      [],
    );

    return {
      deviceStatus,
      loading,
    };
  };

