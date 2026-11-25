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
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  withTimeout,
} from "@/lib/withTimeout";
import { requestManager, RequestManager } from "@/services/requestManager";
import { memoryCache, CACHE_TTL } from "@/services/memoryCache";
import {
  subscribeResilientChannel,
  type ResilientSubscription,
} from "@/services/realtimeResubscribe";
import {
  MONITORING_COLUMNS,
  MONITORING_RAW_TO_UI,
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
import {
  isDeviceOnline,
  monitoringLastSeenMs,
} from "@/utils/monitoringDisplay";

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

const writeMonitoringCache = (
  userId: string,
  data: MonitoringData,
): void => {
  const key = monitoringMemoryKey(userId);
  const cached = memoryCache.get<MonitoringData>(key);

  if (
    cached &&
    monitoringLastSeenMs(data) <
      monitoringLastSeenMs(cached)
  ) {
    return;
  }

  memoryCache.set(key, data, CACHE_TTL.MONITORING);
  void saveCachedMonitoring(data, userId);
};

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

export type ProvisioningMonitorAssignment =
  | { status: "found"; monitorId: number }
  | { status: "not_found" }
  | { status: "ambiguous" }
  | { status: "invalid" }
  | { status: "query_failed" }
  | { status: "session_expired" };

export const resolveProvisioningMonitorIdForUser = async (
  userId?: string,
): Promise<ProvisioningMonitorAssignment> => {
  const trimmedUserId = userId?.trim();

  const resolvedUserId =
    trimmedUserId ||
    (await getAuthenticatedUserSafe())?.id ||
    null;

  if (!resolvedUserId) {
    return { status: "session_expired" };
  }

  const response = await withTimeout(
    supabase
      .from("monitoring")
      .select("monitor_id")
      .eq("user_id", resolvedUserId)
      .limit(2),
    DEFAULT_REQUEST_TIMEOUT_MS,
    "Monitoring assignment lookup timed out.",
  ).catch(() => ({
    data: null,
    error: { message: "timeout" },
  }));

  const { data, error } = response;

  if (error) {
    return { status: "query_failed" };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { status: "not_found" };
  }

  if (data.length > 1) {
    return { status: "ambiguous" };
  }

  const record = data[0] as { monitor_id?: unknown } | null;
  const raw = record?.monitor_id;
  const monitorId = typeof raw === "number" ? raw : NaN;

  if (
    !Number.isInteger(monitorId) ||
    monitorId <= 0 ||
    monitorId > 0xffffffff
  ) {
    return { status: "invalid" };
  }

  return { status: "found", monitorId };
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
type MonitoringRowResponse = {
  data: MonitoringRow | null;
  error: { message: string } | null;
};

export const fetchMonitoringRowForUser = async (
  userId: string,
): Promise<MonitoringRow | null> => {
  let response: MonitoringRowResponse;

  try {
    response = await withTimeout(
      supabase
        .from("monitoring")
        .select(MONITORING_SELECT)
        .eq("user_id", userId)
        .maybeSingle(),
      undefined,
      "Monitoring request timed out.",
    );
  } catch (caught) {
    console.error(
      "Error loading monitoring data:",
      caught instanceof Error
        ? caught.message
        : caught,
    );
    return null;
  }

  const { data, error } = response;

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
  let response: MonitoringRowResponse;

  try {
    response = await withTimeout(
      supabase
        .from("monitoring")
        .select(MONITORING_SELECT)
        .eq("monitor_id", monitorId)
        .maybeSingle(),
      undefined,
      "Monitoring request timed out.",
    );
  } catch (caught) {
    console.error(
      "Error loading monitoring data:",
      caught instanceof Error
        ? caught.message
        : caught,
    );
    return null;
  }

  const { data, error } = response;

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
    bypassCache?: boolean;
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
  // work. Callers converging on the latest DB row skip it, but
  // keep the cached value in place so a slower, stale response
  // cannot overwrite fresher data (writeMonitoringCache below).
  if (!options.forceRefresh && !options.bypassCache) {
    const cached = memoryCache.get<MonitoringData>(cacheKey);
    if (cached) {
      perfLog("fetch", {
        result: "cache-hit",
        authMs,
        totalMs: roundMs(perfNow() - totalStart),
      });
      return cached;
    }
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

      writeMonitoringCache(user.id, normalized);

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
  return isDeviceOnline(data?.device_status)
    ? "Online"
    : "Offline";
};

// ============================================================
// REALTIME SUBSCRIPTIONS (resilient, aligned by user_id)
// ============================================================

type MonitoringSubscriptionHandle =
  | ResilientSubscription
  | null;

type MonitoringRealtimeUpdate =
  | { kind: "full"; data: MonitoringData | null }
  | { kind: "partial"; raw: Record<string, unknown> };

const mergePartialMonitoringUpdate = (
  current: MonitoringData | null,
  raw: Record<string, unknown>,
): MonitoringData | null => {
  if (!current) {
    return null;
  }

  const partialRaw: Record<string, unknown> = {};

  for (const column of MONITORING_COLUMNS) {
    if (
      Object.prototype.hasOwnProperty.call(raw, column) &&
      raw[column] !== undefined
    ) {
      partialRaw[column] = raw[column];
    }
  }

  if (Object.keys(partialRaw).length === 0) {
    return current;
  }

  const normalized =
    normalizeMonitoringRow(partialRaw);

  const merged = {
    ...current,
  } as Record<string, unknown>;

  const rawToUi = MONITORING_RAW_TO_UI as Record<
    string,
    keyof MonitoringData
  >;

  for (const column of Object.keys(partialRaw)) {
    const field = rawToUi[column];

    if (field) {
      merged[field] = normalized[field];
    }
  }

  return merged as unknown as MonitoringData;
};

export const subscribeToMonitoring = async (
  onChange: (update: MonitoringRealtimeUpdate) => void,
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
            onChange({ kind: "full", data: null });
            return;
          }

          const incoming =
            payload.new as Record<string, unknown> | null;

          if (incoming && isMonitoringRow(incoming)) {
            const normalized =
              normalizeMonitoringRow(incoming);
            writeMonitoringCache(userId, normalized);
            onChange({ kind: "full", data: normalized });
            return;
          }

          const partialRaw: Record<string, unknown> = {};

          if (incoming) {
            for (const column of MONITORING_COLUMNS) {
              if (
                Object.prototype.hasOwnProperty.call(
                  incoming,
                  column,
                ) &&
                incoming[column] !== undefined
              ) {
                partialRaw[column] = incoming[column];
              }
            }
          }

          if (Object.keys(partialRaw).length === 0) {
            // UPDATE events only carry changed columns unless the
            // table uses REPLICA IDENTITY FULL. An update to a
            // column outside the 25-column contract is expected,
            // not a reason to refetch the whole row.
            console.debug(
              "[monitoring] Ignoring realtime payload with no known columns:",
              payload.eventType,
            );
            return;
          }

          onChange({ kind: "partial", raw: partialRaw });
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

    const [error, setError] = useState(false);

    // Mount + in-flight guards for the manual refresh()
    // below. The mount effect's `mounted` flag is closure-
    // local to that effect, so refresh() needs its own.
    const mountedRef = useRef(true);

    const refreshInflightRef = useRef(false);

    const sequenceRef = useRef(0);

    const appliedSequenceRef = useRef(0);

    const monitoringRef = useRef<
      MonitoringData | null
    >(null);

    const backgroundRefreshInflightRef = useRef(false);

    const nextSequence = useCallback(
      () => {
        sequenceRef.current += 1;

        return sequenceRef.current;
      },
      [],
    );

    const applyMonitoringSnapshot = useCallback(
      (
        data: MonitoringData | null,
        sequence: number,
        meta: {
          stale: boolean;
          savedAt?: number | null;
        },
      ) => {
        if (
          !mountedRef.current ||
          sequence < appliedSequenceRef.current
        ) {
          return false;
        }

        const current = monitoringRef.current;

        // Sequence measures call order, not data freshness. A
        // slow refetch can resolve after a newer realtime row;
        // never let its older heartbeat roll the UI backwards.
        if (
          data &&
          current &&
          monitoringLastSeenMs(data) <
            monitoringLastSeenMs(current)
        ) {
          return false;
        }

        appliedSequenceRef.current = sequence;
        monitoringRef.current = data;

        setMonitoring(data);
        setStale(meta.stale);
        setCachedAt(meta.savedAt ?? Date.now());
        setError(false);

        return true;
      },
      [],
    );

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

        const sequence = nextSequence();

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
            applyMonitoringSnapshot(data, sequence, {
              stale: false,
            });
          }
        } catch (error) {
          if (mountedRef.current) {
            setError(true);
          }

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
      [applyMonitoringSnapshot, nextSequence],
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
          if (backgroundRefreshInflightRef.current) {
            return;
          }

          backgroundRefreshInflightRef.current = true;
          const sequence = nextSequence();

          try {
            // Skip the cached read, but keep request coalescing
            // and the existing cache value until the fresher
            // row has actually arrived.
            const data = await getMonitoringData({
              bypassCache: true,
            });
            if (!mounted) return;
            if (data) {
              applyMonitoringSnapshot(data, sequence, {
                stale: false,
              });
              painted = true;
            }
          } catch (error) {
            if (mounted) {
              setError(true);
            }

            console.warn(
              "Monitoring refetch failed:",
              error instanceof Error ? error.message : error,
            );
          } finally {
            backgroundRefreshInflightRef.current = false;
          }
        };

        const initializeMonitoring = async () => {
          try {
            const cachedUser = await getAuthenticatedUserSafe();
            activeUserId = cachedUser?.id ?? null;

            const cached = await loadCachedMonitoring(
              activeUserId,
            );

            const cachedSequence = nextSequence();

            if (
              mounted &&
              cached &&
              applyMonitoringSnapshot(
                cached.data,
                cachedSequence,
                {
                  stale: true,
                  savedAt: cached.savedAt,
                },
              )
            ) {
              painted = true;
            }

            const liveSequence = nextSequence();

            const data = await getMonitoringData();

            if (!mounted) {
              return;
            }

            if (data) {
              if (
                applyMonitoringSnapshot(data, liveSequence, {
                  stale: false,
                })
              ) {
                painted = true;
              }
            } else if (liveSequence >= appliedSequenceRef.current) {
              monitoringRef.current = null;
              setMonitoring(null);

              if (!cached) {
                setError(true);
              }
            }

            channel = await subscribeToMonitoring(
              (update) => {
                if (!mounted) {
                  return;
                }

                const sequence = nextSequence();

                if (update.kind === "full") {
                  if (
                    applyMonitoringSnapshot(
                      update.data,
                      sequence,
                      { stale: false },
                    )
                  ) {
                    painted = true;

                    if (update.data && activeUserId) {
                      writeMonitoringCache(
                        activeUserId,
                        update.data,
                      );
                    }
                  }

                  return;
                }

                const merged =
                  mergePartialMonitoringUpdate(
                    monitoringRef.current,
                    update.raw,
                  );

                if (!merged) {
                  // A partial cannot be merged without a current
                  // row (e.g. realtime arrived before the first
                  // fetch). One coalesced refetch fills the gap;
                  // subsequent partials just merge normally.
                  void refetchLatest();
                  return;
                }

                if (
                  applyMonitoringSnapshot(
                    merged,
                    sequence,
                    { stale: false },
                  )
                ) {
                  painted = true;

                  if (activeUserId) {
                    writeMonitoringCache(activeUserId, merged);
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
          } catch (error) {
            console.error(
              "Unexpected monitoring error:",
              error,
            );

            if (mounted && !painted) {
              const sequence = nextSequence();

              applyMonitoringSnapshot(null, sequence, {
                stale: false,
              });
            }

            if (mounted) {
              setError(true);
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
      [applyMonitoringSnapshot, nextSequence],
    );

    return {
      monitoring,
      loading,
      stale,
      cachedAt,
      error,
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

