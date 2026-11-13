import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";
import { requestManager, RequestManager } from "@/services/requestManager";
import { memoryCache, CACHE_TTL } from "@/services/memoryCache";
import {
  MONITORING_SCHEMA_VERSION,
  MONITORING_SELECT,
  getMissingMonitoringColumns,
  isMonitoringRow,
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
      data: normalizeMonitoringRow(
        parsed.data,
      ),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
};

export const getMonitorIdForUser = async (
  userId: string,
): Promise<number | null> => {

  const {
    data,
    error,
  } = await supabase
    .from("users")
    .select(
      "monitor_id",
    )
    .eq(
      "id",
      userId,
    )
    .maybeSingle();

  if (error) {

    console.error(
      "Error loading monitor id:",
      error.message,
    );

    return null;
  }

  if (
    data?.monitor_id == null
  ) {

    return null;
  }

  return Number(data.monitor_id);
};

// ============================================================
// FETCH MONITORING ROW
// ============================================================

export const fetchMonitoringRow = async (
  monitorId: number,
): Promise<MonitoringRow | null> => {

  const {
    data,
    error,
  } = await supabase
    .from("monitoring")
    .select(MONITORING_SELECT)
    .eq(
      "monitor_id",
      monitorId,
    )
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

export const getMonitoringData =
  async (
    options: {
      forceRefresh?: boolean;
    } = {},
  ): Promise<MonitoringData | null> => {

    const user = await getAuthenticatedUserSafe();

    if (!user) {

      return null;
    }

    const monitorId =
      await getMonitorIdForUser(user.id);

    if (monitorId == null) {

      return null;
    }

    const cacheKey = monitoringMemoryKey(user.id);

    // Check memory cache first for fast response. Pull-to-
    // refresh bypasses it and refetches from the database.
    if (!options.forceRefresh) {
      const cached =
        memoryCache.get<MonitoringData>(cacheKey);

      if (cached) {
        return cached;
      }
    } else {
      memoryCache.delete(cacheKey);
    }

    // Use request coalescing to prevent duplicate in-flight requests
    return requestManager.execute(
      RequestManager.userKey(user.id, "monitoring"),
      async () => {
        const row = await fetchMonitoringRow(
          monitorId,
        );

        if (!row) {

          return null;
        }

        const normalized =
          normalizeMonitoringRow(row);

        // Cache in memory for fast subsequent access
        memoryCache.set(
          cacheKey,
          normalized,
          CACHE_TTL.MONITORING,
        );

        // Fire-and-forget: the dashboard must never wait on
        // storage, and a blocked store must not break reads.
        void saveCachedMonitoring(
          normalized,
          user.id,
        );

        return normalized;
      }
    );
  };

// ============================================================
// FETCH DEVICE STATUS ONLY
// ============================================================

export const getDeviceStatus =
  async (): Promise<DeviceStatus> => {

    const user = await getAuthenticatedUserSafe();

    if (!user) {

      return "Offline";
    }

    const monitorId =
      await getMonitorIdForUser(user.id);

    if (monitorId == null) {

      return "Offline";
    }

    const {
      data,
      error,
    } = await supabase
      .from("monitoring")
      .select(
        "device_status,last_seen",
      )
      .eq(
        "monitor_id",
        monitorId,
      )
      .maybeSingle();

    if (error) {

      console.error(
        "Error loading device status:",
        error,
      );

      return "Offline";
    }

    return isDeviceOnline(
      data?.last_seen,
      data?.device_status,
    )
      ? "Online"
      : "Offline";
  };

// ============================================================
// SUBSCRIBE TO MONITORING
// ============================================================

export const subscribeToMonitoring =
  async (
    onChange: (
      data: MonitoringData | null,
    ) => void,
  ) => {

    const user = await getAuthenticatedUserSafe();

    if (!user) {

      return null;
    }

    const monitorId =
      await getMonitorIdForUser(user.id);

    if (monitorId == null) {

      return null;
    }

    const topic = `monitoring-hook-${monitorId}`;

    const reused = supabase
      .getChannels()
      .find(
        (c) =>
          (c as unknown as { topic?: string }).topic ===
          `realtime:${topic}`,
      );

    if (reused) {
      return reused as unknown as ReturnType<
        typeof supabase.channel
      >;
    }

    const channel =
      supabase
        .channel(
          topic,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "monitoring",
            filter: `monitor_id=eq.${monitorId}`,
          },
          (payload) => {

            // ------------------------------------------------
            // DELETE
            // ------------------------------------------------

            if (
              payload.eventType === "DELETE"
            ) {

              onChange(null);

              return;
            }

            // ------------------------------------------------
            // INSERT / UPDATE
            // ------------------------------------------------

            if (
              payload.new
            ) {

              if (!isMonitoringRow(payload.new)) {

                console.error(
                  "[monitoring] Realtime payload is missing columns; refetching:",
                  getMissingMonitoringColumns(
                    payload.new,
                  ),
                );

                void getMonitoringData({
                  forceRefresh: true,
                }).then((fresh) => {
                  if (fresh) {
                    onChange(fresh);
                  }
                });

                return;
              }

              const normalized = normalizeMonitoringRow(
                payload.new,
              );
              // Update memory cache on realtime updates
              memoryCache.set(
                monitoringMemoryKey(user.id),
                normalized,
                CACHE_TTL.MONITORING
              );
              onChange(normalized);
            }
          },
        )
        .subscribe(
          (status) => {

            if (
              status === "CHANNEL_ERROR"
            ) {

              console.warn(
                "Monitoring Realtime channel error.",
              );
            }

            if (
              status === "TIMED_OUT"
            ) {

              console.warn(
                "Monitoring Realtime connection timed out.",
              );
            }

            // CLOSED after explicit removeChannel (e.g. bell
            // navigates away from dashboard index) is expected
            // teardown — stay silent. Unexpected service-side
            // closes still surface via CHANNEL_ERROR/TIMED_OUT.
          },
        );

    return channel;
  };

