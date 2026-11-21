# What is applied to the system

This is the current AW-01 provisioning contract implemented in the AdlaWatt mobile app. Use this as the source of truth when generating or updating the ESP32 `.ino` firmware.

The ESP32 must not connect to Supabase. Supabase authentication and `monitor_id` ownership are handled only by the mobile app.

## 1. Applied app-side flow

The mobile app now does the following:

1. Uses the existing authenticated session.
2. Resolves `monitor_id` from `public.monitoring` for the currently authenticated `user_id`.
3. Requires exactly one monitoring row for that user.
4. Rejects missing sessions, missing rows, duplicate rows, query errors, and invalid IDs.
5. Requires `monitor_id` to be an integer, greater than `0`, and less than or equal to `4294967295`.
6. Opens BLE only after the monitoring ID is verified.
7. Scans/filters for the exact advertised name `AdlaWatt-AW-01`.
8. Connects, discovers services/characteristics, subscribes to TX notifications, then writes the provisioning payload to RX.
9. Treats `wifi_lost` as a warning, not a failure.
10. Validates the `configured` acknowledgment before showing success.

## 2. BLE contract

Keep these values unchanged:

```text
Device name: AdlaWatt-AW-01

Service UUID: 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
RX UUID:      6E400002-B5A3-F393-E0A9-E50E24DCCA9E
TX UUID:      6E400003-B5A3-F393-E0A9-E50E24DCCA9E

Device code:  482913
Device ID:    AW-01
```

Characteristic roles:

- RX characteristic: phone writes JSON payload to ESP32.
- TX characteristic: ESP32 sends status notifications to phone.
- TX must support notify and include a CCCD descriptor.
- RX must support write with response because the app currently writes with `withResponse: true`.
- RX may also support write without response, but the app does not use it.
- The app writes with response enabled and chooses a negotiated-MTU-aware chunk size up to 512 bytes.
- The app uses `max(1, mtu - 3)` as the chunk size and falls back to MTU 517 for compatibility.
- Firmware must accept ATT long writes because the payload can be split into multiple chunks.

The app subscribes to TX before writing RX.

### Pairing and connection confirmation

OS pairing or bonding is not required for the current open Nordic UART GATT link. Do not pair AW-01 manually in phone Bluetooth settings.

Pairing is only needed if the firmware later requires an encrypted or authenticated link. In that case, Android shows its pairing dialog and iOS shows its system prompt when a protected attribute is accessed.

The app confirms connection accuracy using the real BLE lifecycle, not OS pairing:

1. `connected` is shown only after GATT connect resolves.
2. `subscribed` is shown only after TX notification subscription resolves.
3. `writing` is shown only after the payload is built and immediately before RX write.
4. Firmware `received` confirms the complete JSON was accepted.
5. Firmware `configured` with the matching `device_id` and `monitor_id` confirms provisioning success.

`connected`, `subscribed`, and `writing` are app-only UI stages. Firmware must not send them as status tokens.

## 3. Provisioning payload sent by the app

The app sends this exact JSON structure:

```json
{
  "device_code": "482913",
  "device_id": "AW-01",
  "wifi_ssid": "YOUR_WIFI_NAME",
  "wifi_password": "YOUR_WIFI_PASSWORD",
  "monitor_id": 1100
}
```

Rules:

- `monitor_id` is a JSON number, never a string.
- `device_code` and `device_id` are fixed strings.
- No Supabase URL, access token, service key, user ID, or other account data is sent over BLE.
- The payload may arrive in multiple BLE write chunks. The firmware must accumulate chunks until a complete JSON object is received.
- The firmware should ignore new provisioning writes while provisioning is already in progress.
- For verification, ESP32 `Serial` output should show the received `device_id`, `monitor_id`, SSID, and password length, but never the password itself.

## 4. Firmware validation requirements

The ESP32 must validate:

- `device_code == "482913"`
- `device_id == "AW-01"`
- `wifi_ssid` length is 1 to 32 bytes
- `wifi_password` length is 0 to 64 bytes
- `monitor_id` is an integer greater than `0`
- `monitor_id` is less than or equal to `4294967295`

If validation fails, notify:

```text
error
```

Do not save invalid configuration.

## 5. Wi-Fi and NVS behavior

The ESP32 must test Wi-Fi before saving:

1. Connect using the submitted `wifi_ssid` and `wifi_password`.
2. If connection succeeds, save configuration to NVS.
3. If connection fails, do not save and notify `wifi_failed`.

Recommended NVS namespace:

```text
aw-config
```

Recommended keys:

```text
ssid
password
monitor_id
device_id
```

Only save `monitor_id` after Wi-Fi succeeds and the configuration is verified.

If saving or verification fails, roll back to the previous configuration and notify:

```text
error
```

## 6. Status notification contract

The app accepts only these status tokens:

```text
received
busy
wifi_connected
wifi_failed
wifi_lost
configured
error
disconnected
```

Status meanings:

