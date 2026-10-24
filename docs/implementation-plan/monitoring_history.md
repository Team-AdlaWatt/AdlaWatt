# AdlaWatt: `monitoring_history` Concepts

Final reference for the **Historical Monitoring Table** (`public.monitoring_history`).

Related table: **Live Monitoring Table** (`public.monitoring`).

---

## 1. Purpose

- Stores timestamped snapshots of the system.
- Every row is a copy of the live `monitoring` row at one moment.
- It is the only data source for analytics tables, graphs and charts.
- It answers questions like:
  - How much energy did the solar panel make today?
  - How low did the battery go this week?
  - How often was the battery in an unsafe depth of discharge?
  - Was the device online?

---

## 2. Two Tables, Two Jobs

| | `monitoring` | `monitoring_history` |
|---|---|---|
| Title | Live Monitoring Table | Historical Monitoring Table |
| Rows per user | 1 (always updated) | Many (one per snapshot) |
| Written by | ESP32 | Cron job (every 5 minutes) |
| Read by | Live dashboard | Analytics reports |
| Realtime | Yes | No |
| Purpose | Current state | Past state and trends |

---

## 3. Data Flow

1. ESP32 updates its row in `monitoring` and sends a heartbeat.
2. Every 5 minutes, cron runs `record_all_monitoring_snapshots()`.
3. It calls `record_monitoring_snapshot(monitor_id)` for each device.
4. A new row is inserted into `monitoring_history`.
5. The app calls `get_analytics_report()` or `get_analytics_summary()`.
6. The app shows the result as tables, graphs and charts.

---

## 4. Core Rules

- **One row = one snapshot.**
- **No separate daily, weekly, monthly or yearly tables.** Reports group this one table.
- **No foreign key to `monitoring`.** History must survive when `monitoring` is rebuilt.
- **`user_id` links history to the user.** It cascades on delete.
- **`monitor_id` is stored as a plain number** (100, 200, 300, ...). It can change if `monitoring` is rebuilt, so reports use `user_id`.
- **Snapshots are never edited by users.** They are read only.

---

## 5. Columns

### 5.1 Identity and time

| Column | Type | Meaning |
|---|---|---|
| `history_id` | bigint (identity, primary key) | Unique row number |
| `monitor_id` | bigint | Device row id at snapshot time |
| `user_id` | uuid | Owner of the data |
| `recorded_at` | timestamptz | When the snapshot was taken |

### 5.2 Battery

| Column | Type | Meaning |
|---|---|---|
| `battery_level` | integer | Battery percent, 0 to 100 |
| `battery_status` | text | Charging, Discharging, Idle |
| `time_remaining` | text | Estimated runtime, example `2h 30m` |
| `voltage` | numeric(10,2) | Battery voltage, number only |
| `watt_hours` | integer | Energy stored, number only |
| `dod_status` | text | Depth of discharge: Safe or Unsafe |

### 5.3 Solar

| Column | Type | Meaning |
|---|---|---|
| `solar_input` | numeric(10,2) | Current solar input |
| `solar_voltage` | numeric(10,2) | Solar voltage |
| `solar_current` | numeric(10,2) | Solar current |
| `solar_timer` | interval | Solar timer from the device |
| `total_energy` | numeric(14,3) | Total accumulated solar energy |
| `solar_status` | text | Low, Moderate, High |

### 5.4 Load

| Column | Type | Meaning |
|---|---|---|
| `current_load` | numeric(10,2) | Current electronics or system load |

### 5.5 Temperature

| Column | Type | Meaning |
|---|---|---|
| `battery_temperature` | numeric(5,2) | Battery temperature |
| `battery_temperature_status` | text | Nominal, Elevated, High, Critical |
| `solar_temperature` | numeric(5,2) | Solar panel temperature |
| `solar_temperature_status` | text | Nominal, Elevated, High, Critical |
| `interior_temp` | numeric(5,2) | Interior temperature |
| `interior_temp_status` | text | Nominal, Elevated, High, Critical |

### 5.5b Device

| Column | Type | Meaning |
|---|---|---|
| `device_status` | text | Online or Offline at snapshot time |
| `last_seen` | timestamptz | Last ESP32 heartbeat |

### 5.6 Energy counters (copied from `monitoring`)

| Column | Type | Meaning |
|---|---|---|
| `cumulative_energy_input_wh` | numeric(14,3) | Running total of energy in (Wh) |
| `cumulative_energy_output_wh` | numeric(14,3) | Running total of energy out (Wh) |

- The ESP32 must only increase these numbers.
- They are the base for the delta columns below.

