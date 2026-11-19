#!/usr/bin/env node

// Live monitoring schema drift check.
//
// Compares the app's canonical column contract against the
// real `public.monitoring` rows through PostgREST. Read-only:
// it never writes or prints credentials.
//
// Usage: npm run verify:monitoring
// Exit codes: 0 = no drift, 1 = drift / unreachable.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const root = resolve(here, "..");

const NON_NEGATIVE_COLUMNS = [
  "INA219 Solar Side input",
  "INA219 Solar Side voltage",
  "INA219 Solar Side current",
  "INA219 Load Side total energy",
  "INA219 Load Side battery load",
  "DHT22 Interior Temp",
  "INA219 Voltage",
  "INA219 Load Side battery watt_hour",
  "cumulative_energy_input_wh",
  "cumulative_energy_output_wh",
];

const STATUS_COLUMNS = {
  "INA219 Load Battery status": [
    "Charging",
    "Discharging",
    "Idle",
    "Reading Error",
  ],
  "INA219 Solar Side solar status": [
    "Low",
    "Moderate",
    "High",
  ],
  "ESP32S3 Status": ["Online", "Offline"],
  "INA219 Load Side dod_status": ["Safe", "Unsafe"],
  "DS18B20 1 Battery Temp Status": [
    "Nominal",
    "Elevated",
    "High",
    "Critical",
    "Critical (sensor fault)",
  ],
  "DS18B20 2 Solar Temp Status": [
    "Nominal",
    "Elevated",
    "High",
    "Critical",
    "Critical (rapid rise)",
    "Critical (sensor fault)",
  ],
  "DHT22 Interior Temp Status": [
    "Nominal",
    "Elevated",
    "High",
    "Critical",
    "Critical (rapid rise)",
    "Critical (sensor fault)",
  ],
};

const errors = [];
const warnings = [];

const fail = (message) => {
  errors.push(message);
};

const warn = (message) => {
  warnings.push(message);
};

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

if (!baseUrl || !apiKey) {
  console.error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY).",
  );
  process.exit(1);
}

const columnsPath = resolve(
  root,
  "src/services/monitoringColumns.json",
);

const contract = JSON.parse(
  readFileSync(columnsPath, "utf8"),
);

const contractSet = new Set(contract);

if (contract.length !== contractSet.size) {
  fail(
    "monitoringColumns.json contains duplicate column names.",
  );
}

if (contract.length !== 27) {
  fail(
    `Expected 27 monitoring columns, contract has ${contract.length}.`,
  );
}

const url =
  `${baseUrl.replace(/\/+$/, "")}` +
  "/rest/v1/monitoring?select=*&limit=100";

let response;

try {
  response = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
} catch (error) {
  console.error(
    "Could not reach Supabase:",
    error instanceof Error
      ? error.message
      : error,
  );
  process.exit(1);
}

if (!response.ok) {
  console.error(
    `Supabase returned HTTP ${response.status} ${response.statusText}.`,
  );
  process.exit(1);
}

const rows = await response.json();

if (!Array.isArray(rows)) {
  console.error(
    "Expected an array of monitoring rows.",
  );
  process.exit(1);
}

if (rows.length === 0) {
  warn(
    "monitoring returned no rows; column/types could not be inspected.",
  );
}

const seenColumns = new Set();

for (const row of rows) {
  for (const key of Object.keys(row)) {
    seenColumns.add(key);
  }
}

for (const column of contract) {
  if (!seenColumns.has(column)) {
    fail(
      `Contract column "${column}" is missing from live rows.`,
    );
  }
}

for (const column of seenColumns) {
  if (!contractSet.has(column)) {
    fail(
      `Live column "${column}" is missing from monitoringColumns.json.`,
    );
  }
}

const isFiniteNumber = (value) =>
  typeof value === "number" &&
  Number.isFinite(value);

const userIds = new Set();
const monitorIds = new Set();

for (const [index, row] of rows.entries()) {
  const label = `row ${index}`;

  if (
    row.monitor_id == null ||
    typeof row.monitor_id !== "number"
  ) {
    fail(`${label}: monitor_id is missing or not numeric.`);
  } else if (monitorIds.has(row.monitor_id)) {
    fail(
      `${label}: duplicate monitor_id "${row.monitor_id}".`,
    );
  } else {
    monitorIds.add(row.monitor_id);
  }

  if (row.user_id != null) {
    if (
      typeof row.user_id !== "string" ||
      row.user_id.length === 0
    ) {
      fail(`${label}: user_id is not a valid string.`);
    } else if (userIds.has(row.user_id)) {
      fail(
        `${label}: duplicate user_id "${row.user_id}" — the app expects one row per user.`,
      );
    } else {
      userIds.add(row.user_id);
    }
  }

  if (
    row["INA219 Voltage Percentage"] != null &&
    (!isFiniteNumber(row["INA219 Voltage Percentage"]) ||
      row["INA219 Voltage Percentage"] < 0 ||
      row["INA219 Voltage Percentage"] > 100)
  ) {
    fail(
      `${label}: INA219 Voltage Percentage is not a number in 0..100 (${row["INA219 Voltage Percentage"]}).`,
    );
  }

  for (const column of NON_NEGATIVE_COLUMNS) {
    const value = row[column];

    if (
      value != null &&
      (!isFiniteNumber(value) || value < 0)
    ) {
      fail(
        `${label}: ${column} is not a non-negative number (${value}).`,
      );
    }
  }

  for (const [column, allowed] of Object.entries(
    STATUS_COLUMNS,
  )) {
    const value = row[column];

    if (
      value != null &&
      !allowed.includes(value)
    ) {
      fail(
        `${label}: ${column} has unexpected value "${value}".`,
      );
    }
  }

  if (
    row["ESP32S3 Last seen"] != null &&
    (typeof row["ESP32S3 Last seen"] !== "string" ||
      !Number.isFinite(Date.parse(row["ESP32S3 Last seen"])))
  ) {
    fail(
      `${label}: ESP32S3 Last seen is not a parseable timestamp (${row["ESP32S3 Last seen"]}).`,
    );
  }

  // A temperature of 0 is a valid reading now; null is the
  // sensor-fault signal. No zero-vs-status warning applies.
}

console.log(
  `Checked ${rows.length} monitoring row(s) against ${contract.length} contract columns.`,
);

if (warnings.length > 0) {
  console.warn("");

  for (const message of warnings) {
    console.warn(`WARN  ${message}`);
  }
}

if (errors.length > 0) {
  console.error("");

  for (const message of errors) {
    console.error(`DRIFT ${message}`);
  }

  console.error(
    `\nMonitoring schema drift detected (${errors.length} issue(s)).`,
  );
  process.exit(1);
}

console.log("No monitoring schema drift detected.");