// ============================================================
// SUBSCRIBE TO DEVICE STATUS ONLY
// ============================================================

export const subscribeToDeviceStatus =
  async (
    onChange: (
      status: DeviceStatus,
    ) => void,
  ) => {

    const user = await getAuthenticatedUserSafe();

    if (!user) {

      onChange("Offline");

      return null;
    }

    const topic = `device-status-${user.id}`;

    const reused = supabase
      .getChannels()
      .find(
        (c) =>
          (c as unknown as { topic?: string }).topic ===
          `realtime:${topic}`,
      );

    if (reused) {
      return reused as unknown as ReturnType<
        typeof supabase.channel
      >;
    }

    const channel =
      supabase
        .channel(
          topic,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "monitoring",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {

            onChange(
              isDeviceOnline(
                payload.new?.last_seen,
                payload.new?.device_status,
              )
                ? "Online"
                : "Offline",
            );
          },
        )
        .subscribe(
          (status) => {

            if (
              status === "CHANNEL_ERROR"
            ) {

              console.warn(
                "Device status Realtime channel error.",
              );
            }

            if (
              status === "TIMED_OUT"
            ) {

              console.warn(
                "Device status Realtime connection timed out.",
              );
            }

            // CLOSED after explicit removeChannel on screen
            // unmount is expected teardown — stay silent.
          },
        );

    return channel;
  };

// ============================================================
// UNSUBSCRIBE
// ============================================================

export const unsubscribeFromMonitoring =
  (
    channel:
      | ReturnType<
          typeof supabase.channel
        >
      | null,
  ) => {

    if (
      channel
    ) {

      supabase.removeChannel(
        channel,
      );
    }
  };

// ============================================================
// UNSUBSCRIBE FROM DEVICE STATUS
// ============================================================

