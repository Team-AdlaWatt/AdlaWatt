# AdlaWatt: Analytics Charts

Current implementation of the **Analytics & Trends** screen. The screen has four cards with independent Daily / Weekly / Monthly / Yearly views.

Related docs: `monitoring_history.md` (snapshot source), `activity_logging.md`, `notification_catalog.md`.

---

## Page structure

- The Solar Energy, Load Energy, and Battery Activity cards each own a full-width **Daily / Weekly / Monthly / Yearly** toggle. Changing one card does not change the others.
- Each view resets that card's rolling window through `createFrequencyRange`:
  - Daily = 30 days, bucketed by calendar day.
  - Weekly = 90 days, bucketed by Monday-start week.
  - Monthly = 1 year, bucketed by calendar month.
  - Yearly = 5 years, bucketed by calendar year.
- The Generate Report card keeps its own chip-style frequency control and From/To date pickers. Its range is independent of the three chart cards.
- The four cards, in order, are:
  1. **Solar Energy** — average solar input in watts per period, with energy collected, peak output, peak sun hours, and charge start.
  2. **Load Energy** — average load in watts per period, with energy used, peak load, and average voltage.
  3. **Battery Activity** — charging / discharging / idle donut with tap-to-inspect; the toggle changes that card's range.
  4. **Generate Report** — view chips, From/To pickers, CSV/PDF export, status, and saved-report sheet.
- Pull-to-refresh, the report quick-nav, and the `?focus=report` deep link remain available.

---

## Data mapping

| Card | Source columns | Aggregation |
|---|---|---|
| Solar Energy | `solar_input`, `energy_input_wh`, `solar_timer`, `battery_status` | Average finite Online `solar_input` in W for the plotted value; sum energy per bucket; max solar input; max solar timer; first charging transition |
| Load Energy | `current_load`, `energy_output_wh`, `voltage` | Average finite Online `current_load` in W for the plotted value; sum energy per bucket; max load; average voltage from Online rows |
| Battery Activity | `battery_status` | Count charging / discharging / idle samples in that card's range |
| Report | All four sections | Uses the report card's own frequency and filtered From/To rows |

Averages and activity counts ignore Offline snapshots. Energy totals include all snapshots in the loaded range.

The screen fetches one union window spanning the active card ranges and report range, then filters rows locally per card with `filterMonitoringHistoryByRange`. `ANALYTICS_MAX_ROWS` still caps the fetched history at 20,000 recent rows, so very long ranges show only the most recent retained rows.

---

## Card style

- All four cards use the same grouped-card shell: accent header panel with icon and title, bordered body, caption subtitle, and 18px vertical gap.
- The three chart cards use the shared `SlidingToggle` full-width control with 48px touch targets and reduced-motion support.
- Generate Report keeps the compact pill chips because it owns the report export controls.
- The three chart cards always render their chart children immediately. `AnalyticsChartCard` has no loading/empty text gate; each chart component owns its empty frame (flat zero line with grid/axis, or muted donut with legend) until data arrives.
- Line charts use watt/ watt-hour tick suffixes on the Y axis, a centered swatch legend, and 20px `tabular-nums` stats. The donut keeps its existing color-plus-label legend.

Reference implementations: `src/components/AnalyticsChartCard.tsx`, `src/components/AnalyticsCard.tsx`, `src/components/charts/AnalyticsMetricChart.tsx`, `src/components/charts/BatteryActivityChart.tsx`.

---

## Report model

`generateAdlaWattCsv` and `generateAdlaWattPdf` use one shared schema with the same four sections as the screen:

1. `SOLAR ENERGY`
2. `LOAD ENERGY`
3. `BATTERY ACTIVITY`
4. `GENERATE REPORT`

Battery Activity is included in exports. The canonical raw monitoring rows, KPIs, and aggregated periods remain in the report payload for detail and traceability but are not emitted as separate export blocks.
