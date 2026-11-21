# AdlaWatt: Analytics Charts

Current implementation of the **Analytics & Trends** screen. The screen is intentionally reduced to four cards that share one range control.

Related docs: `monitoring_history.md` (snapshot source), `activity_logging.md`, `notification_catalog.md`.

---

## Page structure

- One shared `Daily / Weekly / Monthly / Yearly` toggle drives every card and the report export.
- The toggle also selects the rolling data window: Daily = 1 day, Weekly = 7 days, Monthly = 30 days, Yearly = 365 days.
- Daily buckets are hourly and labeled by hour. Weekly and Monthly buckets are calendar days. Yearly buckets are calendar months so the horizontal axis stays readable.
- The four cards, in order, are:
  1. **Solar Energy** — energy collected (Wh) on the vertical axis; peak output, peak sun hours, and charge start in the stats row.
  2. **Load Energy** — energy used (Wh) on the vertical axis; average load and peak load in the stats row.
  3. **Battery Activity** — charging / discharging / idle donut with tap-to-inspect; UI only and not exported.
  4. **Generate Report** — CSV and PDF export of the Solar, Load, and Battery sections for the selected range.
- Pull-to-refresh, the report quick-nav, `?focus=report` deep link, export status, and saved-report sheet remain available.

---

## Data mapping

| Card | Source columns | Aggregation |
|---|---|---|
| Solar Energy | `energy_input_wh`, `solar_input`, `solar_timer`, `battery_status` | Sum energy per bucket; max solar input; max solar timer; first charging transition |
| Load Energy | `energy_output_wh`, `current_load` | Sum energy per bucket; average and max current load from Online rows |
| Battery Activity | `battery_status` | Count charging / discharging / idle samples across the selected range |
| Report sections | same as Solar, Load, and Battery cards | Built from `buildAnalyticsCardData` so exports match the screen |

Averages and activity counts ignore Offline snapshots. Energy totals include all snapshots in the loaded range.

---

## Chart standard

Reference implementations: `src/components/charts/AnalyticsMetricChart.tsx` (line chart), `src/components/charts/BatteryActivityChart.tsx` (donut), `src/components/AnalyticsChartCard.tsx` (card shell).

- All chart cards use `AnalyticsChartCard`.
- `AnalyticsMetricChart` owns the stats row, fixed Y rail, internal horizontal scroll, and `scrollToEnd`.
- Theme colors come from `useChartColors()` and `useAppColors()`.
- Colors are never the only signal: stats and labels carry the values shown by the chart.
- Empty ranges render an explicit message instead of a blank chart.

---

## Report model

`generateAdlaWattCsv` and `generateAdlaWattPdf` use one shared schema with exactly three sections:

1. `SOLAR — ENERGY COLLECTED`
2. `LOAD — ENERGY USED`
3. `BATTERY — VOLTAGE`

Battery Activity is deliberately excluded from exports. The canonical raw monitoring rows, KPIs, and aggregated periods remain in the export payload for detail and traceability.
