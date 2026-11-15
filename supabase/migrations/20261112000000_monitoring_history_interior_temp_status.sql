-- ============================================================
-- MONITORING HISTORY interior_temp_status
-- ============================================================
--
-- The schema and the app already use interior_temp_status for the
-- interior temperature alert, but no migration had added the
-- column to monitoring_history. Add it idempotently so existing
-- deployments match the documented schema.
--
-- Existing rows stay NULL. Analytics treats NULL as "Nominal" so
-- old history does not raise false temperature alerts.
--
-- Safe to run again.
-- ============================================================

begin;

alter table public.monitoring_history
  add column if not exists interior_temp_status text null;

commit;