### 5.7 History-only columns

| Column | Type | Meaning |
|---|---|---|
| `interval_seconds` | integer | Seconds since the previous snapshot (max 900) |
| `energy_input_wh` | numeric(14,3) | Energy in during this interval (delta) |
| `energy_output_wh` | numeric(14,3) | Energy out during this interval (delta) |

---

## 6. Counters vs Deltas

- **Counter** = running total, always going up. Example: 1200 Wh, then 1210 Wh.
- **Delta** = the change since the last snapshot. Example: 10 Wh.
- Charts need deltas. A daily bar chart sums the deltas of that day.
- Delta rules:
  - First snapshot: delta is `0`.
  - Normal case: `current counter - previous counter`.
  - Counter went down (ESP32 reboot or reset): the new counter value is used as the delta, so energy is not lost.
- Net energy = `energy_input_wh - energy_output_wh`.
  - Positive means surplus.
  - Negative means deficit.

---

## 7. Time Gap (`interval_seconds`)

- Normal gap is 300 seconds (5 minutes).
- First snapshot assumes 300 seconds.
- Gap is capped at 900 seconds, so a paused cron job does not inflate results.
- Used to calculate real **solar active time**:
  - Add `interval_seconds` of Online snapshots where `solar_input > 0`.
- Old rows from before this column existed have `0`, so they are not counted.

---

## 8. Allowed Values and Validation

| Column | Rule |
|---|---|
| `battery_level` | 0 to 100 |
| `battery_status` | Charging, Discharging, Idle |
| `solar_status` | Low, Moderate, High |
| `device_status` | Online, Offline |
| `dod_status` | Safe, Unsafe |
| Temperature statuses | Nominal, Elevated, High, Critical |
| `solar_input`, `solar_voltage`, `solar_current`, `total_energy`, `current_load`, `interior_temp`, `voltage`, `watt_hours`, `interval_seconds`, `energy_input_wh`, `energy_output_wh` | 0 or higher |

---

## 9. Indexes

| Index | Columns | Why |
|---|---|---|
| `monitoring_history_user_recorded_at_idx` | `user_id`, `recorded_at desc` | Fast per-user reports (main use) |
| `monitoring_history_monitor_recorded_at_uidx` (unique) | `monitor_id`, `recorded_at desc` | Fast latest-snapshot lookup, blocks duplicates |
| `monitoring_history_recorded_at_idx` | `recorded_at desc` | Fast date-range and cleanup queries |

---

## 10. Security (RLS)

- Row Level Security is on.
- Logged-in users can **read only their own** rows (`auth.uid() = user_id`).
- No insert, update or delete access for users.
- `anon` (ESP32) has no access to this table.
- Only internal functions and cron write to it.
- Internal functions are locked from `public`, `anon` and `authenticated`:
  - `record_monitoring_snapshot`
  - `record_all_monitoring_snapshots`
  - `purge_old_monitoring_history`
- Report functions run as the caller (`security invoker`), so RLS always applies.

---

## 11. Scheduled Jobs (pg_cron)

| Job | Schedule | Action |
|---|---|---|
| `adlawatt-monitoring-heartbeat-check` | Every 1 second | Marks stale devices Offline (live table) |
| `adlawatt-monitoring-history-snapshot` | Every 5 minutes | Records snapshots into history |
| `adlawatt-monitoring-history-retention` | Monthly (optional, commented out) | Deletes old history |

- If one device fails during a snapshot, the others are still saved. A warning is logged.

---

## 12. Analytics Functions

### 12.1 `get_analytics_report(start_date, end_date, report_frequency, report_timezone)`

- Returns one row per period. Best for tables and charts.
- `report_frequency`: `hourly`, `daily`, `weekly`, `monthly`, `yearly`.
- `report_timezone`: default `Asia/Manila`.
- Hourly is limited to a 31 day range.
- Weeks start on Monday.

Rules:

- **Empty periods are included.** Counts and energy are `0`. Averages are `NULL`. Charts show no missing days.
- **Offline snapshots are ignored** for averages, min, max, status counts and alerts. They hold stale values.
- **Energy totals use all snapshots.** The counters stay correct while offline.
- **Periods follow the timezone**, so a day means a Manila day.

Output columns:

| Group | Columns |
|---|---|
| Period | `period_start`, `period_end` |
| Quality | `sample_count`, `online_sample_count`, `uptime_percent` |
| Battery level | `battery_level_avg`, `battery_level_min`, `battery_level_max` |
| Voltage | `voltage_avg`, `voltage_min`, `voltage_max` |
| Watt-hours | `watt_hours_avg`, `watt_hours_min`, `watt_hours_max` |
| Battery health | `dod_unsafe_count` |
| Battery state | `battery_charging_samples`, `battery_discharging_samples`, `battery_idle_samples` |
| Solar | `solar_input_avg`, `solar_input_max`, `solar_voltage_avg`, `solar_voltage_max`, `solar_current_avg`, `solar_current_max`, `solar_active_seconds` |
| Load | `current_load_avg`, `current_load_max` |
| Temperature | `battery_temperature_*`, `solar_temperature_*`, `interior_temp_*` (avg, min, max), `temperature_alert_count` |
| Energy | `energy_input_wh`, `energy_output_wh`, `net_energy_wh` |

### 12.2 `get_analytics_summary(start_date, end_date)`

- Returns **one row** for the whole range.
- Best for KPI cards at the top of the page.
- Columns: `sample_count`, `online_sample_count`, `uptime_percent`, `first_sample_at`, `last_sample_at`, `energy_input_wh`, `energy_output_wh`, `net_energy_wh`, `battery_level_avg`, `battery_level_min`, `voltage_avg`, `solar_input_peak`, `solar_active_hours`, `current_load_avg`, `current_load_peak`, `dod_unsafe_count`, `temperature_alert_count`.

### 12.3 `get_appliance_usage_report(...)`

- Supporting report from `appliance_usage_history`.
- Uses the same frequencies and timezone.

---

## 13. Chart Guide

| Visual | Use these columns |
|---|---|
| Line chart: battery | `battery_level_avg`, `voltage_avg` |
| Line chart: power | `solar_input_avg`, `current_load_avg` |
| Line chart: temperature | `battery_temperature_avg`, `solar_temperature_avg`, `interior_temp_avg` |
| Grouped bar chart | `energy_input_wh` vs `energy_output_wh` |
| Bar or area chart | `net_energy_wh` |
| Bar chart: solar time | `solar_active_seconds` (divide by 3600 for hours) |
| Stacked bar or donut | `battery_charging_samples`, `battery_discharging_samples`, `battery_idle_samples` |
| Health chart | `dod_unsafe_count`, `temperature_alert_count` |
| Uptime gauge or line | `uptime_percent` |
| KPI cards | `get_analytics_summary()` |
| Table | Any columns from `get_analytics_report()` |

Tips:

- Use `hourly` for "Today", `daily` for "This week" or "This month", `monthly` for "This year", `yearly` for "All time".
- Treat `NULL` averages as gaps in a line chart. Do not draw them as zero.

---

## 14. Example Calls

SQL:

```sql
select * from public.get_analytics_report(
    '2026-09-01', '2026-10-01',
    'daily', 'Asia/Manila'
);

select * from public.get_analytics_summary(
    '2026-09-01', '2026-10-01'
);
```

Supabase client:

```js
const { data } = await supabase.rpc('get_analytics_report', {
  start_date: '2026-09-01T00:00:00+08:00',
  end_date: '2026-10-01T00:00:00+08:00',
  report_frequency: 'daily',
  report_timezone: 'Asia/Manila'
});
```

- Reports need a logged-in user, because they use `auth.uid()`.
- They return no rows in the SQL editor, since no user is logged in there.

---

## 15. Data Size and Cleanup

- 5 minute sampling = 288 rows per device per day.
- About 105,000 rows per device per year.
- `purge_old_monitoring_history(keep_days)` deletes old rows.
  - Default is 730 days (2 years).
  - Minimum is 30 days.
  - Not scheduled by default.

---

## 16. Removing All History Data

```sql
truncate table public.monitoring_history
restart identity;
```

- Deletes every row and resets `history_id` to 1.
- Keeps the table, columns, indexes, policies and functions.
- Cannot be undone.
- Use `delete from public.monitoring_history;` if you want to keep the `history_id` numbering.

---

## 17. Known Limits

- `time_remaining` is text, so it cannot be charted directly. Convert it to minutes in the app, or add a numeric column later.
- A snapshot is only as good as the ESP32 data. Offline periods have stale values.
- Rebuilding `monitoring` resets `monitor_id`. History stays correct by `user_id`.
- The prototype `anon` update policy on `monitoring` is open. Secure it before production.
- Solar active time only counts rows that have `interval_seconds` filled in.

---

## 18. Quick Summary

- `monitoring` = now. `monitoring_history` = the past.
- One row = one 5 minute snapshot.
- Energy is stored as deltas, so charts can simply add them up.
- Reports are timezone aware, fill empty periods and ignore offline data.
- Users can only read their own history.