export const unsubscribeFromDeviceStatus =
  (
    channel:
      | ReturnType<
          typeof supabase.channel
        >
      | null,
  ) => {

    if (
      channel
    ) {

      supabase.removeChannel(
        channel,
      );
    }
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

        let mounted =
          true;

        // Tracks whether anything is already on screen
        // (cache paint or live row) so an error never wipes
        // a painted cache back to nulls. Closure-local on
        // purpose: `monitoring` state would be stale here.
        let painted = false;

        let channel:
          | ReturnType<
              typeof supabase.channel
            >
          | null = null;

        const initializeMonitoring =
          async () => {

            try {

              const cachedUser =
                await getAuthenticatedUserSafe();

              // ------------------------------------------------
              // PAINT LAST READING INSTANTLY (flagged stale)
              // ------------------------------------------------
              //
              // Cold start with no connection would otherwise
              // show nulls until the network times out. The
              // live fetch below overwrites this on success.
              // ------------------------------------------------

              const cached =
                await loadCachedMonitoring(
                  cachedUser?.id ?? null,
                );

              if (
                mounted &&
                cached
              ) {

                setMonitoring(
                  cached.data,
                );

                setStale(true);

                setCachedAt(
                  cached.savedAt,
                );

                painted = true;
              }

              // ------------------------------------------------
              // GET INITIAL MONITORING DATA
              // ------------------------------------------------

              const data =
                await getMonitoringData();

              if (
                !mounted
              ) {

                return;
              }

              if (data) {

                setMonitoring(
                  data,
                );

                setStale(false);

                setCachedAt(
                  Date.now(),
                );

                painted = true;

              } else if (
                !cached
              ) {

                setMonitoring(
                  null,
                );
              }

              // ------------------------------------------------
              // SUBSCRIBE TO REALTIME MONITORING
              // ------------------------------------------------

              channel =
                await subscribeToMonitoring(
                  (
                    updatedData,
                  ) => {

                    if (
                      !mounted
                    ) {

                      return;
                    }

                    setMonitoring(
                      updatedData,
                    );

                    if (
                      updatedData
                    ) {

                      setStale(false);

                      setCachedAt(
                        Date.now(),
                      );

                      void saveCachedMonitoring(
                        updatedData,
                        cachedUser?.id ??
                          null,
                      );
                    }
                  },
                );

            } catch (
              error
            ) {

              console.error(
                "Unexpected monitoring error:",
                error,
              );

              if (
                mounted &&
                !painted
              ) {

                setMonitoring(
                  null,
                );
              }

            } finally {

              if (
                mounted
              ) {

                setLoading(
                  false,
                );
              }
            }
          };

        initializeMonitoring();

        // ======================================================
        // CLEANUP
        // ======================================================

        return () => {

          mounted =
            false;

          unsubscribeFromMonitoring(
            channel,
          );
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

        let mounted =
          true;

        let channel:
          | ReturnType<
              typeof supabase.channel
            >
          | null = null;

        const initializeDeviceStatus =
          async () => {

            try {

              // ------------------------------------------------
              // GET INITIAL DEVICE STATUS
              // ------------------------------------------------

              const status =
                await getDeviceStatus();

              if (
                !mounted
              ) {

                return;
              }

              setDeviceStatus(
                status,
              );

              // ------------------------------------------------
              // SUBSCRIBE TO REALTIME DEVICE STATUS
              // ------------------------------------------------

              channel =
                await subscribeToDeviceStatus(
                  (
                    updatedStatus,
                  ) => {

                    if (
                      !mounted
                    ) {

                      return;
                    }

                    setDeviceStatus(
                      updatedStatus,
                    );
                  },
                );

            } catch (
              error
            ) {

              console.error(
                "Unexpected device status error:",
                error,
              );

              if (
                mounted
              ) {

                setDeviceStatus(
                  "Offline",
                );
              }

            } finally {

              if (
                mounted
              ) {

                setLoading(
                  false,
                );
              }
            }
          };

        initializeDeviceStatus();

        // ======================================================
        // CLEANUP
        // ======================================================

        return () => {

          mounted =
            false;

          unsubscribeFromDeviceStatus(
            channel,
          );
        };

      },
      [],
    );

    return {
      deviceStatus,
      loading,
    };
  };

