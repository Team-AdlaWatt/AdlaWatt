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

export const PROVISIONING_TIMEOUT_MS = 60000;
const CONNECT_TIMEOUT_MS = 15000;
const SUBSCRIBE_TIMEOUT_MS = 10000;
const WRITE_TIMEOUT_MS = 10000;
const WRITE_CHUNK_SIZE = 512;
const FALLBACK_MTU = 517;
const MAX_SSID_BYTES = 32;
const MAX_PASSWORD_BYTES = 64;
const MAX_MONITOR_ID = 0xffffffff;

const normalizeUuid = (value: unknown): string =>
  typeof value === "string" ? value.toLowerCase() : "";

const debugProvisioning = (
  event: string,
  details: Record<string, unknown>,
): void => {
  if (__DEV__) {
    console.debug(`[provisioning] ${event}`, details);
  }
};

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

const APP_STATUSES = [
  "idle",
  "scanning",
  "connecting",
  "connected",
  "subscribed",
  "writing",
  "timeout",
] as const;

export type UiStatus =
  (typeof APP_STATUSES)[number] | ProvisioningStatus;

export const UI_STATUSES: UiStatus[] = [
  ...APP_STATUSES,
  ...PROVISIONING_STATUSES,
];

export const TERMINAL_SUCCESS_STATUSES: readonly ProvisioningStatus[] = [
  "configured",
];

export const TERMINAL_FAILURE_STATUSES: readonly UiStatus[] = [
  "wifi_failed",
  "error",
  "disconnected",
  "timeout",
];

export const TERMINAL_STATUSES: readonly UiStatus[] = [
  ...TERMINAL_SUCCESS_STATUSES,
  ...TERMINAL_FAILURE_STATUSES,
];

export const isTerminalStatus = (
  status: UiStatus,
): boolean => TERMINAL_STATUSES.includes(status);

export interface ScannedDevice {
  id: string;
  name: string;
  rssi: number;
}

export interface NamedScanResult {
  id: string;
  name?: string | null;
  rssi: number;
}

export interface ProvisioningConfig {
  wifiSsid: string;
  wifiPassword: string;
  monitorId: number;
}

export interface ProvisioningOptions {
  timeoutMs?: number;
  onSession?: (session: ProvisioningSession) => void;
}

export interface ProvisioningSession {
  dispose: () => Promise<void>;
}

export type ProvisioningAcknowledgementIssue =
  | "ack_monitor_id_mismatch"
  | "ack_device_id_mismatch";

export interface ProvisioningStatusAck {
  deviceId?: string | null;
  monitorId?: number | null;
  issue?: ProvisioningAcknowledgementIssue;
}

export interface ProvisioningStatusUpdate {
  status: ProvisioningStatus | null;
  raw: string;
  ack?: ProvisioningStatusAck;
}

export type ProvisioningStatusListener = (
  status: UiStatus,
  ack?: ProvisioningStatusAck,
) => void;

export type ProvisioningValidationIssue =
  | "ssid_required"
  | "ssid_too_long"
  | "password_too_long"
  | "monitor_id_invalid"
  | "invalid_text";

export class ProvisioningValidationError extends Error {
  readonly issue: ProvisioningValidationIssue;

  constructor(issue: ProvisioningValidationIssue) {
    super(issue);
    this.name = "ProvisioningValidationError";
    this.issue = issue;
  }
}

export class ProvisioningTimeoutError extends Error {
  constructor() {
    super("Provisioning timed out.");
    this.name = "ProvisioningTimeoutError";
  }
}

export type ProvisioningBleIssue =
  | "ble_error"
  | "write_not_permitted"
  | "tx_descriptor_missing"
  | "characteristic_not_found"
  | "service_not_found"
  | "operation_timeout"
  | "operation_cancelled"
  | "disconnected"
  | "gatt_error";

export class ProvisioningBleError extends Error {
  readonly issue: ProvisioningBleIssue;

  constructor(issue: ProvisioningBleIssue, message?: string) {
    super(message ?? issue);
    this.name = "ProvisioningBleError";
    this.issue = issue;
  }
}

