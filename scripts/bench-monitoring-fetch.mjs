#!/usr/bin/env node

// Authenticated monitoring fetch benchmark.
//
// Measures the two sequential PostgREST round-trips that
// getMonitoringData() performs on a cold/forced read:
//
//   1. users?select=monitor_id&id=eq.<uid>
//   2. monitoring?select=*&monitor_id=eq.<id>
//
// It signs in as a real test user (RLS applies), so timings
// include auth + row-level security exactly like the app. Read
// only: it never writes data and never prints credentials.
//
// Usage:
//   PERF_TEST_EMAIL=... PERF_TEST_PASSWORD=... npm run bench:monitoring
//
// Optional env:
//   PERF_ITERATIONS=20     measured iterations (warm-up is fixed at 3)
//   PERF_MONITOR_ID=1      skip the users lookup resolution
//
// Exit codes: 0 = mean combined p95 under the target,
//             1 = error or target missed.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const root = resolve(here, "..");

const TARGET_P95_MS = 300;
const WARMUP_ITERATIONS = 3;
const DEFAULT_ITERATIONS = 20;

const loadEnvFile = (path) => {
  try {
    const raw = readFileSync(path, "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (
        !trimmed ||
        trimmed.startsWith("#") ||
        !trimmed.includes("=")
      ) {
        continue;
      }

      const index = trimmed.indexOf("=");
      const key = trimmed
        .slice(0, index)
        .trim();
      let value = trimmed
        .slice(index + 1)
        .trim();

      if (
        (value.startsWith('"') &&
          value.endsWith('"')) ||
        (value.startsWith("'") &&
          value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional when the shell exports values.
  }
};

loadEnvFile(resolve(root, ".env.local"));

const baseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL;

const apiKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env.SUPABASE_ANON_KEY;

const email = process.env.PERF_TEST_EMAIL;

const password = process.env.PERF_TEST_PASSWORD;

const allowAnon = process.env.PERF_ALLOW_ANON === "1";

const iterations = Math.max(
  1,
  Number.parseInt(
    process.env.PERF_ITERATIONS ?? "",
    10,
  ) || DEFAULT_ITERATIONS,
);

const fail = (message) => {
  console.error(`bench-monitoring: ${message}`);
  process.exit(1);
};

if (!baseUrl || !apiKey) {
  fail(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY).",
  );
}

if (!email || !password) {
  if (!allowAnon) {
    fail(
      "Missing PERF_TEST_EMAIL / PERF_TEST_PASSWORD (set them in the shell or .env.local, or set PERF_ALLOW_ANON=1).",
    );
  }
}

const restBase = `${baseUrl.replace(/\/+$/, "")}/rest/v1`;

const now = () => performance.now();

const percentile = (sorted, p) => {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );

  return sorted[index];
};

const stats = (samples) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);

  return {
    n: sorted.length,
    min: sorted[0],
    mean: sum / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
};

const fmt = (value) => value.toFixed(1).padStart(7);

const printRow = (label, s) => {
  console.log(
    `${label.padEnd(22)} n=${String(s.n).padStart(3)}  ` +
      `min=${fmt(s.min)}  mean=${fmt(s.mean)}  ` +
      `p50=${fmt(s.p50)}  p95=${fmt(s.p95)}  max=${fmt(s.max)}  (ms)`,
  );
};

const signIn = async () => {
  const response = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response
      .text()
      .catch(() => "");

    throw new Error(
      `sign-in failed (${response.status}). Check PERF_TEST_EMAIL / PERF_TEST_PASSWORD. ${detail.slice(0, 160)}`,
    );
  }

  const body = await response.json();
  const accessToken = body?.access_token;
  const userId = body?.user?.id;

  if (!accessToken || !userId) {
    throw new Error(
      "sign-in response is missing access_token or user.id.",
    );
  }

  return { accessToken, userId };
};

const authedHeaders = (accessToken) => ({
  apikey: apiKey,
  Authorization: `Bearer ${accessToken}`,
  Accept: "application/json",
});

const getUserMonitorId = async (
  accessToken,
  userId,
) => {
  const response = await fetch(
    `${restBase}/users?select=monitor_id&id=eq.${userId}&limit=1`,
    { headers: authedHeaders(accessToken) },
  );

  if (!response.ok) {
    fail(`users lookup failed (${response.status}).`);
  }

  const rows = await response.json();
  const value = rows?.[0]?.monitor_id;

  return value == null ? null : Number(value);
};

const resolveMonitorIdFromMonitoring = async (
  accessToken,
  userId,
) => {
  const response = await fetch(
    `${restBase}/monitoring?select=monitor_id&user_id=eq.${userId}&limit=1`,
    { headers: authedHeaders(accessToken) },
  );

  if (!response.ok) {
    fail(`monitoring fallback lookup failed (${response.status}).`);
  }

  const rows = await response.json();
  const value = rows?.[0]?.monitor_id;

  return value == null ? null : Number(value);
};

