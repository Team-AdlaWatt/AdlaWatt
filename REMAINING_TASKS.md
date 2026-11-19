# Remaining Tasks

## Battery temperature removal

### Completed
- [x] Remove battery-temperature copy from `src/app/dashboard/user-manual.tsx`.
- [x] `docs/implementation-plan/notification_catalog.md`: remove battery-temperature rules from summaries and Weather / Temperature Rules.
- [x] `docs/implementation-plan/monitoring_history.md`: remove battery-temperature columns, status rule, analytics entries, and chart guide entry.
- [x] `markdown/manuscript-vs-app-comparison.md`: mark DS18B20 and temperature readings as solar/interior only.
- [x] Align `docs/USER-MANUAL.md`, `docs/implementation-plan/analytics_charts.md`, `README.md`, and `site/index.html`.
- [x] `npm test -- --runInBand` — 845 passed.
- [x] `npm run typecheck` — passed.
- [x] `npm run lint` — 0 errors, 3 unrelated warnings.
- [x] No active snapshot function, trigger, firmware writer, or RPC references the dropped columns; only historical migrations and the drop migration mention them.

### Blocked
- [ ] Apply `supabase/migrations/20261119055317_drop_battery_temperature.sql` — skipped by request; needs Supabase authentication.
- [ ] Re-run `npm run verify:monitoring` after applying; current live schema still has `DS18B20 1 Battery Temp` and `DS18B20 1 Battery Temp Status`.

### Release
- Do not commit, push, or publish an OTA update unless explicitly requested.
