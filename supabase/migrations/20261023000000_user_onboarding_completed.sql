-- First-run onboarding flag.
--
-- New signups inherit false and are routed to /onboarding until
-- they skip or proceed. Legacy accounts are backfilled to true
-- so they never re-see the panel after this feature ships.
--
-- Existing own-profile SELECT/UPDATE RLS already covers this
-- column; completeOnboarding() updates the caller's own row.
--
-- The fixed cutoff keeps the backfill idempotent if this file is
-- ever re-run, so later signups continue to start at false.

alter table public.users
add column if not exists onboarding_completed boolean not null default false;

update public.users
set onboarding_completed = true
where onboarding_completed = false
  and created_at < timestamptz '2026-10-23 00:00:00+00';
