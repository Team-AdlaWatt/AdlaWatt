# Remaining Tasks

## Battery temperature removal

### Documentation cleanup
- `docs/implementation-plan/notification_catalog.md`
  - Remove battery temperature rules from the normal/alert summaries.
  - Remove the Battery Temperature rows from the Weather / Temperature Rules table.
- `docs/implementation-plan/monitoring_history.md`
  - Remove `battery_temperature` and `battery_temperature_status` from the temperature column table.
  - Remove the battery temperature status rule.
  - Remove `battery_temperature_*` from analytics and chart guide entries.
- `markdown/manuscript-vs-app-comparison.md`
  - Update DS18B20 and temperature-reading rows to reflect that battery temperature is no longer tracked.

### Verification
- Run `npm test -- --runInBand`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Apply `supabase/migrations/20261119055317_drop_battery_temperature.sql`.
- Run `npm run verify:monitoring` and confirm the 25-column contract matches the live table.
- Confirm no snapshot function, trigger, firmware writer, or RPC still references the dropped battery temperature columns.

### Release
- Do not commit, push, or publish an OTA update unless explicitly requested.