const BLE_ERROR_ISSUE_BY_CODE: Record<string, ProvisioningBleIssue> = {
  WRITE_NOT_PERMITTED: "write_not_permitted",
  DESCRIPTOR_NOT_FOUND: "tx_descriptor_missing",
  CHARACTERISTIC_NOT_FOUND: "characteristic_not_found",
  SERVICE_NOT_FOUND: "service_not_found",
  OPERATION_TIMEOUT: "operation_timeout",
  OPERATION_CANCELLED: "operation_cancelled",
  DISCONNECTED: "disconnected",
  GATT_ERROR: "gatt_error",
  INVALID_ATTRIBUTE_LENGTH: "gatt_error",
  INVALID_ARGUMENT: "gatt_error",
};

const readBleErrorIssue = (error: unknown): ProvisioningBleIssue | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  if (typeof code !== "string") {
    return null;
  }

  return BLE_ERROR_ISSUE_BY_CODE[code] ?? "ble_error";
};

const KNOWN_STATUSES = new Set<string>(PROVISIONING_STATUSES);

const readAckDeviceId = (
  value: unknown,
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "string" ? value.trim() : null;
};

const readAckMonitorId = (
  value: unknown,
): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "number" && Number.isInteger(value)
    ? value
    : null;
};

export const buildProvisioningPayload = (
  config: ProvisioningConfig,
): string => {
  return JSON.stringify({
    device_code: DEVICE_CODE,
    device_id: DEVICE_ID,
    wifi_ssid: config.wifiSsid,
    wifi_password: config.wifiPassword,
    monitor_id: config.monitorId,
  });
};

export const parseProvisioningStatusDetail = (
  value: Uint8Array,
): ProvisioningStatusUpdate => {
  const text =
    new TextDecoder()
      .decode(value)
      .replace(/\0/g, "")
      .trim();

  let raw = text;
  let candidate = text.toLowerCase();
  let ack: ProvisioningStatusAck | undefined;

  try {
    const parsed: unknown = JSON.parse(text);

    if (typeof parsed === "string") {
      raw = parsed;
      candidate = parsed.toLowerCase();
    } else if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const status = record.status ?? record.state;

      if (typeof status === "string") {
        raw = status;
        candidate = status.toLowerCase();
      }

      const deviceId = readAckDeviceId(record.device_id);
      const monitorId = readAckMonitorId(record.monitor_id);

      if (deviceId !== undefined || monitorId !== undefined) {
        ack = { deviceId, monitorId };
      }
    }
  } catch {
    raw = text;
    candidate = text.toLowerCase();
  }

  const result: ProvisioningStatusUpdate = {
    status: KNOWN_STATUSES.has(candidate)
      ? (candidate as ProvisioningStatus)
      : null,
    raw,
  };

  if (ack) {
    result.ack = ack;
  }

  return result;
};

const validateConfiguredAck = (
  ack: ProvisioningStatusAck | undefined,
  expectedMonitorId: number,
): ProvisioningStatusAck | undefined => {
  if (!ack) {
    return undefined;
  }

  if (
    ack.deviceId !== undefined &&
    ack.deviceId !== DEVICE_ID
  ) {
    return {
      ...ack,
      issue: "ack_device_id_mismatch",
    };
  }

  if (
    ack.monitorId !== undefined &&
    ack.monitorId !== expectedMonitorId
  ) {
    return {
      ...ack,
      issue: "ack_monitor_id_mismatch",
    };
  }

  return ack;
};

export const parseProvisioningStatus = (
  value: Uint8Array,
): ProvisioningStatus | null =>
  parseProvisioningStatusDetail(value).status;

