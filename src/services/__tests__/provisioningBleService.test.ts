import { BleManager, type BlePermissions } from "expo-ble-kit";
import {
  BLE_CONFIG_MANUFACTURER_ID,
  BLE_CONFIG_STATUS_CONFIGURED,
  BLE_CONFIG_STATUS_OPEN,
  ProvisioningTimeoutError,
  ProvisioningValidationError,
  buildProvisioningPayload,
  filterProvisioningScanResults,
  getBlePermissionState,
  getBleReadiness,
  isTerminalStatus,
  parseDeviceConfigStatus,
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
  let connectionStateListener:
    | ((state: string) => void)
    | undefined;

  const peripheral = {
    state: "disconnected",
    addConnectionStateListener: jest.fn(
      (listener: (state: string) => void) => {
        connectionStateListener = listener;
        return { remove: jest.fn() };
      },
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
    emitConnectionState: (state: string) => {
      connectionStateListener?.(state);
    },
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

  test("omits key_id and secret unless both are provided", () => {
    expect(
      JSON.parse(buildProvisioningPayload({ ...validConfig, keyId: "key-1" })),
    ).not.toHaveProperty("key_id");
    expect(
      JSON.parse(
        buildProvisioningPayload({ ...validConfig, secret: "top-secret" }),
      ),
    ).not.toHaveProperty("secret");
  });

  test("includes key_id and secret when both are provided", () => {
    expect(
      JSON.parse(
        buildProvisioningPayload({
          ...validConfig,
          keyId: "key-1",
          secret: "top-secret",
        }),
      ),
    ).toEqual({
      device_code: "482913",
      device_id: "AW-01",
      wifi_ssid: "AdlaWatt-Test",
      wifi_password: "password123",
      monitor_id: 1100,
      key_id: "key-1",
      secret: "top-secret",
    });
  });
});

describe("device discovery", () => {
  test("accepts only the exact AW-01 advertised name", () => {
    expect(
      filterProvisioningScanResults([
        { id: "aw-01", name: "AdlaWatt-AW-01", rssi: -50 },
        { id: "other", name: "AdlaWatt-Other", rssi: -40 },
        { id: "nameless", name: null, rssi: -30 },
      ]),
    ).toEqual([
      {
        id: "aw-01",
        name: "AdlaWatt-AW-01",
        rssi: -50,
        configStatus: "unknown",
      },
    ]);
  });

  test("reads configuration status from manufacturer data", () => {
    const open = {
      id: "open",
      name: "AdlaWatt-AW-01",
      rssi: -50,
      manufacturerData: {
        [BLE_CONFIG_MANUFACTURER_ID]: Uint8Array.of(BLE_CONFIG_STATUS_OPEN),
      },
    };
    const configured = {
      id: "configured",
      name: "AdlaWatt-AW-01",
      rssi: -60,
      manufacturerData: {
        [BLE_CONFIG_MANUFACTURER_ID]: Uint8Array.of(
          BLE_CONFIG_STATUS_CONFIGURED,
        ),
      },
    };

    expect(parseDeviceConfigStatus(open)).toBe("open");
    expect(parseDeviceConfigStatus(configured)).toBe("configured");
    expect(
      filterProvisioningScanResults([open, configured]).map(
        (device) => device.configStatus,
      ),
    ).toEqual(["open", "configured"]);
  });

  test("treats missing or invalid status bytes as unknown", () => {
    expect(parseDeviceConfigStatus({ id: "a", name: null, rssi: -50 })).toBe(
      "unknown",
    );
    expect(
      parseDeviceConfigStatus({
        id: "b",
        name: null,
        rssi: -50,
        manufacturerData: { [BLE_CONFIG_MANUFACTURER_ID]: Uint8Array.of(0x09) },
      }),
    ).toBe("unknown");
    expect(
      parseDeviceConfigStatus({
        id: "c",
        name: null,
        rssi: -50,
        manufacturerData: { [BLE_CONFIG_MANUFACTURER_ID]: new Uint8Array() },
      }),
    ).toBe("unknown");
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

  test("parses configured acknowledgment fields", () => {
    expect(
      parseProvisioningStatusDetail(
        encode(
          JSON.stringify({
            status: "configured",
            device_id: "AW-01",
            monitor_id: 1100,
          }),
        ),
      ),
    ).toEqual({
      status: "configured",
      raw: "configured",
      ack: {
        deviceId: "AW-01",
        monitorId: 1100,
      },
    });
  });

  test("cleans NUL bytes and whitespace", () => {
    expect(
      parseProvisioningStatusDetail(
        encode("  wifi_failed\u0000\n"),
      ),
    ).toEqual({
      status: "wifi_failed",
      raw: "wifi_failed",
    });
  });

  test("treats unknown tokens as non-terminal debug data", () => {
    expect(parseProvisioningStatus(encode("mystery"))).toBeNull();
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
    expect(isTerminalStatus("wifi_lost")).toBe(false);
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
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    debugSpy.mockRestore();
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

    const writeCall = (peripheral.writeStream as jest.Mock).mock.calls[0];
    const sentPayload = new TextDecoder().decode(
      writeCall[2] as Uint8Array,
    );

    expect(JSON.parse(sentPayload)).toEqual({
      device_code: "482913",
      device_id: "AW-01",
      wifi_ssid: validConfig.wifiSsid,
      wifi_password: validConfig.wifiPassword,
      monitor_id: validConfig.monitorId,
    });

    const notifyNow = notify as ((value: Uint8Array) => void) | undefined;
    notifyNow?.(encode("configured"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toEqual([
      "connecting",
      "connected",
      "subscribed",
      "writing",
      "configured",
    ]);
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

  test("accepts a matching configured acknowledgment", async () => {
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
    const ackIssues: (string | undefined)[] = [];
    const session = await provisionDevice(
      "device-id",
      validConfig,
      (status, ack) => {
        statuses.push(status);
        ackIssues.push(ack?.issue);
      },
      { timeoutMs: 1000 },
    );

    notify?.(
      encode(
        JSON.stringify({
          status: "configured",
          device_id: "AW-01",
          monitor_id: validConfig.monitorId,
        }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toContain("configured");
    expect(ackIssues).toContain(undefined);
    expect(peripheral.disconnect).toHaveBeenCalled();

    await session.dispose();
  });

  test("rejects a mismatched monitor_id acknowledgment", async () => {
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
    const ackIssues: (string | undefined)[] = [];
    const session = await provisionDevice(
      "device-id",
      validConfig,
      (status, ack) => {
        statuses.push(status);
        ackIssues.push(ack?.issue);
      },
      { timeoutMs: 1000 },
    );

    notify?.(
      encode(
        JSON.stringify({
          status: "configured",
          device_id: "AW-01",
          monitor_id: validConfig.monitorId + 1,
        }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toContain("error");
    expect(statuses).not.toContain("configured");
    expect(ackIssues).toContain("ack_monitor_id_mismatch");
    expect(peripheral.disconnect).toHaveBeenCalled();

    await session.dispose();
  });

  test("rejects a mismatched device_id acknowledgment", async () => {
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
    const ackIssues: (string | undefined)[] = [];
    const session = await provisionDevice(
      "device-id",
      validConfig,
      (status, ack) => {
        statuses.push(status);
        ackIssues.push(ack?.issue);
      },
      { timeoutMs: 1000 },
    );

    notify?.(
      encode(
        JSON.stringify({
          status: "configured",
          device_id: "AW-02",
          monitor_id: validConfig.monitorId,
        }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toContain("error");
    expect(ackIssues).toContain("ack_device_id_mismatch");
    expect(peripheral.disconnect).toHaveBeenCalled();

    await session.dispose();
  });

  test("does not terminate on unknown notifications or wifi_lost warnings", async () => {
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

    notify?.(encode("mystery"));
    notify?.(encode("wifi_lost"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toContain("wifi_lost");
    expect(statuses).not.toContain("error");
    expect(peripheral.disconnect).not.toHaveBeenCalled();

    await session.dispose();
  });

  test("terminates on wifi_failed", async () => {
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

    notify?.(encode("wifi_failed"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toContain("wifi_failed");
    expect(peripheral.disconnect).toHaveBeenCalled();

    await session.dispose();
  });

  test("terminates when BLE disconnects during provisioning", async () => {
    const peripheral = createPeripheral();
    (BleManager.getPeripheral as jest.Mock).mockReturnValue(peripheral);

    const statuses: UiStatus[] = [];
    const session = await provisionDevice(
      "device-id",
      validConfig,
      (status) => statuses.push(status),
      { timeoutMs: 1000 },
    );

    peripheral.emitConnectionState("disconnected");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toContain("disconnected");
    expect(peripheral.disconnect).toHaveBeenCalled();

    await session.dispose();
  });
});
