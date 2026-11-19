import { BleManager, type BlePermissions } from "expo-ble-kit";
import {
  ProvisioningTimeoutError,
  ProvisioningValidationError,
  buildProvisioningPayload,
  getBlePermissionState,
  getBleReadiness,
  isTerminalStatus,
  parseProvisioningStatus,
  parseProvisioningStatusDetail,
  provisionDevice,
  validateProvisioningConfig,
  type ProvisioningConfig,
  type UiStatus,
} from "@/services/provisioningBleService";

jest.mock("expo-ble-kit", () => ({
  BleManager: {
    state: "poweredOn",
    addStateListener: jest.fn(() => ({ remove: jest.fn() })),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getPeripheral: jest.fn(),
    startScan: jest.fn(),
  },
}));

const encode = (value: string): Uint8Array =>
  new TextEncoder().encode(value);

const validConfig: ProvisioningConfig = {
  wifiSsid: "AdlaWatt-Test",
  wifiPassword: "password123",
  monitorId: 1100,
};

const createPeripheral = () => {
  const peripheral = {
    state: "disconnected",
    addConnectionStateListener: jest.fn(
      (_listener: (state: string) => void) => ({ remove: jest.fn() }),
    ),
    connect: jest.fn(async (_options?: { signal?: AbortSignal }) => {
      peripheral.state = "connected";
    }),
    subscribe: jest.fn(
      async (
        _service?: unknown,
        _characteristic?: unknown,
        _callback?: (value: Uint8Array) => void,
      ) => ({ remove: jest.fn() }),
    ),
    writeStream: jest.fn(
      async (
        _service?: unknown,
        _characteristic?: unknown,
        _data?: Uint8Array,
        _options?: { signal?: AbortSignal },
      ): Promise<void> => {
        return undefined;
      },
    ),
    disconnect: jest.fn(async () => {
      peripheral.state = "disconnected";
    }),
  };

  return peripheral;
};

describe("provisioning payload", () => {
  test("builds the firmware contract exactly", () => {
    expect(JSON.parse(buildProvisioningPayload(validConfig))).toEqual({
      device_code: "482913",
      device_id: "AW-01",
      wifi_ssid: "AdlaWatt-Test",
      wifi_password: "password123",
      monitor_id: 1100,
    });
  });
});

describe("provisioning status parsing", () => {
  test("parses plain firmware tokens", () => {
    expect(parseProvisioningStatusDetail(encode("wifi_connected"))).toEqual({
      status: "wifi_connected",
      raw: "wifi_connected",
    });
    expect(parseProvisioningStatus(encode(" CONFIGURED "))).toBe("configured");
  });

  test("parses JSON status envelopes", () => {
    expect(
      parseProvisioningStatusDetail(
        encode(JSON.stringify({ status: "WIFI_FAILED" })),
      ),
    ).toEqual({ status: "wifi_failed", raw: "WIFI_FAILED" });

    expect(
      parseProvisioningStatusDetail(
        encode(JSON.stringify({ state: "configured" })),
      ).status,
    ).toBe("configured");
  });

  test("falls back to error for unknown tokens", () => {
    expect(parseProvisioningStatus(encode("mystery"))).toBe("error");
  });
});

describe("provisioning config validation", () => {
  test("accepts contract-compatible config", () => {
    expect(validateProvisioningConfig(validConfig)).toBeNull();
    expect(
      validateProvisioningConfig({
        ...validConfig,
        wifiSsid: "a".repeat(32),
        wifiPassword: "b".repeat(64),
        monitorId: 0xffffffff,
      }),
    ).toBeNull();
  });

  test("rejects values the firmware cannot accept", () => {
    expect(
      validateProvisioningConfig({ ...validConfig, wifiSsid: "" }),
    ).toBe("ssid_required");
    expect(
      validateProvisioningConfig({ ...validConfig, wifiSsid: "a".repeat(33) }),
    ).toBe("ssid_too_long");
    expect(
      validateProvisioningConfig({
        ...validConfig,
        wifiPassword: "b".repeat(65),
      }),
    ).toBe("password_too_long");
    expect(
      validateProvisioningConfig({ ...validConfig, monitorId: 0 }),
    ).toBe("monitor_id_invalid");
    expect(
      validateProvisioningConfig({ ...validConfig, monitorId: 1.5 }),
    ).toBe("monitor_id_invalid");
    expect(
      validateProvisioningConfig({ ...validConfig, monitorId: 0x100000000 }),
    ).toBe("monitor_id_invalid");
    expect(
      validateProvisioningConfig({ ...validConfig, wifiSsid: "bad\u0000ssid" }),
    ).toBe("invalid_text");
  });
});