- `received`: firmware received the complete JSON payload.
- `busy`: firmware started provisioning.
- `wifi_connected`: firmware connected to the submitted Wi-Fi network.
- `wifi_failed`: firmware could not connect to Wi-Fi.
- `wifi_lost`: Wi-Fi connection was lost after being configured. This is a warning, not a terminal failure.
- `configured`: provisioning completed successfully. JSON acknowledgment is preferred.
- `error`: firmware rejected the payload or failed to save configuration.
- `disconnected`: usually detected by the app through BLE link state.

Do not invent new firmware status tokens such as `ready`, `ok`, `success`, `connected`, `subscribed`, or `writing`. The app-only lifecycle stages with those names are never sent by firmware. Put debug output on `Serial` only.

## 7. Notification cleanup applied in the app

Before parsing any BLE notification, the app:

1. Decodes bytes as UTF-8.
2. Removes NUL bytes.
3. Trims leading/trailing whitespace.
4. Parses either a plain token or a JSON object.

Plain token example:

```text
configured
```

JSON object example:

```json
{
  "status": "configured",
  "device_id": "AW-01",
  "monitor_id": 1100
}
```

The app also accepts `state` instead of `status`, but firmware should send `status`.

Unknown notifications are treated as non-terminal debug data and ignored.

## 8. configured acknowledgment validation

For successful provisioning, the firmware should send:

```json
{
  "status": "configured",
  "device_id": "AW-01",
  "monitor_id": <the same monitor_id that was received and saved>
}
```

The app validates:

- If `monitor_id` is present, it must match the ID originally sent.
- If `device_id` is present, it must equal `AW-01`.
- If either field mismatches, the app reports failure and does not show success.
- Plain-text `configured` is still accepted for compatibility, but JSON acknowledgment is preferred.

## 9. Failure handling

Recommended firmware status sequence:

```text
received
busy
wifi_connected
configured
```

Wi-Fi failure:

```text
received
busy
wifi_failed
```

Validation or NVS failure:

```text
received
busy
error
```

The app treats these as terminal failures:

```text
wifi_failed
error
disconnected
timeout
```

The app does not treat these as terminal failures:

```text
received
busy
wifi_connected
wifi_lost
```

## 10. Timing constraints

Current app timing:

- Overall provisioning timeout: 60 seconds.
- BLE connect timeout: 15 seconds.
- TX subscribe timeout: 10 seconds.
- RX write timeout: 10 seconds.

The firmware should keep Wi-Fi connection attempts short enough to finish within the app timeout. A 20-second Wi-Fi timeout is compatible.

## 11. App diagnostics and failure mapping

Development builds record a credential-safe trace for provisioning:

- provisioning start and selected peripheral id;
- authenticated monitor assignment lookup status and resolved monitor id;
- discovered service, RX, and TX characteristic presence;
- negotiated MTU, chunk size, and chunk count;
- TX subscription completion;
- payload byte length, `device_id`, `monitor_id`, SSID byte length, and password byte length;
- RX write invocation, completion, and native error code;
- status notification token, length, and ack validity;
- cleanup reason and disconnect attempt.

The app never logs the Wi-Fi password or raw payload content.

The app maps common BLE failures to actionable UI messages:

- `WRITE_NOT_PERMITTED`: RX lacks write-with-response support.
- `DESCRIPTOR_NOT_FOUND`: TX lacks a CCCD descriptor.
- `CHARACTERISTIC_NOT_FOUND` or `SERVICE_NOT_FOUND`: firmware UUIDs do not match.
- `OPERATION_TIMEOUT`: BLE operation exceeded its deadline.
- `DISCONNECTED`: GATT link dropped during setup.
- `GATT_ERROR`: device rejected the write or another ATT/GATT error occurred.

The monitor assignment lookup has a 12-second deadline. If retries are exhausted, the Add Device screen shows a manual assignment retry button instead of leaving the user blocked.

## 12. What the ESP32 must not do

- Do not include Supabase libraries.
- Do not include Supabase URL, anon key, service key, or access tokens.
- Do not call Supabase directly.
- Do not generate a random `monitor_id`.
- Do not use a hardcoded `monitor_id`.
- Do not send user/account data over BLE.
- Do not log the Wi-Fi password to Serial.
- Do not send status tokens outside the accepted list.

## 13. Applied source files

The applied mobile-app changes are in:

- `src/services/monitoringService.ts`
- `src/services/provisioningBleService.ts`
- `src/app/dashboard/add-device.tsx`
- `src/locales/en.ts`
- `src/locales/fil.ts`
- `src/locales/ceb.ts`
- `src/services/__tests__/monitoringService.provisioning.test.ts`
- `src/services/__tests__/provisioningBleService.test.ts`

A full implementation report is also stored in this repository history under the commit:

```text
3686c74 fix: harden BLE provisioning monitor id flow
```

## 14. Verification results at the time of application

- `npm run typecheck`: passed.
- `npm run lint`: 0 errors; 3 pre-existing warnings only.
- Focused provisioning tests: 2 suites, 33 tests passed.
- Full test suite: 39 suites, 898 tests passed.
- `git diff --check`: passed.
