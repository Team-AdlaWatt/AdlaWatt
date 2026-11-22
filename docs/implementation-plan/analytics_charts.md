# AdlaWatt: Analytics Charts

Current implementation of the **Analytics & Trends** screen. The screen is intentionally reduced to four cards that share one Daily / Weekly / Monthly / Yearly view.

Related docs: `monitoring_history.md` (snapshot source), `activity_logging.md`, `notification_catalog.md`.

---

## Page structure

- One shared **Daily / Weekly / Monthly / Yearly** control drives the three chart cards and the report export.
- Changing the view resets the rolling window through `createFrequencyRange`: Daily = 1 day, Weekly = 7 days, Monthly = 30 days, Yearly = 365 days.
- The Generate Report card also has From/To date pickers, so a user can override the rolling window after choosing a view.
- Daily buckets are hourly. Weekly and Monthly buckets are calendar days. Yearly buckets are calendar months.
- The four cards, in order, are:
  1. **Solar Energy** — energy collected (Wh), peak output, peak sun hours, and charge start.
  2. **Load Energy** — energy used (Wh), average load, and peak load.
  3. **Battery Activity** — charging / discharging / idle donut with tap-to-inspect; no frequency toggle.
  4. **Generate Report** — view chips, From/To pickers, CSV/PDF export, status, and saved-report sheet.
- Pull-to-refresh, the report quick-nav, and the `?focus=report` deep link remain available.

---

## Data mapping

| Card | Source columns | Aggregation |
|---|---|---|
| Solar Energy | `energy_input_wh`, `solar_input`, `solar_timer`, `battery_status` | Sum energy per bucket; max solar input; max solar timer; first charging transition |
| Load Energy | `energy_output_wh`, `current_load` | Sum energy per bucket; average and max current load from Online rows |
| Battery Activity | `battery_status` | Count charging / discharging / idle samples across the selected range |
| Report metadata | `frequency`, `range` | Frequency and the selected From/To dates shown in the export |

Averages and activity counts ignore Offline snapshots. Energy totals include all snapshots in the loaded range.

---

## Card style

- All four cards use the same grouped-card shell: accent header panel with icon and title, bordered body, caption subtitle, and 18px vertical gap.
- The three chart cards always render their chart children immediately. `AnalyticsChartCard` has no loading/empty text gate; each chart component owns its empty frame (flat zero line with grid/axis, or muted donut with legend) until data arrives.
- The Generate Report card uses the same shell with `document-text-outline` and keeps the old export controls.

Reference implementations: `src/components/AnalyticsChartCard.tsx`, `src/components/AnalyticsCard.tsx`, `src/components/charts/AnalyticsMetricChart.tsx`, `src/components/charts/BatteryActivityChart.tsx`.

---

## Report model

`generateAdlaWattCsv` and `generateAdlaWattPdf` use one shared schema with the same four sections as the screen:

1. `SOLAR ENERGY`
2. `LOAD ENERGY`
3. `BATTERY ACTIVITY`
4. `GENERATE REPORT`

Battery Activity is now included in exports. The canonical raw monitoring rows, KPIs, and aggregated periods remain in the report payload for detail and traceability but are not emitted as separate export blocks.
