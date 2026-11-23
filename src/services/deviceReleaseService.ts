import { supabase } from "@/lib/supabase";

export type DeviceReleaseErrorCode =
  | "unauthorized"
  | "not_found"
  | "conflict"
  | "invalid_response"
  | "network";

export class DeviceReleaseError extends Error {
  readonly code: DeviceReleaseErrorCode;

  constructor(code: DeviceReleaseErrorCode, message?: string) {
    super(message ?? code);
    this.name = "DeviceReleaseError";
    this.code = code;
  }
}

export type DeviceBindingStatus =
  | "unbound"
  | "binding"
  | "active"
  | "release_pending";

export interface UnboundDeviceBinding {
  status: "unbound";
}

export interface BoundDeviceBinding {
  status: "binding" | "active" | "release_pending";
  device_id: string;
  monitor_id: number;
  key_id: string;
  pending_release: boolean;
}

export type DeviceBinding =
  | UnboundDeviceBinding
  | BoundDeviceBinding;

export interface DeviceBindResult {
  status: "binding";
  device_id: string;
  monitor_id: number;
  key_id: string;
  secret: string;
}

export interface DeviceReleaseResult {
  status: "release_pending" | "released";
  command_id?: string;
  expires_at?: string;
}

const BOUND_STATUSES = new Set([
  "binding",
  "active",
  "release_pending",
]);

const RELEASE_CODES: DeviceReleaseErrorCode[] = [
  "unauthorized",
  "not_found",
  "conflict",
  "invalid_response",
  "network",
];

const codeFromStatus = (status: unknown): DeviceReleaseErrorCode | null => {
  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return "unauthorized";
    }
    if (status === 404) {
      return "not_found";
    }
    if (status === 409) {
      return "conflict";
    }
    return "network";
  }

  if (typeof status === "string") {
    const normalized = status.toLowerCase();
    if (normalized === "unauthorized" || normalized === "forbidden") {
      return "unauthorized";
    }
    if (normalized === "not_found" || normalized === "not found") {
      return "not_found";
    }
    if (normalized === "conflict") {
      return "conflict";
    }
  }

  return null;
};

const codeFromError = (value: unknown): DeviceReleaseErrorCode | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.code === "string" &&
    RELEASE_CODES.includes(record.code as DeviceReleaseErrorCode)
  ) {
    return record.code as DeviceReleaseErrorCode;
  }

  const direct = codeFromStatus(record.status);
  if (direct) {
    return direct;
  }

  const context = record.context;
  if (context && typeof context === "object") {
    const fromContext = codeFromStatus(
      (context as Record<string, unknown>).status,
    );
    if (fromContext) {
      return fromContext;
    }
  }

  return null;
};

const errorFromResponse = (
  value: unknown,
  fallback: DeviceReleaseErrorCode,
): DeviceReleaseError => {
  const code = codeFromError(value) ?? fallback;
  let message = "";

  if (value && typeof value === "object") {
    const candidate = (value as Record<string, unknown>).message;
    message = typeof candidate === "string" ? candidate : "";
  } else if (typeof value === "string") {
    message = value;
  }

  return new DeviceReleaseError(code, message || code);
};

const invokeDeviceRelease = async (
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  let data: unknown;

  try {
    const response = await supabase.functions.invoke(
      "device-release",
      { body },
    );

    if (response.error) {
      throw errorFromResponse(response.error, "network");
    }

    data = response.data;
  } catch (error) {
    if (error instanceof DeviceReleaseError) {
      throw error;
    }
    throw errorFromResponse(error, "network");
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new DeviceReleaseError(
      "invalid_response",
      "Invalid device release response.",
    );
  }

  const record = data as Record<string, unknown>;

  if (record.error) {
    throw errorFromResponse(record.error, "invalid_response");
  }

  return record;
};

export const getDeviceBinding = async (): Promise<DeviceBinding> => {
  const record = await invokeDeviceRelease({ action: "status" });
  const status = record.status;

  if (status === "unbound") {
    return { status: "unbound" };
  }

  if (typeof status !== "string" || !BOUND_STATUSES.has(status)) {
    throw new DeviceReleaseError(
      "invalid_response",
      "Invalid device binding status.",
    );
  }

  const deviceId = record.device_id;
  const monitorId = record.monitor_id;
  const keyId = record.key_id;

  if (
    typeof deviceId !== "string" ||
    !deviceId ||
    !Number.isInteger(monitorId) ||
    typeof keyId !== "string" ||
    !keyId
  ) {
    throw new DeviceReleaseError(
      "invalid_response",
      "Invalid device binding details.",
    );
  }

  return {
    status: status as BoundDeviceBinding["status"],
    device_id: deviceId,
    monitor_id: monitorId as number,
    key_id: keyId,
    pending_release:
      typeof record.pending_release === "boolean"
        ? record.pending_release
        : status === "release_pending",
  };
};

export const bindDevice = async (
  deviceId: string,
  monitorId: number,
): Promise<DeviceBindResult> => {
  const record = await invokeDeviceRelease({
    action: "bind",
    device_id: deviceId,
    monitor_id: monitorId,
  });

  const secret = record.secret;
  const keyId = record.key_id;
  const boundDeviceId = record.device_id;
  const boundMonitorId = record.monitor_id;

  if (
    record.status !== "binding" ||
    typeof secret !== "string" ||
    !secret ||
    typeof keyId !== "string" ||
    !keyId ||
    typeof boundDeviceId !== "string" ||
    !boundDeviceId ||
    !Number.isInteger(boundMonitorId)
  ) {
    throw new DeviceReleaseError(
      "invalid_response",
      "Invalid device bind response.",
    );
  }

  return {
    status: "binding",
    device_id: boundDeviceId,
    monitor_id: boundMonitorId as number,
    key_id: keyId,
    secret,
  };
};

export const requestDeviceRelease = async (
  deviceId: string,
): Promise<DeviceReleaseResult> => {
  const record = await invokeDeviceRelease({
    action: "release",
    device_id: deviceId,
  });

  const status = record.status;
  if (status !== "release_pending" && status !== "released") {
    throw new DeviceReleaseError(
      "invalid_response",
      "Invalid device release response.",
    );
  }

  const commandId =
    typeof record.command_id === "string" && record.command_id
      ? record.command_id
      : undefined;
  const expiresAt =
    typeof record.expires_at === "string" && record.expires_at
      ? record.expires_at
      : undefined;

  if (status === "release_pending" && (!commandId || !expiresAt)) {
    throw new DeviceReleaseError(
      "invalid_response",
      "Invalid device release response.",
    );
  }

  return {
    status,
    ...(commandId ? { command_id: commandId } : {}),
    ...(expiresAt ? { expires_at: expiresAt } : {}),
  };
};

export const pollDeviceRelease = async (
  deviceId: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> => {
  if (!deviceId) {
    throw new DeviceReleaseError(
      "invalid_response",
      "Device id is required.",
    );
  }

  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 2_000;
  const startedAt = Date.now();

  for (;;) {
    const binding = await getDeviceBinding();

    if (binding.status === "unbound") {
      return;
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed >= timeoutMs) {
      throw new DeviceReleaseError(
        "network",
        "Timed out waiting for device release.",
      );
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, Math.max(0, Math.min(intervalMs, timeoutMs - elapsed)));
    });
  }
};