export const validateProvisioningConfig = (
  config: ProvisioningConfig,
): ProvisioningValidationIssue | null => {
  if (config.wifiSsid.length === 0) {
    return "ssid_required";
  }

  if (
    config.wifiSsid.includes("\u0000") ||
    config.wifiPassword.includes("\u0000")
  ) {
    return "invalid_text";
  }

  const encoder = new TextEncoder();

  if (encoder.encode(config.wifiSsid).length > MAX_SSID_BYTES) {
    return "ssid_too_long";
  }

  if (encoder.encode(config.wifiPassword).length > MAX_PASSWORD_BYTES) {
    return "password_too_long";
  }

  if (
    !Number.isInteger(config.monitorId) ||
    config.monitorId < 1 ||
    config.monitorId > MAX_MONITOR_ID
  ) {
    return "monitor_id_invalid";
  }

  return null;
};

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

export const filterProvisioningScanResults = (
  results: NamedScanResult[],
): ScannedDevice[] =>
  results
    .filter((result) => result.name === DEVICE_NAME)
    .map((result) => ({
      id: result.id,
      name: result.name ?? DEVICE_NAME,
      rssi: result.rssi,
    }));

export function startDeviceScan(
  onResults: (devices: ScannedDevice[]) => void,
  onError?: (message: string) => void,
): ScanSession {
  return BleManager.startScan(
    { namePrefix: DEVICE_NAME },
    (results) => {
      onResults(filterProvisioningScanResults(results));
    },
    (error) => onError?.(error.message),
  );
}

