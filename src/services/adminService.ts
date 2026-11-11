// ============================================================
// ADMIN SERVICE
//
// Privacy-safe fleet data for the admin dashboard. Reads only
// through the SECURITY DEFINER RPCs get_admin_fleet_health()
// and get_admin_fleet_users(), which verify the caller is an
// admin server-side and return aggregates only (no user_ids,
// emails, usernames, or raw monitoring rows). Household rows
// carry sequential pseudonyms assigned by first-seen order.
// ============================================================

import { supabase } from "@/lib/supabase";

export interface AdminFleetHealth {
  device_count: number;
  online_count: number;
  avg_battery: number | null;
  avg_voltage: number | null;
  total_solar_wh_24h: number;
  low_battery_count: number;
  last_updated: string | null;
}

interface RpcResult {
  device_count?: number | null;
  online_count?: number | null;
  avg_battery?: number | null;
  avg_voltage?: number | null;
  total_solar_wh_24h?: number | null;
  low_battery_count?: number | null;
  last_updated?: string | null;
}

export interface AdminFleetUser {
  pseudonym: string;
  is_online: boolean;
  avg_battery: number | null;
  avg_voltage: number | null;
  solar_wh_24h: number;
  low_battery_count: number;
  last_updated: string | null;
}

interface FleetUserRpcResult {
  pseudonym?: string | null;
  is_online?: boolean | null;
  avg_battery?: number | null;
  avg_voltage?: number | null;
  solar_wh_24h?: number | null;
  low_battery_count?: number | null;
  last_updated?: string | null;
}

export async function getAdminFleetHealth(): Promise<{
  data: AdminFleetHealth | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc(
      "get_admin_fleet_health",
    );

    if (error) {
      return {
        data: null,
        error: error.message || "Failed to load fleet health",
      };
    }

    const result = (data ?? {}) as RpcResult;

    return {
      data: {
        device_count: Number(result.device_count ?? 0),
        online_count: Number(result.online_count ?? 0),
        avg_battery:
          result.avg_battery == null
            ? null
            : Number(result.avg_battery),
        avg_voltage:
          result.avg_voltage == null
            ? null
            : Number(result.avg_voltage),
        total_solar_wh_24h: Number(
          result.total_solar_wh_24h ?? 0,
        ),
        low_battery_count: Number(
          result.low_battery_count ?? 0,
        ),
        last_updated: result.last_updated ?? null,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load fleet health",
    };
  }
}

export async function getAdminFleetUsers(): Promise<{
  data: AdminFleetUser[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc(
      "get_admin_fleet_users",
    );

    if (error) {
      return {
        data: null,
        error: error.message || "Failed to load fleet users",
      };
    }

    const rows = Array.isArray(data)
      ? (data as FleetUserRpcResult[])
      : [];

    return {
      data: rows.map((row) => ({
        pseudonym: row.pseudonym ?? "Household —",
        is_online: row.is_online === true,
        avg_battery:
          row.avg_battery == null
            ? null
            : Number(row.avg_battery),
        avg_voltage:
          row.avg_voltage == null
            ? null
            : Number(row.avg_voltage),
        solar_wh_24h: Number(row.solar_wh_24h ?? 0),
        low_battery_count: Number(
          row.low_battery_count ?? 0,
        ),
        last_updated: row.last_updated ?? null,
      })),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load fleet users",
    };
  }
}