const fetchMonitoring = async (
  accessToken,
  monitorId,
) => {
  const response = await fetch(
    `${restBase}/monitoring?select=*&monitor_id=eq.${monitorId}&limit=1`,
    { headers: authedHeaders(accessToken) },
  );

  if (!response.ok) {
    fail(`monitoring fetch failed (${response.status}).`);
  }

  const rows = await response.json();

  return rows?.[0] ?? null;
};

const resolveAnonSession = async () => {
  const response = await fetch(
    `${restBase}/monitoring?select=monitor_id,user_id&limit=1`,
    { headers: authedHeaders(apiKey) },
  );

  if (!response.ok) {
    fail(`anon monitoring lookup failed (${response.status}).`);
  }

  const rows = await response.json();
  const row = rows?.[0];

  if (
    !row ||
    row.monitor_id == null ||
    !row.user_id
  ) {
    fail(
      "anon fallback could not find a monitoring row with monitor_id + user_id (RLS may block it).",
    );
  }

  return {
    accessToken: apiKey,
    userId: String(row.user_id),
    monitorId: Number(row.monitor_id),
  };
};

const main = async () => {
  console.log(
    `bench-monitoring: resolving session (${baseUrl})`,
  );

  let accessToken;
  let userId;
  let monitorId;
  let usedFallback = false;
  let mode = "authenticated";

  try {
    ({ accessToken, userId } = await signIn());

    monitorId =
      process.env.PERF_MONITOR_ID != null
        ? Number(process.env.PERF_MONITOR_ID)
        : await getUserMonitorId(accessToken, userId);

    if (monitorId == null) {
      usedFallback = true;
      monitorId = await resolveMonitorIdFromMonitoring(
        accessToken,
        userId,
      );
    }
  } catch (error) {
    if (!allowAnon) {
      throw error;
    }

    console.log(
      `bench-monitoring: sign-in unavailable (${error.message}); ` +
        "falling back to anon (RLS may be disabled).",
    );

    mode = "anon (no auth)";

    ({ accessToken, userId, monitorId } =
      await resolveAnonSession());
  }

  if (monitorId == null) {
    fail(
      "Could not resolve a monitor_id for the test account (no users.monitor_id and no monitoring row).",
    );
  }

  console.log(
    `bench-monitoring: mode=${mode} monitor_id=${monitorId} ` +
      `(resolved via ${usedFallback ? "monitoring fallback" : "users.monitor_id"}, ` +
      `user=${String(userId).slice(0, 8)}...)`,
  );

  const row = await fetchMonitoring(accessToken, monitorId);

  if (!row) {
    fail(
      "The monitoring fetch returned no row; RLS or monitor_id may be wrong.",
    );
  }

  const columnCount = Object.keys(row).length;

  console.log(
    `bench-monitoring: payload has ${columnCount} columns; ` +
      `${WARMUP_ITERATIONS} warm-up + ${iterations} measured iterations`,
  );

  const monitorIdSamples = [];
  const monitoringSamples = [];
  const combinedSamples = [];

  for (
    let i = 0;
    i < WARMUP_ITERATIONS + iterations;
    i += 1
  ) {
    const measured = i >= WARMUP_ITERATIONS;

    const usersStart = now();
    await getUserMonitorId(accessToken, userId);
    const usersMs = now() - usersStart;

    const monitoringStart = now();
    await fetchMonitoring(accessToken, monitorId);
    const monitoringMs = now() - monitoringStart;

    if (measured) {
      monitorIdSamples.push(usersMs);
      monitoringSamples.push(monitoringMs);
      combinedSamples.push(usersMs + monitoringMs);
    }
  }

  const usersStats = stats(monitorIdSamples);
  const monitoringStats = stats(monitoringSamples);
  const combinedStats = stats(combinedSamples);

  console.log("");
  console.log("Monitoring fetch — warm, authenticated PostgREST");
  printRow("users.monitor_id", usersStats);
  printRow("monitoring row", monitoringStats);
  printRow("combined cold path", combinedStats);
  console.log("");

  const pass = combinedStats.p95 < TARGET_P95_MS;

  console.log(
    `Target: combined p95 < ${TARGET_P95_MS} ms → ` +
      `observed p95 ${combinedStats.p95.toFixed(1)} ms → ` +
      `${pass ? "PASS" : "FAIL"}`,
  );

  console.log(
    "Note: cache hits skip both legs, so real repeat reads are faster; " +
      "these numbers are the worst case (force refresh / cold start).",
  );

  process.exit(pass ? 0 : 1);
};

main().catch((error) => {
  fail(
    error instanceof Error ? error.message : String(error),
  );
});
