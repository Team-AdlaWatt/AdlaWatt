import {
  getAdminFleetHistory,
  getAdminFleetOverview,
} from "@/services/adminService";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const mockedRpc = supabase.rpc as jest.Mock;

describe("adminService monitoring RPCs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps fleet overview fields to safe numbers", async () => {
    mockedRpc.mockResolvedValue({
      error: null,
      data: {
        device_count: "2",
        online_count: "2",
        avg_battery: "67.4",
        low_battery_count: "0",
        solar_wh_24h: "0.1",
        load_w_avg: "0.6",
        load_wh_24h: "0.8",
        last_updated: "2026-11-23T12:33:18Z",
      },
    });

    const result = await getAdminFleetOverview();

    expect(mockedRpc).toHaveBeenCalledWith(
      "get_admin_fleet_overview",
    );
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      device_count: 2,
      online_count: 2,
      avg_battery: 67.4,
      low_battery_count: 0,
      solar_wh_24h: 0.1,
      load_w_avg: 0.6,
      load_wh_24h: 0.8,
      last_updated: "2026-11-23T12:33:18Z",
    });
  });

  it("passes the selected range and maps history rows", async () => {
    mockedRpc.mockResolvedValue({
      error: null,
      data: [
        {
          bucket_start: "2026-11-23T12:00:00Z",
          avg_battery: "67",
          solar_wh: "0.1",
          avg_load_w: "0.6",
          load_wh: "0.8",
          sample_count: "122",
        },
      ],
    });

    const result = await getAdminFleetHistory(168);

    expect(mockedRpc).toHaveBeenCalledWith(
      "get_admin_fleet_history",
      { p_hours: 168 },
    );
    expect(result.error).toBeNull();
    expect(result.data?.[0]).toEqual({
      bucket_start: "2026-11-23T12:00:00Z",
      avg_battery: 67,
      solar_wh: 0.1,
      avg_load_w: 0.6,
      load_wh: 0.8,
      sample_count: 122,
    });
  });

  it("surfaces RPC errors without partial data", async () => {
    mockedRpc.mockResolvedValue({
      error: { message: "permission denied" },
      data: null,
    });

    const overview = await getAdminFleetOverview();
    const history = await getAdminFleetHistory(24);

    expect(overview).toEqual({
      data: null,
      error: "permission denied",
    });
    expect(history).toEqual({
      data: null,
      error: "permission denied",
    });
  });
});
