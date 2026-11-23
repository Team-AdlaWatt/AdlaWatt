import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-signature",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

export const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
export const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
export const supabaseServiceRoleKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const anonClient = () => createClient(supabaseUrl, supabaseAnonKey);
export const serviceClient = () =>
  createClient(supabaseUrl, supabaseServiceRoleKey);

export const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const decodeBase64Url = (value: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid base64url value.");
  }
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

export const randomBase64Url = (length: number): string =>
  encodeBase64Url(randomBytes(length));

export const randomHex = (length: number): string =>
  Array.from(randomBytes(length))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const encoder = new TextEncoder();

export const hmacSha256Base64Url = async (
  secretBase64Url: string,
  canonical: string,
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    decodeBase64Url(secretBase64Url),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(canonical),
  );
  return encodeBase64Url(new Uint8Array(signature));
};

export const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

export const isCanonicalField = (value: string): boolean =>
  value.length > 0 && !value.includes("|");

export const nextCanonical = (
  deviceId: string,
  keyId: string,
  nonce: string,
  issuedAt: string,
): string => `1|next|${deviceId}|${keyId}|${nonce}|${issuedAt}`;

export const releaseCanonical = (
  deviceId: string,
  commandId: string,
  monitorId: string | number,
  nonce: string,
  issuedAt: string,
  expiresAt: string,
): string =>
  `1|release|${deviceId}|${commandId}|${monitorId}|${nonce}|${issuedAt}|${expiresAt}`;

export const ackCanonical = (
  deviceId: string,
  commandId: string,
  monitorId: string | number,
  nonce: string,
  issuedAt: string,
  expiresAt: string,
): string =>
  `1|ack|${deviceId}|${commandId}|${monitorId}|${nonce}|${issuedAt}|${expiresAt}|released`;
