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

// ============================================================
// TYPES
// ============================================================

export type TemperatureStatus =
  | "Nominal"
  | "Elevated"
  | "High"
  | "Critical";

export type DeviceStatus =
  | "Online"
  | "Offline";

export type BatteryStatus =
  | "Charging"
  | "Discharging"
  | "Idle";

export type SolarStatus =
  | "Low"
  | "Moderate"
  | "High";

export type DoDStatus =
  | "Safe"
  | "Unsafe";

// ============================================================
// MONITORING DATA
// ============================================================

export interface MonitoringData {

  // ----------------------------------------------------------
  // BATTERY
  // ----------------------------------------------------------

  battery_level: number;

  battery_status: BatteryStatus;

  time_remaining: string;

  voltage: number;

  watt_hours: number;

  current_load: number;

  device_status: DeviceStatus;

  // ----------------------------------------------------------
  // SOLAR
  // ----------------------------------------------------------

  solar_input: number;

  solar_status: SolarStatus;

  solar_timer: string;

  solar_voltage: number;

  solar_current: number;

  total_energy: number;

  // ----------------------------------------------------------
  // BATTERY TEMPERATURE
  // ----------------------------------------------------------

  battery_temperature: number;

  battery_temperature_status: TemperatureStatus;

  // ----------------------------------------------------------
  // DEPTH OF DISCHARGE
  // ----------------------------------------------------------

  dod_status: DoDStatus;

  // ----------------------------------------------------------
  // SOLAR PANEL TEMPERATURE
  // ----------------------------------------------------------

  solar_temperature: number;

  solar_temperature_status: TemperatureStatus;

  // ----------------------------------------------------------
  // INTERIOR TEMPERATURE
  // ----------------------------------------------------------

  interior_temp: number;

  interior_temp_status: TemperatureStatus;
}

// ============================================================
// SAFE TEMPERATURE STATUS
// ============================================================

const normalizeTemperatureStatus = (
  status: unknown,
): TemperatureStatus => {

  if (
    status === "Nominal" ||
    status === "Elevated" ||
    status === "High" ||
    status === "Critical"
  ) {

    return status;
  }

  return "Nominal";
};

// ============================================================
// SAFE NUMERIC VALUE
// ============================================================

const normalizeNumber = (
  value: unknown,
): number => {

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {

    return value;
  }

  if (
    typeof value === "string"
  ) {

    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {

      return parsed;
    }
  }

  return 0;
};

// ============================================================
// NORMALIZE MONITORING DATA
// ============================================================

const normalizeMonitoringData = (
  data: any,
): MonitoringData => {

  return {

    // --------------------------------------------------------
    // BATTERY
    // --------------------------------------------------------

    battery_level:
      normalizeNumber(
        data?.battery_level,
      ),

    battery_status:
      data?.battery_status === "Charging" ||
      data?.battery_status === "Discharging" ||
      data?.battery_status === "Idle"
        ? data.battery_status
        : "Idle",

    time_remaining:
      typeof data?.time_remaining === "string"
        ? data.time_remaining
        : "0h 00m",

    voltage:
      normalizeNumber(
        data?.voltage,
      ),

    watt_hours:
      normalizeNumber(
        data?.watt_hours,
      ),

    current_load:
      normalizeNumber(
        data?.current_load,
      ),

    device_status:
      data?.device_status === "Online"
        ? "Online"
        : "Offline",

    // --------------------------------------------------------
    // SOLAR
    // --------------------------------------------------------

    solar_input:
      normalizeNumber(
        data?.solar_input,
      ),

    solar_status:
      data?.solar_status === "Low" ||
      data?.solar_status === "Moderate" ||
      data?.solar_status === "High"
        ? data.solar_status
        : "Low",

    solar_timer:
      typeof data?.solar_timer === "string"
        ? data.solar_timer
        : "00:00:00",

    solar_voltage:
      normalizeNumber(
        data?.solar_voltage,
      ),

    solar_current:
      normalizeNumber(
        data?.solar_current,
      ),

    total_energy:
      normalizeNumber(
        data?.total_energy,
      ),

    // --------------------------------------------------------
    // BATTERY TEMPERATURE
    // --------------------------------------------------------

    battery_temperature:
      normalizeNumber(
        data?.battery_temperature,
      ),

    battery_temperature_status:
      normalizeTemperatureStatus(
        data?.battery_temperature_status,
      ),

    // --------------------------------------------------------
    // DEPTH OF DISCHARGE
    // --------------------------------------------------------

    dod_status:
      data?.dod_status === "Safe"
        ? "Safe"
        : "Unsafe",

    // --------------------------------------------------------
    // SOLAR PANEL TEMPERATURE
    // --------------------------------------------------------

    solar_temperature:
      normalizeNumber(
        data?.solar_temperature,
      ),

    solar_temperature_status:
      normalizeTemperatureStatus(
        data?.solar_temperature_status,
      ),

    // --------------------------------------------------------
    // INTERIOR TEMPERATURE
    // --------------------------------------------------------

    interior_temp:
      normalizeNumber(
        data?.interior_temp,
      ),

    interior_temp_status:
      normalizeTemperatureStatus(
        data?.interior_temp_status,
      ),
  };
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
  "adlawatt.monitoring.last.v1";

const scopedMonitoringKey = (
  userId: string,
): string =>
  `${MONITORING_CACHE_KEY}:${userId}`;

interface CachedMonitoring {
  data: MonitoringData;
  savedAt: number;
}

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

    const parsed = JSON.parse(raw) as {
      data?: unknown;
      savedAt?: unknown;
    };

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Number.isFinite(
        (parsed as { savedAt?: unknown })
          .savedAt,
      )
    ) {
      return null;
    }

    return {
      // Re-normalized on load so corrupt or legacy shapes
      // can never leak untrusted values into the UI.
      data: normalizeMonitoringData(
        parsed.data,
      ),
      savedAt: Number(parsed.savedAt),
    };
  } catch {
    return null;
  }
};

// ============================================================
// FETCH MONITORING DATA
// ============================================================

export const getMonitoringData =
  async (): Promise<MonitoringData | null> => {

    const user = await getAuthenticatedUserSafe();

    if (!user) {

      return null;
    }

    const {
      data,
      error,
    } = await supabase
      .from("monitoring")
      .select(`
        battery_level,
        battery_status,
        time_remaining,
        voltage,
        watt_hours,
        solar_input,
        solar_status,
        solar_timer,
        solar_voltage,
        solar_current,
        total_energy,
        current_load,
        device_status,
        battery_temperature,
        battery_temperature_status,
        dod_status,
        solar_temperature,
        solar_temperature_status,
        interior_temp,
        interior_temp_status
      `)
      .eq(
        "user_id",
        user.id,
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

    const normalized =
      normalizeMonitoringData(
        data,
      );

    // Fire-and-forget: the dashboard must never wait on
    // storage, and a blocked store must not break reads.
    void saveCachedMonitoring(
      normalized,
      user.id,
    );

    return normalized;
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

    const {
      data,
      error,
    } = await supabase
      .from("monitoring")
      .select(
        "device_status",
      )
      .eq(
        "user_id",
        user.id,
      )
      .maybeSingle();

    if (error) {

      console.error(
        "Error loading device status:",
        error,
      );

      return "Offline";
    }

    return data?.device_status === "Online"
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

    const topic = `monitoring-hook-${user.id}`;

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
            filter: `user_id=eq.${user.id}`,
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

              onChange(
                normalizeMonitoringData(
                  payload.new,
                ),
              );
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
              payload.new?.device_status ===
                "Online"
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
            await getMonitoringData();

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

