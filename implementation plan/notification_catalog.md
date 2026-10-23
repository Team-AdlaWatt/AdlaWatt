# Notification Catalog Design

## Overview

Notifications are **device-state transitions**, not user actions. They live in `src/services/notificationService.ts` as `check*()` rule functions evaluated against live `monitoring` rows, and answer one question per firing: *what changed on the hardware right now?*

Each rule consumes one thing:

- A **current vs previous `monitoring` snapshot** (transition-gated; level-triggered only where noted).

It produces one `notifications` row:

| Column        | Source                                              |
|---------------|-----------------------------------------------------|
| `user_id`     | Caller-provided (rules run per-user from the watcher) |
| `title`       | Fixed per rule (e.g. `"Device Offline"`)            |
| `description` | Fixed per rule, occasionally value-bearing          |
| `type`        | `normal` (informative) or `alert` (needs attention) |
| `read`        | Always `false` on insert                            |

Delivery is cooldown-gated two ways: an in-memory `Map<user:type:title>` plus a DB last-`created_at` check (`NOTIFICATION_COOLDOWN_MS` 10 min default; `UPDATE_NOTIFICATION_COOLDOWN_MS` 5 min for high-frequency fields passed explicitly to `createNotificationWithCooldown`). Notifications never write to `activity_logs` — the lists stay fully separate (see `activity_logging.md`); routine transitions never touch that table.

Scope boundary with activity logs: **notifications record what the hardware did; activity logs record what the user did (auth, electronics, settings).** A low battery fires a notification; the user unplugging an electronics item over it writes an activity entry. No notification rule mirrors — even safety consequences stay notifications-only unless re-added as explicit distinct-title activity calls.

---

## Cooldown Reference

| Constant | Value | Used by |
|---|---|---|
| `NOTIFICATION_COOLDOWN_MS` | 10 min | `createNotification()` (memory + DB gate) |
| `UPDATE_NOTIFICATION_COOLDOWN_MS` | 5 min | High-frequency field updates via `WithCooldown` |
| `SOLAR_INPUT_MILESTONE_WATTS` | 50 W | Upward-crossing milestones, stateful, reset at 0, follows down on decrease |
| `CURRENT_LOAD_MILESTONE_WATTS` | 50 W | Same pattern for consumption |
| `STALE_MONITORING_INTERVAL_MS` | 60 s | `last_seen` freshness + watcher period (raised from 10 s: ESP32 posts every few seconds, phone-side jitter rarely exceeds half a minute) |
| Runtime hourly bucket | 1 h | `Runtime Updated` fires on hour-bucket change of `time_remaining` |

---

## Final List Alignment (monitoring-table based)

Normal: Battery Fully Charged, Battery Charging, Battery Discharging, Battery Idle, Solar Input Low / Moderate / High, Solar Charging Activity (50 W), Load Activity Detected (50 W), Runtime Updated (hourly), Battery Temperature Elevated / High, Solar Temperature Elevated / High, Device Online, Device Offline.

Alert: Battery Normal-Use Cutoff Reached (≤ 20%), Battery Critically Low (< 20%, > 0), Battery Empty (= 0), Unsafe Depth of Discharge, Critical Battery Temperature, Critical Solar Temperature.

---

---

## Battery Rules

| Title | Type | Trigger |
|---|---|---|
| Battery Charging / Discharging / Idle | `normal` | `battery_status` transition |
| Battery Fully Charged | `normal` | Level reaches 100% from below |
| Battery Level / Status / Voltage / Watt-Hours Updated | `normal` | Field changed (5-min cooldown, kept for diagnostics) |
| Runtime Updated | `normal` | Hour-bucket change of `time_remaining` (5-min cooldown) |
| Depth of Discharge Safe (+ Returned to Safe) | `normal` | `dod_status` → Safe |
| Unsafe Depth of Discharge | `alert` | `dod_status` → Unsafe |
| Battery Normal-Use Cutoff Reached | `alert` | Level ≤ 20% (also evaluated on init) |
| Battery Critically Low | `alert` | Level < 20% and > 0% |
| Battery Empty | `alert` | Level = 0 (transition-gated) |
| Battery Discharging at Low Level | `alert` | ≤ 20% while Discharging |
| Battery Discharging with Unsafe DoD | `alert` | Discharging + Unsafe DoD |
| Battery Runtime Depleted | `alert` | `time_remaining` hits `0h 00m` |
| Battery Voltage Reading Zero | `alert` | Voltage reads 0 (sensor lost) |
| Battery Charging Not Detected | `alert` | Level < 100%, not Charging, solar present |
| Invalid Time Remaining | `alert` | Malformed `time_remaining` |
| Battery Voltage Too Low / Too High | `alert` | Downward/upward crossing of the fixed `BATTERY_VOLTAGE_MIN/MAX` (11.6 V / 14.6 V engineering constants) |

## Solar Rules

| Title | Type | Trigger |
|---|---|---|
| Solar Input Low / Moderate / High | `normal` | `solar_status` changed (split fixed titles, no generic duplicate) |
| Solar Input Detected / No Solar Input | `normal` | 0 ↔ >0 crossings |
| Solar Charging Activity | `normal` | 50 W upward milestones, follows down on decrease (5-min cooldown) |
| Solar Input Unavailable | `alert` | Solar reads 0 while Charging |
| Low Solar Input During Charging | `alert` | Charging + Low solar on entry |

