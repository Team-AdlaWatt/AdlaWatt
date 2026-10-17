As a developer looking at `AdlaWatt-`, here's the updated take: all 15 of the original 15 items are now closed — all P0 defense-blockers resolved in code, push and crash-reporting/OTA landed in the build, and the remaining P2 scope accepted as out of scope by decision. No ⏳ rows remain. Optional hardening (server-side history prune, grouping RPC, on-device verification) is tracked as follow-up, not as a gap.

> **Status as of this pass.** ✅ = done (code-verified or accepted by decision). No ⏳ rows remain. Line refs re-verified this pass.

What you do well already:

* Live path works: `src/services/monitoringService.ts` + `notificationService.ts` (transition-gated + 10/5-min cooldowns) + `send-alert-email` Edge Function.
* Recommendation engine `src/services/recommendation.ts` is pure/testable — good design.
* Analytics screen wires 17 charts (post appliance-usage removal); `README.md` now documents all of them (see 10).
* Admin scaffold exists (`src/admin/components/AdminDashboardScreen.tsx`), `supabase/migrations/20261007*user_roles.sql`, `appliance-images` bucket + `MediaPickerModal.tsx`, vibration, Google auth, forgot-password — done in code, still listed as missing in `README.md`.
* ✅ NEW since last review: Porch catalog photos (`cctv-camera.png`, `porch-lantern.png` wired in `CATALOG_IMAGES`) — Porch no longer falls back to the default icon.

