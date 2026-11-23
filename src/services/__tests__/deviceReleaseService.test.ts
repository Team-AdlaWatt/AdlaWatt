import { supabase } from "@/lib/supabase";
import {
  DeviceReleaseError,
  bindDevice,
  getDeviceBinding,
  pollDeviceRelease,
  requestDeviceRelease,
} from "@/services/deviceReleaseService";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const invoke = supabase.functions.invoke as jest.Mock;

const respond = (data: unknown) => ({ data, error: null });

const failWith = (error: unknown) => ({ data: null, error });

describe("deviceReleaseService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("reads an unbound status", async () => {
    invoke.mockResolvedValueOnce(respond({ status: "unbound" }));

    await expect(getDeviceBinding()).resolves.toEqual({
      status: "unbound",
    });
    expect(invoke).toHaveBeenCalledWith("device-release", {
      body: { action: "status" },
    });
  });

  test("reads a bound status with pending release details", async () => {
    invoke.mockResolvedValueOnce(
      respond({
        status: "release_pending",
        device_id: "AW-01",
        monitor_id: 1100,
        key_id: "key-1",
        pending_release: true,
      }),
    );

    await expect(getDeviceBinding()).resolves.toEqual({
      status: "release_pending",
      device_id: "AW-01",
      monitor_id: 1100,
      key_id: "key-1",
      pending_release: true,
    });
  });

  test("binds a device with the expected body and returns the secret once", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    invoke.mockResolvedValueOnce(
      respond({
        status: "binding",
        device_id: "AW-01",
        monitor_id: 1100,
        key_id: "key-1",
        secret: "top-secret",
      }),
    );

    await expect(bindDevice("AW-01", 1100)).resolves.toEqual({
      status: "binding",
      device_id: "AW-01",
      monitor_id: 1100,
      key_id: "key-1",
      secret: "top-secret",
    });
    expect(invoke).toHaveBeenCalledWith("device-release", {
      body: {
        action: "bind",
        device_id: "AW-01",
        monitor_id: 1100,
      },
    });
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("requests a release", async () => {
    invoke.mockResolvedValueOnce(
      respond({
        status: "release_pending",
        command_id: "cmd-1",
        expires_at: "2026-11-23T00:00:00.000Z",
      }),
    );

    await expect(requestDeviceRelease("AW-01")).resolves.toEqual({
      status: "release_pending",
      command_id: "cmd-1",
      expires_at: "2026-11-23T00:00:00.000Z",
    });
    expect(invoke).toHaveBeenCalledWith("device-release", {
      body: {
        action: "release",
        device_id: "AW-01",
      },
    });
  });

  test("accepts an immediate release response for an unbound device", async () => {
    invoke.mockResolvedValueOnce(respond({ status: "released" }));

    await expect(requestDeviceRelease("AW-01")).resolves.toEqual({
      status: "released",
    });
  });

  test("maps transport and body errors to release error codes", async () => {
    invoke.mockResolvedValueOnce(failWith({ status: 401, message: "No session" }));
    await expect(getDeviceBinding()).rejects.toMatchObject({
      code: "unauthorized",
    });

    invoke.mockResolvedValueOnce(failWith({ status: 404 }));
    await expect(getDeviceBinding()).rejects.toMatchObject({
      code: "not_found",
    });

    invoke.mockResolvedValueOnce(failWith({ status: 409 }));
    await expect(getDeviceBinding()).rejects.toMatchObject({
      code: "conflict",
    });

    invoke.mockResolvedValueOnce(respond({ error: { code: "conflict" } }));
    await expect(getDeviceBinding()).rejects.toMatchObject({
      code: "conflict",
    });

    invoke.mockRejectedValueOnce(new Error("offline"));
    await expect(getDeviceBinding()).rejects.toMatchObject({
      code: "network",
    });

    invoke.mockResolvedValueOnce(respond({ status: "unknown" }));
    await expect(getDeviceBinding()).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  test("polls until the binding is unbound", async () => {
    invoke
      .mockResolvedValueOnce(
        respond({
          status: "release_pending",
          device_id: "AW-01",
          monitor_id: 1100,
          key_id: "key-1",
          pending_release: true,
        }),
      )
      .mockResolvedValueOnce(
        respond({
          status: "binding",
          device_id: "AW-01",
          monitor_id: 1100,
          key_id: "key-1",
          pending_release: false,
        }),
      )
      .mockResolvedValueOnce(respond({ status: "unbound" }));

    await expect(
      pollDeviceRelease("AW-01", { timeoutMs: 200, intervalMs: 1 }),
    ).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  test("does not resolve while release is pending and times out", async () => {
    invoke.mockResolvedValue(
      respond({
        status: "release_pending",
        device_id: "AW-01",
        monitor_id: 1100,
        key_id: "key-1",
        pending_release: true,
      }),
    );

    let settled = false;
    const polling = pollDeviceRelease("AW-01", {
      timeoutMs: 60,
      intervalMs: 5,
    });
    void polling.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);
    expect(invoke).toHaveBeenCalled();

    await expect(polling).rejects.toBeInstanceOf(DeviceReleaseError);
    expect(settled).toBe(true);
  });
});
