import {
  anonClient,
  corsHeaders,
  json,
  randomBase64Url,
  randomHex,
  serviceClient,
} from "../_shared/device.ts";

const MAX_MONITOR_ID = 4294967295;
const COMMAND_TTL_MS = 5 * 60 * 1000;

type Payload = Record<string, unknown>;

const nonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

const failure = (error: string, status: number) =>
  json({ success: false, error }, status);

const dbFailure = (label: string, error: { message?: string } | null) => {
  console.error(label, error?.message ?? "Unknown database error.");
  return failure("Unable to complete request.", 500);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return failure("Method not allowed.", 405);
  }

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(
      /^Bearer\s+/i,
      "",
    );

    if (!jwt) {
      return failure("Unauthorized.", 401);
    }

    const {
      data: { user },
      error: authError,
    } = await anonClient().auth.getUser(jwt);

    if (authError || !user) {
      return failure("Unauthorized.", 401);
    }

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

    if (typeof action !== "string") {
      return failure("An action is required.", 400);
    }

    const admin = serviceClient();

    if (action === "status") {
      const { data: device, error } = await admin
        .from("devices")
        .select("device_id, monitor_id, status, key_id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        return dbFailure("Device status lookup failed:", error);
      }

      if (!device) {
        return json({ status: "unbound" });
      }

      return json({
        status: device.status,
        device_id: device.device_id,
        monitor_id: device.monitor_id,
        key_id: device.key_id,
        pending_release: device.status === "release_pending",
      });
    }

    if (action === "bind") {
      const deviceId = nonEmptyString(payload.device_id);

      if (!deviceId) {
        return failure("A device_id is required.", 400);
      }

      const monitorId = payload.monitor_id;

      if (
        typeof monitorId !== "number" ||
        !Number.isInteger(monitorId) ||
        monitorId < 1 ||
        monitorId > MAX_MONITOR_ID
      ) {
        return failure("A valid monitor_id is required.", 400);
      }

      const {
        data: monitor,
        error: monitorError,
      } = await admin
        .from("monitoring")
        .select("monitor_id")
        .eq("monitor_id", monitorId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (monitorError) {
        return dbFailure("Monitor lookup failed:", monitorError);
      }

      if (!monitor) {
        return failure("Monitor not found for this account.", 403);
      }

      const { data: existingDevice, error: existingDeviceError } = await admin
        .from("devices")
        .select("owner_id, status")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existingDeviceError) {
        return dbFailure("Existing device lookup failed:", existingDeviceError);
      }

      if (
        existingDevice &&
        existingDevice.status !== "released" &&
        existingDevice.owner_id !== user.id
      ) {
        return failure("Device is bound to another account.", 403);
      }

      if (
        existingDevice?.owner_id === user.id &&
        (existingDevice.status === "active" ||
          existingDevice.status === "release_pending")
      ) {
        return failure("Device is still bound. Release it first.", 409);
      }

      const { data: monitorDevice, error: monitorDeviceError } = await admin
        .from("devices")
        .select("device_id, owner_id, status")
        .eq("monitor_id", monitorId)
        .neq("status", "released")
        .limit(1)
        .maybeSingle();

      if (monitorDeviceError) {
        return dbFailure("Monitor device lookup failed:", monitorDeviceError);
      }

      if (
        monitorDevice &&
        (monitorDevice.device_id !== deviceId ||
          monitorDevice.owner_id !== user.id ||
          monitorDevice.status === "active" ||
          monitorDevice.status === "release_pending")
      ) {
        return failure("Monitor is already bound to a device.", 409);
      }

      const keyId = `aw_${randomHex(8)}`;
      const secret = randomBase64Url(32);
      const now = new Date().toISOString();

      const { error: upsertError } = await admin.from("devices").upsert(
        {
          device_id: deviceId,
          monitor_id: monitorId,
          owner_id: user.id,
          status: "binding",
          key_id: keyId,
          updated_at: now,
        },
        { onConflict: "device_id" },
      );

      if (upsertError) {
        if (upsertError.code === "23505") {
          return failure("Device or monitor is already bound.", 409);
        }
        return dbFailure("Device bind failed:", upsertError);
      }

      const { error: deactivateError } = await admin
        .from("device_secrets")
        .update({ active: false })
        .eq("device_id", deviceId);

      if (deactivateError) {
        return dbFailure("Secret deactivation failed:", deactivateError);
      }

      const { error: secretError } = await admin
        .from("device_secrets")
        .insert({
          key_id: keyId,
          device_id: deviceId,
          secret,
          active: true,
        });

      if (secretError) {
        return dbFailure("Secret insertion failed:", secretError);
      }

      const { error: commandCleanupError } = await admin
        .from("device_commands")
        .delete()
        .eq("device_id", deviceId);

      if (commandCleanupError) {
        return dbFailure("Command cleanup failed:", commandCleanupError);
      }

      return json({
        status: "binding",
        device_id: deviceId,
        monitor_id: monitorId,
        key_id: keyId,
        secret,
      });
    }

    if (action === "release") {
      const deviceId = nonEmptyString(payload.device_id);

      if (!deviceId) {
        return failure("A device_id is required.", 400);
      }

      const { data: device, error: deviceError } = await admin
        .from("devices")
        .select("device_id, monitor_id, status")
        .eq("device_id", deviceId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (deviceError) {
        return dbFailure("Device lookup failed:", deviceError);
      }

      if (!device) {
        return failure("Device not found for this account.", 403);
      }

      if (device.status === "released") {
        return json({ status: "released" });
      }

      if (device.status === "binding") {
        const { error: cancelError } = await admin
          .from("devices")
          .update({
            status: "released",
            owner_id: null,
            monitor_id: null,
            key_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("device_id", deviceId)
          .eq("owner_id", user.id);

        if (cancelError) {
          return dbFailure("Binding cancellation failed:", cancelError);
        }

        const { error: secretCleanupError } = await admin
          .from("device_secrets")
          .update({ active: false })
          .eq("device_id", deviceId);

        if (secretCleanupError) {
          return dbFailure("Secret cleanup failed:", secretCleanupError);
        }

        const { error: commandCleanupError } = await admin
          .from("device_commands")
          .delete()
          .eq("device_id", deviceId);

        if (commandCleanupError) {
          return dbFailure("Command cleanup failed:", commandCleanupError);
        }

        return json({ status: "released" });
      }

      const { error: cleanupError } = await admin
        .from("device_commands")
        .delete()
        .eq("device_id", deviceId)
        .eq("action", "release")
        .is("acked_at", null);

      if (cleanupError) {
        return dbFailure("Command cleanup failed:", cleanupError);
      }

      const commandId = crypto.randomUUID();
      const nonce = randomBase64Url(16);
      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + COMMAND_TTL_MS).toISOString();

      const commandPayload = {
        action: "release",
        command_id: commandId,
        device_id: deviceId,
        monitor_id: device.monitor_id,
        nonce,
        issued_at: issuedAt,
        expires_at: expiresAt,
      };

      const { error: insertError } = await admin
        .from("device_commands")
        .insert({
          id: commandId,
          device_id: deviceId,
          action: "release",
          payload: commandPayload,
          nonce,
          expires_at: expiresAt,
        });

      if (insertError) {
        return dbFailure("Command insertion failed:", insertError);
      }

      const { error: statusError } = await admin
        .from("devices")
        .update({
          status: "release_pending",
          updated_at: new Date().toISOString(),
        })
        .eq("device_id", deviceId)
        .eq("owner_id", user.id);

      if (statusError) {
        return dbFailure("Release status update failed:", statusError);
      }

      return json({
        status: "release_pending",
        command_id: commandId,
        expires_at: expiresAt,
      });
    }

    return failure("Unknown action.", 400);
  } catch (error) {
    console.error(
      "device-release error:",
      error instanceof Error ? error.message : "Unknown error.",
    );
    return failure("Unable to complete request.", 500);
  }
});
