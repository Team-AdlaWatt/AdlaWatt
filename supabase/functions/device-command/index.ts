import {
  ackCanonical,
  constantTimeEqual,
  corsHeaders,
  hmacSha256Base64Url,
  isCanonicalField,
  json,
  nextCanonical,
  releaseCanonical,
  serviceClient,
} from "../_shared/device.ts";

const MAX_MONITOR_ID = 4294967295;
const NONCE_TTL_MS = 5 * 60 * 1000;

type Payload = Record<string, unknown>;
type ServiceClient = ReturnType<typeof serviceClient>;

const failure = (error: string, status: number) =>
  json({ success: false, error }, status);

const dbFailure = (label: string, error: { message?: string } | null) => {
  console.error(label, error?.message ?? "Unknown database error.");
  return failure("Unable to complete request.", 500);
};

const requireField = (payload: Payload, key: string): string | null => {
  const value = payload[key];
  return typeof value === "string" && isCanonicalField(value) ? value : null;
};

const requireMonitorId = (value: unknown): number | null =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= MAX_MONITOR_ID
    ? value
    : null;

const parseIso = (value: string): number | null => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const registerNonce = async (
  admin: ServiceClient,
  nonce: string,
  expiresAt: string,
): Promise<Response | null> => {
  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("device_command_nonces")
    .select("expires_at")
    .eq("nonce", nonce)
    .maybeSingle();

  if (existingError) {
    return dbFailure("Nonce lookup failed:", existingError);
  }

  if (existing) {
    const existingExpiry = parseIso(existing.expires_at);
    if (existingExpiry !== null && existingExpiry <= Date.now()) {
      return failure("Nonce expired.", 400);
    }
    return failure("Nonce already used.", 400);
  }

  const { error } = await admin
    .from("device_command_nonces")
    .insert({ nonce, expires_at: expiresAt });

  if (error) {
    if (error.code === "23505") {
      return failure("Nonce already used.", 400);
    }
    return dbFailure("Nonce insertion failed:", error);
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return failure("Method not allowed.", 405);
  }

  try {
    let payload: Payload;

    try {
      const parsed = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid body.");
      }
      payload = parsed as Payload;
    } catch {
      return failure("Invalid JSON body.", 400);
    }

    const action = payload.action;

    if (action !== "next" && action !== "ack") {
      return failure("Unknown action.", 400);
    }

    const deviceId = requireField(payload, "device_id");
    const keyId = requireField(payload, "key_id");
    const nonce = requireField(payload, "nonce");
    const issuedAt = requireField(payload, "issued_at");
    const signature = req.headers.get("x-device-signature") ?? "";

    if (!deviceId || !keyId || !nonce || !issuedAt) {
      return failure("Missing required fields.", 400);
    }

    if (!/^[A-Za-z0-9_-]+$/.test(signature)) {
      return failure("Invalid signature.", 401);
    }

    const admin = serviceClient();

    const {
      data: secretRow,
      error: secretError,
    } = await admin
      .from("device_secrets")
      .select("secret, device_id")
      .eq("key_id", keyId)
      .eq("device_id", deviceId)
      .eq("active", true)
      .maybeSingle();

    if (secretError) {
      return dbFailure("Secret lookup failed:", secretError);
    }

    if (!secretRow || secretRow.device_id !== deviceId) {
      return failure("Unknown device key.", 401);
    }

    if (action === "next") {
      if (payload.version !== 1) {
        return failure("Unsupported version.", 400);
      }

      const issuedMs = parseIso(issuedAt);

      if (issuedMs === null || issuedMs + NONCE_TTL_MS <= Date.now()) {
        return failure("Nonce expired.", 400);
      }

      const expected = await hmacSha256Base64Url(
        secretRow.secret,
        nextCanonical(deviceId, keyId, nonce, issuedAt),
      );

      if (!constantTimeEqual(expected, signature)) {
        return failure("Invalid signature.", 401);
      }

      const nonceExpiry = new Date(issuedMs + NONCE_TTL_MS).toISOString();
      const nonceFailure = await registerNonce(admin, nonce, nonceExpiry);

      if (nonceFailure) {
        return nonceFailure;
      }

      const { error: activationError } = await admin
        .from("devices")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("device_id", deviceId)
        .eq("status", "binding");

      if (activationError) {
        return dbFailure("Device activation failed:", activationError);
      }

      const {
        data: command,
        error: commandError,
      } = await admin
        .from("device_commands")
        .select("payload")
        .eq("device_id", deviceId)
        .eq("action", "release")
        .is("acked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (commandError) {
        return dbFailure("Command lookup failed:", commandError);
      }

      if (!command) {
        return json({ success: true, command: null });
      }

      const commandPayload = command.payload;

      if (
        !commandPayload ||
        typeof commandPayload !== "object" ||
        Array.isArray(commandPayload)
      ) {
        return json({ success: true, command: null });
      }

      const payloadRecord = commandPayload as Payload;
      const commandDeviceId = requireField(payloadRecord, "device_id");
      const commandId = requireField(payloadRecord, "command_id");
      const commandNonce = requireField(payloadRecord, "nonce");
      const commandIssuedAt = requireField(payloadRecord, "issued_at");
      const commandExpiresAt = requireField(payloadRecord, "expires_at");
      const commandMonitorId = requireMonitorId(payloadRecord.monitor_id);

      if (
        payloadRecord.action !== "release" ||
        commandDeviceId !== deviceId ||
        !commandId ||
        !commandNonce ||
        !commandIssuedAt ||
        !commandExpiresAt ||
        commandMonitorId === null
      ) {
        return json({ success: true, command: null });
      }

      const signatureValue = await hmacSha256Base64Url(
        secretRow.secret,
        releaseCanonical(
          deviceId,
          commandId,
          commandMonitorId,
          commandNonce,
          commandIssuedAt,
          commandExpiresAt,
        ),
      );

      return json({
        success: true,
        command: {
          ...payloadRecord,
          signature: signatureValue,
        },
      });
    }

    const commandId = requireField(payload, "command_id");
    const monitorId = requireMonitorId(payload.monitor_id);
    const expiresAt = requireField(payload, "expires_at");
    const expiresMs = expiresAt === null ? null : parseIso(expiresAt);

    if (
      !commandId ||
      monitorId === null ||
      expiresAt === null ||
      expiresMs === null ||
      expiresMs <= Date.now() ||
      payload.result !== "released"
    ) {
      return failure("Invalid ack payload.", 400);
    }

    const expected = await hmacSha256Base64Url(
      secretRow.secret,
      ackCanonical(
        deviceId,
        commandId,
        monitorId,
        nonce,
        issuedAt,
        expiresAt,
      ),
    );

    if (!constantTimeEqual(expected, signature)) {
      return failure("Invalid signature.", 401);
    }

    const nonceFailure = await registerNonce(admin, nonce, expiresAt);

    if (nonceFailure) {
      return nonceFailure;
    }

    const {
      data: command,
      error: commandError,
    } = await admin
      .from("device_commands")
      .select("expires_at, nonce, payload")
      .eq("id", commandId)
      .eq("device_id", deviceId)
      .eq("nonce", nonce)
      .is("acked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (commandError) {
      return dbFailure("Command lookup failed:", commandError);
    }

    if (!command || Date.parse(command.expires_at) !== expiresMs) {
      return failure("Command not found or expired.", 400);
    }

    const commandPayload = command.payload;

    if (
      !commandPayload ||
      typeof commandPayload !== "object" ||
      Array.isArray(commandPayload) ||
      (commandPayload as Payload).monitor_id !== monitorId
    ) {
      return failure("Command mismatch.", 400);
    }

    const { error: ackError } = await admin
      .from("device_commands")
      .update({ acked_at: new Date().toISOString() })
      .eq("id", commandId)
      .is("acked_at", null);

    if (ackError) {
      return dbFailure("Command ack failed:", ackError);
    }

    const { error: deviceError } = await admin
      .from("devices")
      .update({
        status: "released",
        owner_id: null,
        monitor_id: null,
        key_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("device_id", deviceId);

    if (deviceError) {
      return dbFailure("Device release failed:", deviceError);
    }

    const { error: secretErrorUpdate } = await admin
      .from("device_secrets")
      .update({ active: false })
      .eq("device_id", deviceId);

    if (secretErrorUpdate) {
      return dbFailure("Secret deactivation failed:", secretErrorUpdate);
    }

    return json({ status: "released" });
  } catch (error) {
    console.error(
      "device-command error:",
      error instanceof Error ? error.message : "Unknown error.",
    );
    return failure("Unable to complete request.", 500);
  }
});
