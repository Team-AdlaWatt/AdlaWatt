# Activity Logging Design

## Overview

The activity log is a **manual write pipeline** with no database triggers and no Auth hooks, so every row in `activity_logs` exists because app code called `logActivity()` at the right place. It lives in `src/services/activityLogService.ts` and answers one question per call: *what just happened, for whom, and how severe is it?*

It consumes one thing:

- A **log intent** (title, description, severity) from the call site.

It produces one Supabase row:

| Column        | Source                                     |
|---------------|--------------------------------------------|
| `user_id`     | Resolved inside the service via `getUser()` |
| `title`       | Short event label (e.g. `"Electronics Added"`) |
| `description` | Human detail (e.g. `"Stand Fan (75W) added"`) |
| `type`        | `info`, `warning`, `error`, or `critical`  |
| `act_id` / `created_at` | Server-generated                     |

The readers already define the contract: `activity-logs.tsx` selects `act_id, title, description, type, created_at` scoped by `user_id`, and `ActivityLogCard` renders the four-type union. Unknown `type` values coerce to `"info"`, so the writer must only ever send the four known severities.

The service performs the full submission pipeline:

1. Resolve the current user via `getUser()` (server-validated; skip silently when no session).
2. Build the row (`user_id`, `title`, `description`, `type`).
3. Insert into `activity_logs` (no `.select()` — boolean outcome only).
4. Swallow all failures to `console.warn` — logging must never break UX.

Supabase blocks automatic capture of session-layer events (login, logout, token refresh, password/email changes), so those are caught by **manual `logActivity()` calls** in the auth flows. The table itself imposes no limits beyond this contract.

---

## Severity Rules

| Severity   | Meaning                                                        |
|------------|----------------------------------------------------------------|
| `info`     | Normal completed actions and recoveries                        |
| `warning`  | Destructive, sensitive, or degraded-but-working events         |
| `error`    | Lost data, lost sensors, failed sync                           |
| `critical` | Safety, overload, offline, or account-danger events            |

Rules:

- **Failures that threaten the account or hardware escalate.** Wrong passwords stay `warning`; inverter overload is `critical`.
- **Destructive user actions are `warning`, not `info`.** Deleting an electronics item is not routine.
- **Sensitive account changes are `warning`.** Password changes and pending email confirmations get visibility.
- **Recoveries are `info`.** Device back online, sensor reconnected — the all-clear is routine.

---

## Event Catalog

### Auth (`src/services/auth.ts`, `menu.tsx :: handleLogout`)

| Event | Type | Call site |
|---|---|---|
| Account Created | `info` | `registerUser()` success (username handle only) |
| Logged In | `info` | `loginUser()` success (generic `"Signed in."` — never emails or usernames) |
| Logged Out | `info` | `handleLogout()` success |
| Login Failed | `warning` | `loginUser()` wrong password / unknown user |
| Logout Failed | `warning` | `handleLogout()` catch |

- Credential rule: descriptions never carry emails, passwords, or tokens.
  Rows are already scoped by `user_id`, so identity is implicit.

### Profile (`updateAccount()`)

| Event | Type | Condition |
|---|---|---|
| Username Updated | `info` | username changed |
| Email Updated | `info` | email changed immediately |
| Email Confirmation Pending | `warning` | username saved, email needs confirm |
| Password Changed | `warning` | `newPassword` set |
| Verification Failed | `warning` | current-password or availability check failed |

- Pure validation with no changes (`"No changes made"`) logs nothing.

### Electronics (`ApplianceModal.tsx`)

| Event | Type | Call site |
|---|---|---|
| Electronics Added | `info` | `handleCustomAdd()` success |
| Electronics Updated | `info` | `handleCustomUpdate()` success |
| Electronics Removed | `warning` | `handleCustomDelete()` success |
| Selection Saved | `info` | `handleSave()` (count/names, not per toggle) |
| Selection Reset | `info` | `handleReset()` |

- Staging actions (`toggleAppliance()`, search, modal open/close) log nothing; only the commit.