export async function provisionDevice(
  deviceId: string,
  config: ProvisioningConfig,
  onStatus: ProvisioningStatusListener,
  options: ProvisioningOptions = {},
): Promise<ProvisioningSession> {
  const validationIssue = validateProvisioningConfig(config);

  if (validationIssue) {
    throw new ProvisioningValidationError(validationIssue);
  }

  const timeoutMs = options.timeoutMs ?? PROVISIONING_TIMEOUT_MS;
  const peripheral = BleManager.getPeripheral(deviceId);
  const controller = new AbortController();

  let connectionListener: Subscription | null = null;
  let txSubscription: CharacteristicSubscription | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let terminalReported = false;
  let timedOut = false;
  let lastStatus: UiStatus | null = null;

  const emit = (
    status: UiStatus,
    ack?: ProvisioningStatusAck,
  ): void => {
    if (lastStatus === status) {
      return;
    }

    lastStatus = status;
    onStatus(status, ack);
  };

  const clearTimeoutTimer = (): void => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };

  const dispose = async (reason = "manual"): Promise<void> => {
    if (disposed) {
      return;
    }

    disposed = true;
    debugProvisioning("dispose_start", { reason });
    controller.abort();
    clearTimeoutTimer();

    try {
      connectionListener?.remove();
    } catch {
      void 0;
    }

    try {
      txSubscription?.remove();
    } catch {
      void 0;
    }

    connectionListener = null;
    txSubscription = null;

    const shouldDisconnect =
      peripheral.state === "connected" || peripheral.state === "connecting";

    try {
      if (shouldDisconnect) {
        await peripheral.disconnect();
      }
    } catch {
      void 0;
    }

    debugProvisioning("dispose_complete", {
      reason,
      disconnect_attempted: shouldDisconnect,
    });
  };

  const finish = async (
    status: UiStatus,
    ack?: ProvisioningStatusAck,
  ): Promise<void> => {
    if (terminalReported) {
      return;
    }

    terminalReported = true;
    clearTimeoutTimer();
    emit(status, ack);
    await dispose(status);
  };

  const session: ProvisioningSession = { dispose };
  options.onSession?.(session);

  timeoutTimer = setTimeout(() => {
    timedOut = true;
    void finish("timeout");
  }, timeoutMs);

  const handleNotification = (value: Uint8Array): void => {
    if (disposed || terminalReported) {
      return;
    }

    const update = parseProvisioningStatusDetail(value);

    if (update.status === null) {
      return;
    }

    debugProvisioning("notification", {
      status: update.status,
      raw_length: update.raw.length,
      ack_present: update.ack !== undefined,
      ack_issue: update.ack?.issue ?? null,
    });

    if (update.status === "configured") {
      const ack = validateConfiguredAck(
        update.ack,
        config.monitorId,
      );

      if (ack?.issue) {
        emit("error", ack);
        void finish("error", ack);
        return;
      }

      emit(update.status, ack);
      void finish(update.status, ack);
      return;
    }

    emit(update.status, update.ack);

    if (isTerminalStatus(update.status)) {
      void finish(update.status, update.ack);
    }
  };

  try {
    connectionListener = peripheral.addConnectionStateListener((state) => {
      if (disposed || terminalReported) {
        return;
      }

      if (state === "disconnected") {
        void finish("disconnected");
      } else if (state === "reconnecting") {
        emit("busy");
      }
    });

    emit("connecting");
    debugProvisioning("connecting", { peripheral_id: deviceId });

    await peripheral.connect({
      timeoutMs: CONNECT_TIMEOUT_MS,
      signal: controller.signal,
    });

    emit("connected");
    debugProvisioning("connected", {
      peripheral_id: deviceId,
      device_id: DEVICE_ID,
    });

    const reportedMtu = (peripheral as { mtu?: unknown }).mtu;
    const mtu =
      typeof reportedMtu === "number" && reportedMtu > 0
        ? reportedMtu
        : FALLBACK_MTU;
    const chunkSize = Math.min(
      WRITE_CHUNK_SIZE,
      Math.max(1, mtu - 3),
    );

    const discoveredServices = (
      peripheral as {
        services?: readonly {
          uuid?: unknown;
          characteristics?: readonly { uuid?: unknown }[];
        }[];
      }
    ).services;

    const serviceFound =
      discoveredServices?.some(
        (service) => normalizeUuid(service.uuid) === SERVICE_UUID,
      ) ?? false;
    const rxFound =
      discoveredServices?.some(
        (service) =>
          service.characteristics?.some(
            (characteristic) =>
              normalizeUuid(characteristic.uuid) === RX_UUID,
          ) ?? false,
      ) ?? false;
    const txFound =
      discoveredServices?.some(
        (service) =>
          service.characteristics?.some(
            (characteristic) =>
              normalizeUuid(characteristic.uuid) === TX_UUID,
          ) ?? false,
      ) ?? false;

    debugProvisioning("discovery", {
      service_found: serviceFound,
      rx_found: rxFound,
      tx_found: txFound,
      mtu,
      chunk_size: chunkSize,
    });

    txSubscription = await peripheral.subscribe(
      SERVICE_UUID,
      TX_UUID,
      handleNotification,
      {
        timeoutMs: SUBSCRIBE_TIMEOUT_MS,
        signal: controller.signal,
      },
    );

    emit("subscribed");
    debugProvisioning("subscribed", {
      service_uuid: SERVICE_UUID,
      tx_uuid: TX_UUID,
    });

    const payloadText = buildProvisioningPayload(config);
    const payload = new TextEncoder().encode(payloadText);

    debugProvisioning("writing", {
      service_uuid: SERVICE_UUID,
      rx_uuid: RX_UUID,
      bytes: payload.byteLength,
      mtu,
      chunk_size: chunkSize,
      chunks: Math.ceil(payload.byteLength / chunkSize),
      device_id: DEVICE_ID,
      monitor_id: config.monitorId,
      wifi_ssid_bytes: new TextEncoder().encode(config.wifiSsid).byteLength,
      wifi_password_bytes: new TextEncoder().encode(config.wifiPassword)
        .byteLength,
    });
    emit("writing");

    await peripheral.writeStream(
      SERVICE_UUID,
      RX_UUID,
      payload,
      {
        timeoutMs: WRITE_TIMEOUT_MS,
        signal: controller.signal,
        withResponse: true,
        chunkSize,
      },
    );

    debugProvisioning("write_complete", { bytes: payload.byteLength });

    return session;
  } catch (error) {
    clearTimeoutTimer();
    debugProvisioning("failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    if (timedOut) {
      throw new ProvisioningTimeoutError();
    }

    const bleIssue = readBleErrorIssue(error);

    if (bleIssue) {
      await dispose("error");
      throw new ProvisioningBleError(
        bleIssue,
        error instanceof Error ? error.message : String(error),
      );
    }

    await dispose("error");
    throw error;
  }
}
