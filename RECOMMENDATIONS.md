As a developer looking at `AdlaWatt-`, here's the updated take: 7 of the original 15 items are now resolved (commits below) — all P0 defense-blockers closed. Push was built then dropped by decision (AgentMail suffices), so it returns to ⏳ as documented scope, not missing function. Remaining: analytics perf, history bloat, one profile-polish TODO, and P2 scope.

> **Status as of docs-sync pass.** ✅ = done (commit ref), ⏳ = pending. Line refs re-verified this pass.

What you do well already:

* Live path works: `src/services/monitoringService.ts` + `notificationService.ts` (transition-gated + 10/5-min cooldowns) + `send-alert-email` Edge Function.
* Recommendation engine `src/services/recommendation.ts` is pure/testable — good design.
* Analytics screen wires 17 charts (post appliance-usage removal) — `README.md` still claims 1; docs drift persists (see ⏳ 10).
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
| 6   | P1       | No push notifications        | ⏳ Open    | Dropped by decision: AgentMail email already delivers    |
|     |          |                              |            | every alert accurately (9+ days live), so push was cut  |
|     |          |                              |            | as unnecessary scope. Code fully removed; pasted         |
|     |          |                              |            | `push_notifications` column + `push_tokens` table and   |
|     |          |                              |            | deployed `send-push` left inert in place. Revisit        |
|     |          |                              |            | post-defense if instant delivery is required.            |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 7   | P1       | No offline story             | ✅ Done    | App side: last-reading AsyncStorage cache painted stale  |
|     |          |                              |            | on cold open, NetInfo offline banner + last-updated on   |
|     |          |                              |            | Dashboard, stale tripwire 10s → 60s. ESP32 buffer/retry  |
|     |          |                              |            | is a firmware handoff spec (`esp32_offline_buffer.md`),  |
|     |          |                              |            | not repo code. Needs dev-client rebuild (NetInfo) +      |
|     |          |                              |            | airplane-mode manual test.                               |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 8   | P1       | Analytics perf               | ⏳ Open    | Slightly improved: appliance grouping gone with #5, but  |
|     |          |                              |            | ~15 `groupMonitoringHistory` calls + 12 frequency states |
|     |          |                              |            | remain. Consolidate grouping; consider server-side RPC.  |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 9   | P1       | History bloat                | ⏳ Open    | 5-min cron snapshots, no retention/index policy. Add     |
|     |          |                              |            | 90-day prune + `(user_id, recorded_at)` indexes.         |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 10  | P1       | Docs sync                    | ✅ Done    | `README.md` rewritten to code truth (17 charts + export  |
|     |          |                              |            | paths, forgot-password flow, admin shell, actors,        |
|     |          |                              |            | persistence, specs, checklists); `TODO.md` checkboxes    |
|     |          |                              |            | reconciled; i18n + notification docs current. Remaining: |
|     |          |                              |            | re-verify on every future feature (drift recurs).        |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 11  | P1       | Small TODOs (mostly done)    | ⏳ Open    | CLOSED this pass: navbar username, manual contents (EN), |
|     |          |                              |            | multi-language display (spot-verified zero hardcoded     |
|     |          |                              |            | strings). Still open: `menu.tsx` profile fixed-height +  |
|     |          |                              |            | black border (visual, needs on-device check). Language   |
|     |          |                              |            | and vibration persist (`adlawatt.language.v1` /          |
|     |          |                              |            | `adlawatt.vibration.v1`). Color-blind mode removed       |
|     |          |                              |            | (no longer featured).                                    |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 12  | P2       | No control path              | ⏳ Open    | Monitoring only. Relay already in hardware list; add     |
|     |          |                              |            | low-battery auto-cutoff / remote fan toggle (ESP32 polls |
|     |          |                              |            | a `device_commands` table).                              |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 13  | P2       | No device pairing flow       | ⏳ Open    | No QR/WiFi provisioning; manual honestly documents       |
|     |          |                              |            | researcher-provisioned units instead.                    |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 14  | P2       | Missing insights             | ⏳ Open    | Pesos-saved, CO2, best-hour, severe-weather conserve     |
|     |          |                              |            | alert.                                                   |
+-----+----------+------------------------------+------------+----------------------------------------------------------+
| 15  | P2       | No crash reporting           | ⏳ Open    | No Sentry, no OTA strategy, no staging vs prod split.    |
+-----+----------+------------------------------+------------+----------------------------------------------------------+

Revised build order: 11 > 9 > 8 (P2s only if time remains: 12 > 14 > 15 > 13).