describe("provisioning terminal states", () => {
  test("classifies terminal statuses", () => {
    expect(isTerminalStatus("configured")).toBe(true);
    expect(isTerminalStatus("wifi_failed")).toBe(true);
    expect(isTerminalStatus("disconnected")).toBe(true);
    expect(isTerminalStatus("timeout")).toBe(true);
    expect(isTerminalStatus("busy")).toBe(false);
    expect(isTerminalStatus("connecting")).toBe(false);
  });
});

describe("BLE readiness", () => {
  test("maps permissions and adapter state", () => {
    const permissions = {
      scan: "granted",
      connect: "granted",
      canAskAgain: true,
    } as unknown as BlePermissions;

    expect(getBlePermissionState(null)).toBe("undetermined");
    expect(getBlePermissionState(permissions)).toBe("granted");
    expect(getBleReadiness("poweredOn", permissions)).toBe("ready");
    expect(getBleReadiness("poweredOff", permissions)).toBe("poweredOff");
  });
});

describe("provisionDevice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects invalid config before touching BLE", async () => {
    await expect(
      provisionDevice(
        "device-id",
        { ...validConfig, monitorId: 0 },
        jest.fn(),
      ),
    ).rejects.toBeInstanceOf(ProvisioningValidationError);

    expect(BleManager.getPeripheral).not.toHaveBeenCalled();
  });

  test("uses acknowledged writes and disposes after a terminal status", async () => {
    const peripheral = createPeripheral();
    let notify: ((value: Uint8Array) => void) | undefined;

    peripheral.subscribe.mockImplementation(
      async (_service, _characteristic, callback) => {
        if (callback) {
          notify = callback;
        }
        return { remove: jest.fn() };
      },
    );

    (BleManager.getPeripheral as jest.Mock).mockReturnValue(peripheral);

    const statuses: UiStatus[] = [];
    const session = await provisionDevice(
      "device-id",
      validConfig,
      (status) => statuses.push(status),
      { timeoutMs: 1000 },
    );

    expect(peripheral.connect).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 15000 }),
    );
    expect(peripheral.writeStream).toHaveBeenCalledWith(
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
      "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
      expect.any(Uint8Array),
      expect.objectContaining({
        withResponse: true,
        chunkSize: 512,
        timeoutMs: 10000,
      }),
    );

    const notifyNow = notify as ((value: Uint8Array) => void) | undefined;
    notifyNow?.(encode("configured"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toContain("connecting");
    expect(statuses).toContain("configured");
    expect(peripheral.disconnect).toHaveBeenCalled();

    await session.dispose();
  });

  test("emits timeout when no terminal status arrives", async () => {
    const peripheral = createPeripheral();
    (BleManager.getPeripheral as jest.Mock).mockReturnValue(peripheral);

    const statuses: UiStatus[] = [];
    const session = await provisionDevice(
      "device-id",
      validConfig,
      (status) => statuses.push(status),
      { timeoutMs: 20 },
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(statuses).toContain("timeout");
    expect(peripheral.disconnect).toHaveBeenCalled();

    await session.dispose();
  });

  test("throws a timeout error when the deadline hits during setup", async () => {
    const peripheral = createPeripheral();
    peripheral.writeStream.mockImplementation(
      (_service, _characteristic, _data, options) =>
        new Promise<void>((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
    );
    (BleManager.getPeripheral as jest.Mock).mockReturnValue(peripheral);

    await expect(
      provisionDevice("device-id", validConfig, jest.fn(), { timeoutMs: 20 }),
    ).rejects.toBeInstanceOf(ProvisioningTimeoutError);
  });
});