### Solar / Battery (explicit calls only — never notification mirrors)

| Event | Type |
|---|---|
| Charging Started / Stopped / Idle | `info` |
| Battery Fully Charged | `info` |
| Solar Input / Milestones (50 W) / DoD Safe | `info` |
| Battery Low (≤20%), Unsafe DoD, Runtime Depleted | `warning` → `critical` |
| Charging Not Detected, Solar Unavailable, Invalid Data | `warning` |

- Notifications never mirror into this table. If a hardware condition needs
  history here, add an explicit call with a distinct title at the firing
  point — never the same title as the notification.

### ESP32 / Sensors (explicit calls only — never notification mirrors)

| Event | Type |
|---|---|
| System Online / Recovered | `info` |
| System Offline | `critical` |
| Sensor Disconnected (zero reads) | `error` |
| Channel Error / Timeout | `error` |
| Device Row Deleted | `warning` |

- Connection-health diagnostics (stale/missing monitoring data, null
  last_seen) are notifications-only and are intentionally not logged here.

### Settings (`menu.tsx`)

| Event | Type | Call site |
|---|---|---|
| Preferences Saved | `info` | `handleSavePreferences()` (single entry for font + theme + email toggle) |

- Local-only toggles (color-blind mode, vibration, email, language) log nothing until persisted.

### Skipped by design

View-only filters, searches, per-keystroke staging, notification mark-read/delete, `BackHandler.exitApp()`.

---

## Submission API

`logActivity()` is fire-and-forget — callers never await it and it never throws:

```
logActivity({ title, description, type })  ->  void (never throws)
logAuth.accountCreated(username)          ->  void
logAuth.loggedIn()                        ->  void (generic "Signed in.")
logAuth.loggedOut()                       ->  void
logAppliance.added(name, watts)           ->  void
logPower.low(percent) / .full()           ->  void
logDevice.offline() / .online()           ->  void
logSettings.preferencesSaved(summary)     ->  void
```

Helper functions:

```
resolveUserId()  = getUser() -> id or null (null skips silently)
buildRow(userId, input) = { user_id, title, description ?? "", type ?? "info" }
submitRow(row)   = insert into activity_logs; catch -> console.warn
```

---

## Display Rules

The logging service feeds one screen:

1. **Activity Logs screen** — full filtered list with type/time filters and pagination.
2. **ActivityCard** — dashboard recent-activity preview reading the same table.

Shared rules:

- Wire the writer `type` into the existing four visual states; the reader already coerces unknowns to `"info"`.
- Keep descriptions to one line with concrete nouns (`"Stand Fan (75W) added"`, not `"Item updated"`).
- Never `await` a log call inside a user gesture handler; fire and continue.
- Do not log from the readers — writes happen only at action and rule-firing points.

---

## Errors to Avoid

- Do not `await` `logActivity()` in button handlers; a slow insert must never freeze login or saving.
- Do not throw from the service; a failed insert is a `console.warn`, never a user-facing error.
- Do not log view-only actions; filters, searches, and staging toggles are not activity.
- Do not log raw monitoring changes and never mirror notification rules; the two lists must stay different.
- Do not send severities outside `info | warning | error | critical`; the reader coerces unknowns and the data loses meaning.
- Do not trust client identity; always resolve `user_id` server-side via `getUser()`, never from params.
- Do not log secrets; descriptions carry names and wattages, never passwords, tokens, or emails beyond the account identifier already stored.

---

## References

1. `src/services/activityLogService.ts` — writer source (catalog, submission, wrappers).
2. `src/app/dashboard/activity-logs.tsx` — reader contract (`act_id, title, description, type, created_at` scoped by `user_id`).
3. `src/components/ActivityLogCard.tsx` — display types and four-state rendering.
4. `src/services/notificationService.ts` — fully separate; never writes here.
5. `src/services/auth.ts` — auth call sites (`registerUser`, `loginUser`, `updateAccount`).
6. `src/components/forms/ApplianceModal.tsx` — electronics mutation call sites.
