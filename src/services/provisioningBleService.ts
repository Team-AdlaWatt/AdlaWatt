import {
  BleManager,
  type BlePermissions,
  type BleState,
  type CharacteristicSubscription,
  type ScanSession,
  type Subscription,
} from "expo-ble-kit";

export const DEVICE_ID = "AW-01";
export const DEVICE_NAME = "AdlaWatt-AW-01";
export const DEVICE_CODE = "482913";
export const DEVICE_NAME_PREFIX = "AdlaWatt-";

const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

export const PROVISIONING_STATUSES = [
  "received",
  "busy",
  "wifi_connected",
  "wifi_failed",
  "wifi_lost",
  "configured",
  "error",
  "disconnected",
] as const;

export type ProvisioningStatus =
  (typeof PROVISIONING_STATUSES)[number];

export type UiStatus = "idle" | "scanning" | "connecting" | ProvisioningStatus;

export const UI_STATUSES: UiStatus[] = [
  "idle",
  "scanning",
  "connecting",
  ...PROVISIONING_STATUSES,
];

export interface ScannedDevice {
  id: string;
  name: string;
  rssi: number;
}

export interface ProvisioningConfig {
  wifiSsid: string;
  wifiPassword: string;
  monitorId: number;
}

export interface ProvisioningSession {
  dispose: () => Promise<void>;
}

const KNOWN_STATUSES = new Set<string>(PROVISIONING_STATUSES);

export function buildProvisioningPayload(
  config: ProvisioningConfig,
): string {
  return JSON.stringify({
    device_code: DEVICE_CODE,
    device_id: DEVICE_ID,
    wifi_ssid: config.wifiSsid,
    wifi_password: config.wifiPassword,
    monitor_id: config.monitorId,
  });
}

export function parseProvisioningStatus(
  value: Uint8Array,
): ProvisioningStatus {
  const text = new TextDecoder().decode(value).trim();

  let candidate = text.toLowerCase();

  try {
    const parsed: unknown = JSON.parse(text);

    if (typeof parsed === "string") {
      candidate = parsed.toLowerCase();
    } else if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const status = record.status ?? record.state;

      if (typeof status === "string") {
        candidate = status.toLowerCase();
      }
    }
  } catch {
    candidate = text.toLowerCase();
  }

  return KNOWN_STATUSES.has(candidate)
    ? (candidate as ProvisioningStatus)
    : "error";
}

export type BlePermissionState =
  | "undetermined"
  | "granted"
  | "denied"
  | "blocked";

export type BleReadiness =
  | "checking"
  | "unknown"
  | "resetting"
  | "unsupported"
  | "unauthorized"
  | "poweredOff"
  | "permission_required"
  | "permission_denied"
  | "permission_blocked"
  | "ready";

export function getBleState(): BleState {
  return BleManager.state;
}

export function subscribeBleState(
  listener: (state: BleState) => void,
): Subscription {
  return BleManager.addStateListener(listener);
}

export async function getBlePermissions(): Promise<BlePermissions> {
  return BleManager.getPermissionsAsync();
}

export async function requestBlePermissions(): Promise<BlePermissions> {
  return BleManager.requestPermissionsAsync({
    scan: true,
    connect: true,
  });
}

export function getBlePermissionState(
  permissions: BlePermissions | null,
): BlePermissionState {
  if (!permissions) {
    return "undetermined";
  }

  if (
    permissions.scan === "granted" &&
    permissions.connect === "granted"
  ) {
    return "granted";
  }

  if (
    permissions.scan === "denied" ||
    permissions.connect === "denied"
  ) {
    return permissions.canAskAgain ? "denied" : "blocked";
  }

  return "undetermined";
}

export function getBleReadiness(
  state: BleState | "checking",
  permissions: BlePermissions | null,
): BleReadiness {
  if (state === "checking" || state === "unknown") {
    return state;
  }

  if (state === "resetting") {
    return "resetting";
  }

  if (state === "unsupported") {
    return "unsupported";
  }

  if (state === "unauthorized") {
    return "unauthorized";
  }

  if (state === "poweredOff") {
    return "poweredOff";
  }

  const permissionState = getBlePermissionState(permissions);

  if (permissionState === "granted") {
    return "ready";
  }

  if (permissionState === "blocked") {
    return "permission_blocked";
  }

  if (permissionState === "denied") {
    return "permission_denied";
  }

  return "permission_required";
}

export async function requestBleAccess(): Promise<void> {
  const permissions = await requestBlePermissions();

  if (
    permissions.scan !== "granted" ||
    permissions.connect !== "granted"
  ) {
    throw new Error("Bluetooth permissions are required.");
  }

  if (BleManager.state !== "poweredOn") {
    throw new Error("Bluetooth is turned off.");
  }
}

export function startDeviceScan(
  onResults: (devices: ScannedDevice[]) => void,
  onError?: (message: string) => void,
): ScanSession {
  return BleManager.startScan(
    { namePrefix: DEVICE_NAME_PREFIX },
    (results) => {
      onResults(
        results
          .filter((result) =>
            result.name?.startsWith(DEVICE_NAME_PREFIX),
          )
          .map((result) => ({
            id: result.id,
            name: result.name ?? DEVICE_NAME,
            rssi: result.rssi,
          })),
      );
    },
    (error) => onError?.(error.message),
  );
}

export async function provisionDevice(
  deviceId: string,
  config: ProvisioningConfig,
  onStatus: (status: UiStatus) => void,
): Promise<ProvisioningSession> {
  const peripheral = BleManager.getPeripheral(deviceId);

  let connectionListener: Subscription | null = null;
  let txSubscription: CharacteristicSubscription | null = null;
  let disposed = false;

  const dispose = async (): Promise<void> => {
    disposed = true;
    connectionListener?.remove();
    txSubscription?.remove();

    try {
      if (
        peripheral.state === "connected" ||
        peripheral.state === "connecting"
      ) {
        await peripheral.disconnect();
      }
    } catch {
      return;
    }
  };

  try {
    connectionListener = peripheral.addConnectionStateListener(
      (state) => {
        if (disposed) {
          return;
        }

        if (state === "disconnected") {
          onStatus("disconnected");
        } else if (state === "reconnecting") {
          onStatus("busy");
        }
      },
    );

    onStatus("connecting");
    await peripheral.connect({ timeoutMs: 15000 });

    txSubscription = await peripheral.subscribe(
      SERVICE_UUID,
      TX_UUID,
      (value) => onStatus(parseProvisioningStatus(value)),
      { timeoutMs: 10000 },
    );

    const payload = new TextEncoder().encode(
      buildProvisioningPayload(config),
    );

    await peripheral.writeStream(
      SERVICE_UUID,
      RX_UUID,
      payload,
      { timeoutMs: 10000 },
    );
  } catch (error) {
    await dispose();
    throw error;
  }

  return { dispose };
}
