// Build-time guard for the public Supabase credentials.
//
// src/lib/supabase.ts throws at module load when the URL or key
// is missing, which kills a release APK before any error UI can
// paint. Fail the EAS build instead, where the fix is obvious.
// Values are never printed; only the variable names.
//
// Wired to `eas-build-post-install` (EAS) and `npm run
// check:env` (manual). Reads .env / .env.local for local builds
// so EAS --local works without exporting variables first.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_KEY",
];

const RECOMMENDED = [
  "EXPO_PUBLIC_SENTRY_DSN",
];

function readDotEnv(fileName) {
  const filePath = resolve(
    process.cwd(),
    fileName,
  );

  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};

  for (const line of readFileSync(
    filePath,
    "utf8",
  ).split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/,
    );

    if (!match) {
      continue;
    }

    let value = match[2].trim();

    if (
      (value.startsWith('"') &&
        value.endsWith('"')) ||
      (value.startsWith("'") &&
        value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[match[1]] = value;
  }

  return values;
}

const fileValues = {
  ...readDotEnv(".env"),
  ...readDotEnv(".env.local"),
};

const isSet = (name) =>
  Boolean(
    (process.env[name] ??
      fileValues[name] ??
      "").trim(),
  );

const missing = REQUIRED.filter(
  (name) => !isSet(name),
);

if (missing.length > 0) {
  console.error(
    "[check-env] Missing required build variable(s):",
  );

  for (const name of missing) {
    console.error(`  - ${name}`);
  }

  console.error(
    "[check-env] Set them as EAS environment variables (or in .env.local for a local build) before building.",
  );

  process.exit(1);
}

for (const name of RECOMMENDED) {
  if (!isSet(name)) {
    console.warn(
      `[check-env] ${name} is not set; crash reports will be silent.`,
    );
  }
}

console.log(
  `[check-env] Required build variables present: ${REQUIRED.join(
    ", ",
  )}.`,
);
