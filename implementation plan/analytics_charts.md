# AdlaWatt: Analytics Charts

Chart specs for the **Analytics & Trends** screen. Everything below comes from `get_analytics_report`, `get_analytics_summary` and `get_appliance_usage_report`. I used only line, bar and pie charts.

Related docs: `monitoring_history.md` (snapshot source), `activity_logging.md`, `notification_catalog.md`.

---

## Page structure

- **Date range picker:** Today uses `hourly`, 7 days and 30 days use `daily`, and 12 months uses `monthly`.
- **KPI cards on top:** these are numbers, not charts, and come from `get_analytics_summary`. They show net energy, energy in and out, lowest battery, uptime, solar hours, peak load, unsafe discharge count and temperature alerts.
- **Tabs below:** Battery, Solar, Energy, Usage and Health, with 3 to 4 charts each.

---

## Battery

| Chart | Type | Data | What it tells you |
|---|---|---|---|
| Battery level band (improved) | Line | `battery_level_avg`, `_min`, `_max`, `dod_unsafe_count` | How low it dips. Show the average as a bold line, min and max as faint lines, a dashed low-battery line, and red dots where unsafe events happened. |
| Battery voltage | Line | `voltage_avg`, `_min`, `_max` | Battery health and voltage drop under load |
| Battery activity | Pie | charging, discharging and idle sample counts | How often it charges vs drains |
| Unsafe discharge events | Bar | `dod_unsafe_count` | Which days stressed the battery |

> **Implementation status (Oct 2026):** the Battery Level card (`AnalyticsChartCard` + `charts/BatteryLevelChart.tsx`) currently renders average-only values (`battery_level_avg`) as a curved green area on a fixed 0–100% scale, with a Latest/Average/Lowest stats row, dashed 20% floor line, centered legend, and fixed Y labels while the plot scrolls. The full improved band (avg bold + min/max faint lines + red unsafe dots) is still follow-up work.

## Solar

| Chart | Type | Data | What it tells you |
|---|---|---|---|
| Solar vs load | Line, 2 lines | `solar_input_avg`, `current_load_avg` | Whether the sun covers demand |
| Best sun days | Bar | `solar_input_max` | Peak panel output per day |
| Sun hours | Bar | `solar_active_seconds` divided by 3600 | How long the panel produced |
| Solar curve by hour | Line | hourly `solar_input_avg`, averaged by hour of day | Best time of day for the sun |

## Energy

| Chart | Type | Data | What it tells you |
|---|---|---|---|
| Energy in and out | Grouped bar | `energy_input_wh`, `energy_output_wh` | Daily balance |
| Net energy | Bar (green or red) | `net_energy_wh` | Surplus and deficit days |
| Running balance | Line | running total of `net_energy_wh` (app calculates) | Whether stored energy is growing or shrinking |
| Solar coverage | Line | `energy_input_wh` / `energy_output_wh` x 100 (app calculates) | Percent of your use the sun covered |

## Usage

| Chart | Type | Data | What it tells you |
|---|---|---|---|
| Average vs peak load | Line, 2 lines | `current_load_avg`, `current_load_max` | Typical and worst-case demand |
| Power use by hour | Bar | hourly `energy_output_wh`, averaged by hour of day | When to avoid high-draw electronics |
| Energy by electronics item | Pie | `total_energy_wh` (top 5 plus "Other") | What uses the most power |
| Electronics run time | Horizontal bar | `total_duration_seconds` | What runs the longest |

## Health

| Chart | Type | Data | What it tells you |
|---|---|---|---|
| Temperatures | Line, 3 lines | battery, solar and interior `_avg` | Heat trends |
| Temperature alerts | Bar | `temperature_alert_count` | Days with high or critical heat |
| Device uptime | Line | `uptime_percent` | How reliable the ESP32 link is |
| Online vs offline | Pie | `online_sample_count` vs the rest | Share of time connected |

---

## Trends the app can calculate (no SQL change needed)

- **Change vs last period:** call the report twice and show "+12% energy in".
- **Moving average:** a 7-period smoothed line over noisy data.
- **Best and worst day:** pick the highest and lowest `net_energy_wh` and show them as highlight text.
- **Peak hour:** group hourly rows by hour of day (the "by hour" charts above).

---

## Things to know

- Periods with no data return `NULL` averages. Skip them in line charts. Bars with zero energy are fine.
- Averages count only Online snapshots. Energy totals count all snapshots.
- `solar_status` (Low, Moderate, High) and `time_remaining` are not in the report. A "solar condition" pie would need a small SQL addition.
- Electronics charts stay empty until the app calls `record_appliance_usage`.
- Also, `appliance_usage_history.app_id` is `bigint` but your new electronics rows use `uuid`. Store `catalog_key` in the usage table before building these charts.
- Keep pies to 3 to 5 slices.

---

## Build order

1. The improved battery level band.
2. Energy in and out.
3. Solar vs load.
4. Battery activity pie.
5. Net energy.
6. The rest.

---

## Chart standard (locked Oct 2026 — copy for every new chart card)

Reference implementations: `src/components/charts/BatteryLevelChart.tsx`
(axis chart), `src/components/charts/BatteryActivityChart.tsx` (donut),
`src/components/charts/UnsafeDischargeChart.tsx` (bar).

### Card shell (`AnalyticsChartCard`)

- Green 3px border, body `padding: 16`, header panel with family icon
  (battery charts share `battery-half-outline`), subtitle, optional
  frequency toggle, centered text + swatch legend, stats row on top,
  always-render empty state.

### Axis charts (line / bar)

- `Y_AXIS_W = 38`, `chartW = boxW - Y_AXIS_W - 2`,
  `chartWrap marginLeft: -10` (labels sit ~9px from the card border;
  labels + grid shift together).
- `yAxisThickness={0}`, 12px axis labels, fixed Y rails, internal
  scroll + `scrollToEnd`. Theme colors via `useChartColors()`,
  fills softened in dark mode.

### Principle — no redundant data

- Every value appears as text in exactly one place per card
  (stats `%`, center counts, breakdown numbers; bars encode share).

### Donut interaction pattern

- Tap-to-reveal in the center, 5s auto-revert that also closes focus,
  fixed-slot hint (opacity, always mounted so the legend never jumps),
  `focusedPieIndex` driven live on a stable key (never remount per tap),
  readable themed center disc.

---

## Next step

Do you want me to write the code for the full analytics screen with the tabs, starting with these five charts?
