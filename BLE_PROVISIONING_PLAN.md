# AW-01 BLE Provisioning Contract Implementation

## Scope

Update only the existing app-side provisioning flow:

- `src/services/monitoringService.ts`
- `src/services/provisioningBleService.ts`
- `src/app/dashboard/add-device.tsx`
- related existing Jest tests

No ESP32 firmware, Supabase schema, policies, or unrelated app functionality were changed.

## Verification findings

The required `monitor_id` flow already largely exists:

- Authenticated user comes from `useAuth()` in `src/app/dashboard/add-device.tsx`.
- `monitoring` is queried by authenticated `user_id` in `src/services/monitoringService.ts`.
- Exactly one row is required via `.limit(2)` plus `not_found`/`ambiguous` handling.
- The resolved ID is passed into BLE provisioning in `src/app/dashboard/add-device.tsx`.

Current gaps:

- Resolver only checked `Number.isFinite`, not strict integer/range validity.
- Device discovery used prefix `AdlaWatt-`, not exact `AdlaWatt-AW-01`.
- Unknown notifications became fatal `error`.
- `wifi_lost` was terminal in both service and UI.
- `configured` JSON ack fields were not validated against the sent `monitor_id`/`AW-01`.
- Tests did not cover resolver, exact name filtering, NUL cleanup, ack validation, or non-terminal `wifi_lost`.

## Implementation changes

### `src/services/monitoringService.ts`

- Kept and improved `resolveProvisioningMonitorIdForUser`; no duplicate query was added.
- `userId` is optional and falls back to `getAuthenticatedUserSafe()` when not supplied.
- Added `session_expired` to `ProvisioningMonitorAssignment`.
- Kept `.limit(2)` behavior for missing/duplicate rows.
- `monitor_id` must now be a strict integer greater than zero and less than or equal to `4294967295`.
- Numeric strings are rejected; the resolved value must be the database number.

### `src/services/provisioningBleService.ts`

- BLE name, UUIDs, device code, and device ID remain unchanged.
- Added `filterProvisioningScanResults` and exact `AdlaWatt-AW-01` filtering.
- Notifications are decoded, NUL-stripped, and trimmed before parsing.
- `parseProvisioningStatusDetail` supports plain tokens and JSON objects and extracts `device_id`/`monitor_id`.
- Unknown status text now returns `null` and is ignored as non-terminal debug data.
- `wifi_lost` was removed from `TERMINAL_FAILURE_STATUSES`.
- `configured` JSON acks are validated against the sent `monitor_id` and `AW-01`.
- Plain-text `configured` remains compatible.
- Mismatched acks emit an error with an issue code for the UI.

### `src/app/dashboard/add-device.tsx`

- Uses exact device name copy/filtering.
- Existing authenticated-user flow was preserved.
- BLE provisioning stops when user/session, monitoring row, or monitor ID validation fails.
- Handles `session_expired`.
- Treats `wifi_lost` as warning UI rather than failure.
- Displays localized ack mismatch errors using existing keys.
- Adds progress details for connecting, sending, and Wi-Fi connected states.

### Tests

Updated:

- `src/services/__tests__/provisioningBleService.test.ts`

Added:

- `src/services/__tests__/monitoringService.provisioning.test.ts`

Coverage includes exact name accepted/rejected, strict valid/invalid monitor IDs, missing user, missing row, duplicate rows, query error, plain status parsing, JSON `configured` ack parsing, NUL/whitespace cleanup, unknown status non-terminal, `wifi_lost` non-terminal, matching/mismatched `monitor_id`, mismatched `device_id`, successful provisioning, failed Wi-Fi provisioning, and BLE disconnection.

## Verification results

- `npm run typecheck`: passed.
- `npm run lint`: 0 errors; 3 pre-existing warnings only.
- Focused provisioning tests: 2 suites, 33 tests passed.
- `npm test -- --runInBand`: 39 suites, 898 tests passed.
- `git diff --check`: passed with CRLF conversion warnings only.
