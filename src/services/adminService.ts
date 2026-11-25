import { supabase } from "@/lib/supabase";
import type { AdminHistoryRange } from "@/admin/constants";

export interface AdminFleetOverview {
  device_count: number;
  online_count: number;
  avg_battery: number | null;
  low_battery_count: number;
  solar_wh_24h: number;
  load_w_avg: number | null;
  load_wh_24h: number;
  last_updated: string | null;
}

export interface AdminFleetHistoryPoint {
  bucket_start: string;
  avg_battery: number;
  solar_wh: number;
  avg_load_w: number;
  load_wh: number;
  sample_count: number;
}

interface OverviewRpcResult {
  device_count?: number | null;
  online_count?: number | null;
  avg_battery?: number | null;
  low_battery_count?: number | null;
  solar_wh_24h?: number | null;
  load_w_avg?: number | null;
  load_wh_24h?: number | null;
  last_updated?: string | null;
}

interface HistoryRpcResult {
  bucket_start?: string | null;
  avg_battery?: number | null;
  solar_wh?: number | null;
  avg_load_w?: number | null;
  load_wh?: number | null;
  sample_count?: number | null;
}

function toNumber(value: number | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(
  value: number | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function getAdminFleetOverview(): Promise<{
  data: AdminFleetOverview | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc(
      "get_admin_fleet_overview",
    );

    if (error) {
      return {
        data: null,
        error:
          error.message || "Failed to load fleet overview",
      };
    }

    if (!data) {
      return {
        data: null,
        error: "Fleet overview is unavailable",
      };
    }

    const result = data as OverviewRpcResult;

    return {
      data: {
        device_count: toNumber(result.device_count),
        online_count: toNumber(result.online_count),
        avg_battery: toNullableNumber(result.avg_battery),
        low_battery_count: toNumber(
          result.low_battery_count,
        ),
        solar_wh_24h: toNumber(result.solar_wh_24h),
        load_w_avg: toNullableNumber(result.load_w_avg),
        load_wh_24h: toNumber(result.load_wh_24h),
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
          : "Failed to load fleet overview",
    };
  }
}

export async function getAdminFleetHistory(
  range: AdminHistoryRange,
): Promise<{
  data: AdminFleetHistoryPoint[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc(
      "get_admin_fleet_history",
      { p_hours: range },
    );

    if (error) {
      return {
        data: null,
        error:
          error.message || "Failed to load fleet history",
      };
    }

    const rows = Array.isArray(data)
      ? (data as HistoryRpcResult[])
      : [];

    return {
      data: rows.map((row) => ({
        bucket_start:
          row.bucket_start ?? new Date().toISOString(),
        avg_battery: toNumber(row.avg_battery),
        solar_wh: toNumber(row.solar_wh),
        avg_load_w: toNumber(row.avg_load_w),
        load_wh: toNumber(row.load_wh),
        sample_count: toNumber(row.sample_count),
      })),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load fleet history",
    };
  }
}