## Weather / Temperature Rules

| Title | Type | Trigger |
|---|---|---|
| Battery Temperature Nominal / Elevated / High | `normal` | Status transitions |
| Critical Battery Temperature | `alert` | Status → Critical |
| Solar Temperature Nominal / Elevated / High | `normal` | Status transitions |
| Critical Solar Temperature | `alert` | Status → Critical |
| Battery / Solar Temperature Reading Zero | `alert` | Sensor reads 0 (disconnected) |

- These cover sensor temperatures only. Forecast-weather alerts (storms, heavy rain from the OpenWeatherMap feed) do not exist — proposed below.

## Device / Connection Rules

| Title | Type | Trigger |
|---|---|---|
| Device Online | `normal` | Status becomes Online (incl. first sighting) |
| Device Offline | `normal` | Online → Offline transition |
| Device Status Changed | `normal` | Any `device_status` change (5-min cooldown) |
| Monitoring Data Updated | `normal` | Row payload changed (5-min cooldown) |
| Monitoring Record Missing | `alert` | No `monitoring` row (also checked on init) |
| Missing Last-Seen Timestamp | `alert` | `last_seen` is null |
| Monitoring Data Stale | `alert` | `last_seen` invalid or older than 10 s |

## Components Rules

| Title | Type | Trigger | Status |
|---|---|---|---|
| Current Load Detected / No Current Load | `normal` | 0 ↔ >0 crossings | Exists (generic, not per-component) |
| Load Activity Detected | `normal` | 50 W upward milestones, follows down on decrease | Exists (generic) |
| High Current Load | `alert` | Upward crossing of the fixed `HIGH_LOAD_WATTS` (800 W engineering constant) | Implemented (`checkHighCurrentLoad`) |
| Component Went Inactive (per component) | `alert` | `components.status` Active → Inactive, via the service's `components` watcher | Implemented (`checkComponentStatusTransition`) |
| Critical Component Inactive | `alert` + `critical` mirror | Relay / INA228 / INA219 inactive | Implemented — severity by component role |
| Component Back Online | `normal` + `info` mirror | `components.status` Inactive → Active | Implemented |

## Electronics Recommendation Rules

Two rules read the electronics catalog plus the shared recommendation engine (tier, watt cap, wattage parsing — the same functions the UI verdicts use, so rules and UI can never disagree):

| Title | Type | Trigger |
|---|---|---|
| Electronics Became Advisable | `normal` + `info` mirror | Battery tier returns to Safe with selected electronics waiting |
| High Load While Battery Low | `alert` + `critical` mirror | Combined selected-electronics mid-wattage exceeds the charge-scaled cap at ≤ 20% SoC (10-min cooldown while the condition persists) |

Not yet implemented: *Forecast Suggests Conserving* — needs stored location plus a slow forecast poller independent of the monitoring cadence (see Errors to Avoid).

---

## Submission API

```
createNotification(userId, { title, description, type })
createNotificationWithCooldown(userId, { title, description, type }, cooldownMs)
```

Helper behavior:

```
cooldownGate(userId, type, title)  = memory Map check + DB last-created check
insertNotification(...)            = insert with read: false; returns boolean
```

---

## Display Rules

The rules feed one surface:

1. **Notifications screen** — filterable list with type/time filters, pagination, Recent vs Read split, mark-all-read.
2. **Navbar badge** — lit when any unread row exists for the user.

Shared rules:

- Titles are fixed strings — never interpolate live values into `title` (cooldown keys depend on title stability).
- Live values belong in `description` (`"Load at 840W exceeds safe limit."`, not `"Overload 840W"`).
- `normal` rules inform; `alert` rules demand a glance. Do not promote routine transitions to `alert` to chase attention.
- Never write to `activity_logs` from notification rules — the two lists must stay different. Safety events needing history must use explicit distinct-title activity calls, never same-title mirrors.

---

## Errors to Avoid

- Do not create rules without cooldown protection; sensor jitter becomes a notification storm.
- Do not create rules that write to `activity_logs`; the lists must stay fully separate.
- Do not put live values in `title`; it breaks cooldown keys and fragments history.
- Do not mark routine transitions (`Charging`, `Level Updated`, milestones) with `logAs`; the activity table gets signal, not telemetry.
- Do not evaluate rules on raw snapshots; always compare current vs previous or the rule refires every poll.
- Threshold values are frozen engineering constants in `notificationService.ts` (800 W / 11.6 V / 14.6 V) — the admin dashboard is a non-functional shell with no publishing role, so nothing reads thresholds at runtime and nothing may be silently `null`.
- Do not duplicate the Safe/Returned-to-Safe pair on one transition (fixed in `checkDepthOfDischarge` — only the transition-accurate "Returned to Safe" fires, since `dod_status` is binary).
- Do not add forecast rules that poll the weather API on the monitoring cadence; poll forecasts on their own slow schedule.

---

## References

1. `src/services/notificationService.ts` — all rule functions, cooldowns, choke-point inserts.
2. `src/services/activityLogService.ts` — `logAs` mirror target and severity contract.
3. `src/app/dashboard/notifications.tsx` — list, filters, mark-read, badge source.
4. `src/services/monitoringService.ts` — `monitoring` row shape and realtime feed the rules evaluate.
5. `implementation plan/activity_logging.md` — the sibling catalog; scope boundary defined in both docs.