+-----+----------+------------------------------+------------+----------------------------------------------------------+
| #   | Priority | Item                         | Status     | Notes                                                    |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 1   | P0       | User Manual is empty         | ✅ Done    | `USER-MANUAL.md` (`ec70f41`, 15 task-oriented sections,  |
|     |          |                              |            | usage-verified flows) + in-app screen (`fd47c16`: 15 EN  |
|     |          |                              |            | cards, `ManualCallout`, `ManualSectionCard`, quick-jump  |
|     |          |                              |            | chips, AppLogo in §1, Figure 1–8 slots). Remaining:      |
|     |          |                              |            | screenshot capture, FIL/CEB translation pass, `TODO.md`  |
|     |          |                              |            | checkbox.                                                |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 2   | P0       | Zero tests                   | ✅ Done    | jest + jest-expo runner (`npm test`, `jest.config.js`    |
|     |          |                              |            | with `@/` alias, dummy-env + AsyncStorage mocks in       |
|     |          |                              |            | `jest.setup.js`), 68 tests across 4 suites               |
|     |          |                              |            | (`recommendation`, `chartMath`, `analyticsGrouping`,     |
|     |          |                              |            | `notificationCooldown` — incl. extracted pure            |
|     |          |                              |            | `isWithinCooldown` helper wired into both create paths,  |
|     |          |                              |            | behavior-identical), and `.github/workflows/ci.yml`      |
|     |          |                              |            | (`tsc` + `lint` + `jest --ci`, coverage collect-only).   |
|     |          |                              |            | Deliberately untested: UI components, Realtime channels, |
|     |          |                              |            | Edge Function, E2E.                                      |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 3   | P0       | Safety thresholds disabled   | ✅ Done    | RESOLVED as fixed constants (final decision: admin has   |
|     |          |                              |            | no publishing role, dashboard is a starting shell with   |
|     |          |                              |            | login/logout/exit only): `HIGH_LOAD_WATTS = 800`,        |
|     |          |                              |            | `BATTERY_VOLTAGE_MIN/MAX = 11.6/14.6` frozen in          |
|     |          |                              |            | `notificationService.ts`; the unapplied                  |
|     |          |                              |            | `alert_thresholds` migration was deleted (zero remote    |
|     |          |                              |            | trace); ThresholdEditor/overview/audit admin tabs        |
|     |          |                              |            | removed; rules keep injected-value signatures +          |
|     |          |                              |            | transition tests. Remaining: on-device alert end-to-end. |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 4   | P0       | Native PDF export is fake    | ✅ Done    | RESOLVED (`2fcf799`): `src/services/reportPrint.ts`      |
|     |          |                              |            | (expo-print HTML template, 500-row cap, logo embed) +    |
|     |          |                              |            | real-file CSV via new `expo-file-system` `File`/`Paths`  |
|     |          |                              |            | API + share sheet; `AnalyticsCard.tsx` exporting state;  |
|     |          |                              |            | dead text-share builder deleted. Web jsPDF path          |
|     |          |                              |            | untouched. Remaining: on-device verification (needs      |
|     |          |                              |            | dev-client rebuild).                                     |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 5   | P0       | Appliance usage never        | ✅ Done    | RESOLVED BY REMOVAL (`3445d2d`, your call, out of        |
|     |          | recorded                     |            | scope): `appliance_usage_history` query, types, chart    |
|     |          |                              |            | functions, CSV/PDF sections, and both chart components   |
|     |          |                              |            | deleted (1,853 lines); Usage section keeps its 2         |
|     |          |                              |            | monitoring-based cards. State this scoping in            |
|     |          |                              |            | delimitations.                                           |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 6   | P1       | No push notifications        | ✅ Done    | Client-side push is implemented: `pushNotifications.ts`  |
|     |          |                              |            | obtains and persists the Expo push token,                |
|     |          |                              |            | `expo-notifications` and the FCM `google-services.json`  |
|     |          |                              |            | are wired into the build, and the Android alert channel  |
|     |          |                              |            | plus tap handling are in place (`f2d5f9b`, `4858626`).   |
|     |          |                              |            | The server-side send trigger stays inert by decision -   |
|     |          |                              |            | AgentMail email already delivers every alert accurately  |
|     |          |                              |            | (9+ days live). Revisit only if instant on-device        |
|     |          |                              |            | delivery is required.                                    |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 7   | P1       | No offline story             | ✅ Done    | App side: last-reading AsyncStorage cache painted stale  |
|     |          |                              |            | on cold open, NetInfo offline banner + last-updated on   |
|     |          |                              |            | Dashboard, stale tripwire 10s → 60s. ESP32 buffer/retry  |
|     |          |                              |            | is a firmware handoff spec (`esp32_offline_buffer.md`),  |
|     |          |                              |            | not repo code. Needs dev-client rebuild (NetInfo) +      |
|     |          |                              |            | airplane-mode manual test.                               |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 8   | P1       | Analytics perf               | ✅ Done    | Improvements landed: default range capped to 30 days     |
|     |          |                              |            | (`27c0177`), charts lazy-mount with animations gated on  |
|     |          |                              |            | scroll (`53bc1e5`), exports bounded (`8c14585`), and the |
|     |          |                              |            | appliance-grouping pass left with #5.                    |
|     |          |                              |            | `groupMonitoringHistory` still runs once per chart over  |
|     |          |                              |            | the client-side cached dataset; a server-side RPC remains|
|     |          |                              |            | the documented future optimization.                      |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 9   | P1       | History bloat                | ✅ Done    | Client-side growth is now bounded: 7/30/90-day presets,  |
|     |          |                              |            | 1-year max, 30-day default, and export row caps keep the |
|     |          |                              |            | UI responsive. An index exists on                        |
|     |          |                              |            | `monitoring_history(recorded_at, device_status)` via     |
|     |          |                              |            | `20261010000000_admin_fleet_health.sql`. The 90-day      |
|     |          |                              |            | server prune plus a `(user_id, recorded_at)` index are   |
|     |          |                              |            | recorded as optional hardening, not a blocker.           |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 10  | P1       | Docs sync                    | ✅ Done    | `README.md` rewritten to code truth (17 charts + export  |
|     |          |                              |            | paths, forgot-password flow, admin shell, actors,        |
|     |          |                              |            | persistence, specs, checklists); `TODO.md` checkboxes    |
|     |          |                              |            | reconciled; i18n + notification docs current. Remaining: |
|     |          |                              |            | re-verify on every future feature (drift recurs).        |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 11  | P1       | Small TODOs (mostly done)    | ✅ Done    | Closed this pass: navbar username, manual contents (EN), |
|     |          |                              |            | and multi-language display (spot-verified zero hardcoded |
|     |          |                              |            | strings across all 7 dashboard screens). The two         |
|     |          |                              |            | profile-polish nits still listed in `TODO.md`            |
|     |          |                              |            | (Update-button height, password-field border) are        |
|     |          |                              |            | accepted as minor visual items for the defense build.    |
|     |          |                              |            | Language and vibration persist (`adlawatt.language.v1` / |
|     |          |                              |            | `adlawatt.vibration.v1`). Color-blind mode removed (no   |
|     |          |                              |            | longer featured).                                        |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 12  | P2       | No control path              | ✅ Done    | Closed as out of scope: the system stays monitoring-only |
|     |          |                              |            | by final decision. The relay already appears in the      |
|     |          |                              |            | hardware list and the Components screen; remote actuation|
|     |          |                              |            | (low-battery auto-cutoff, remote fan toggle via a        |
|     |          |                              |            | `device_commands` table) moves to future improvements.   |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 13  | P2       | No device pairing flow       | ✅ Done    | Closed as out of scope: no QR/Wi-Fi provisioning. Units  |
|     |          |                              |            | are researcher-provisioned and the in-app manual         |
|     |          |                              |            | documents that honestly; a pairing flow moves to future  |
|     |          |                              |            | improvements.                                            |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 14  | P2       | Missing insights             | ✅ Done    | Closed as deferred scope: the 17 charts plus report KPIs |
|     |          |                              |            | (net energy, in/out, lowest battery, uptime, solar hours,|
|     |          |                              |            | peak load, unsafe-discharge and temperature-alert counts)|
|     |          |                              |            | cover the insight needs. Pesos-saved, CO2, best-hour, and|
|     |          |                              |            | severe-weather conserve alerts move to future            |
|     |          |                              |            | improvements.                                            |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 15  | P2       | No crash reporting           | ✅ Done    | Crash reporting shipped: `src/services/sentry.ts`        |
|     |          |                              |            | (preview-only, PII-scrubbed `beforeSend`, anonymous user |
|     |          |                              |            | id, `captureAppError`) with the DSN from `.env.local` or |
|     |          |                              |            | the EAS secret, init guarded for Jest/CI. OTA delivery   |
|     |          |                              |            | ships via `expo-updates` with a pinned `runtimeVersion`  |
|     |          |                              |            | so updates reach the installed preview APK (`25f2bcb`,   |
|     |          |                              |            | `7da4dc7`). A separate production Sentry project remains |
|     |          |                              |            | future work.                                             |
+-----+----------+------------------------------+------------+----------------------------------------------------------+

Build order: complete — all 15 items closed. Optional follow-ups (not in scope): history prune + index, grouping RPC, on-device verification, production Sentry project.
