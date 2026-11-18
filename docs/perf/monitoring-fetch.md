# Monitoring Fetch — Performance Measurement

Measurement of how quickly the app fetches a row from `public.monitoring`,
run while auditing the `getMonitoringData()` path.

- **Date:** 16 November 2026
- **Project:** `nxdabgvbwunyeffzrzta` (`https://nxdabgvbwunyeffzrzta.supabase.co`)
- **Client:** Windows 11, Node v24.14.0 (win32 x64)
- **Target:** warm combined p95 **< 300 ms**

## Verdict

**FAIL — the cold/forced path is roughly 2× over target.** Two sequential
PostgREST round-trips dominate every uncached fetch, and even a "cached" fetch
still pays one round-trip because the `monitor_id` lookup runs before the cache
is checked.

## Results

Warm, authenticated-style PostgREST, 3 warm-up + N measured iterations. Both
runs hit the same project from the same machine; run-to-run spread is network
variance.

### Run 1 (N = 25)

| Leg | min | mean | p50 | p95 | max |
|---|---:|---:|---:|---:|---:|
| `users.monitor_id` | 132.3 | 192.3 | 166.7 | 340.0 | 489.8 |
| `monitoring` row | 120.7 | 186.4 | 165.5 | 269.0 | 374.0 |
| **combined cold path** | 278.6 | 378.6 | 354.4 | **582.4** | 699.9 |

### Run 2 (N = 40)

| Leg | min | mean | p50 | p95 | max |
|---|---:|---:|---:|---:|---:|
| `users.monitor_id` | 120.4 | 176.7 | 169.0 | 236.7 | 282.3 |
| `monitoring` row | 127.7 | 212.2 | 189.0 | 361.0 | 398.9 |
| **combined cold path** | 279.9 | 388.9 | 375.8 | **498.7** | 601.5 |

(All values in milliseconds.)

Takeaway: each round-trip is ~170–190 ms p50 on this network. Because the app
issues them **sequentially**, the cold path is their sum (~355–375 ms p50,
~500–580 ms p95).

## Where the time goes

`getMonitoringData()` (`src/services/monitoringService.ts`) does:

1. `getAuthenticatedUserSafe()` — local session (fast).
2. `getMonitorIdForUser()` (`src/services/monitoringService.ts:187`) —
   **`users` query (round-trip #1)**, and a **second** `monitoring` query if the
   profile lacks `monitor_id`.
3. Memory cache check — **after** step 2, so a cache hit still pays round-trip
   #1.
4. `fetchMonitoringRow()` (`src/services/monitoringService.ts`) —
   **`monitoring` query by `monitor_id` (round-trip #2)**.

Request coalescing (`requestManager.execute`) wraps only step 4, not the
`monitor_id` lookup.

The dashboard does not poll monitoring; it relies on the initial fetch, Realtime,
and pull-to-refresh. So the numbers above are the worst case (cold start / force
refresh), and the single `users` round-trip is the cost of every repeat read.

## Recommendations (priority order)

1. **Cache `monitorId` per session** (in memory, keyed by user) so the `users`
   query happens once, not on every call.
2. **Check the memory cache before resolving `monitorId`.** The cache is keyed
   by user, so repeat reads become ~0 ms instead of ~170 ms.
3. **Move the `monitor_id` lookup inside the coalesced request** so concurrent
   mount + refresh calls share one lookup.
4. Optionally **collapse the two lookups into one** (embedded select or an RPC
   such as `get_my_monitoring()`), turning the cold path into a single
   round-trip (~190 ms p50 here, likely under the 300 ms p95 target).
5. Optional: a lightweight foreground poll (15–30 s) only while Realtime is
   disconnected, so staleness does not depend solely on the websocket.

After #1–#4, the expected cold path is one round-trip. Re-run this benchmark to
confirm p95 < 300 ms before and after.

## Caveats and blockers

- **Benchmark ran in anon mode.** The supplied test login
  (`francis.idul78@gmail.com`) returned `invalid_credentials`, so the script
  fell back to the publishable key (`PERF_ALLOW_ANON=1`). The lookups are still
  single-row primary-key reads, so the timing is representative; a full run with
  valid credentials should be repeated to include the authenticated RLS check.
- **RLS concern (separate from performance).** The publishable key can read
  `monitoring` rows **without signing in**, which contradicts the
  `to authenticated` policy in
  `supabase/migrations/20261113000400_monitoring_rls_user_id_direct.sql`. The
  live database likely has RLS disabled or a permissive leftover policy. Verify
  with `select * from pg_policies where tablename = 'monitoring'` and confirm
  `relrowsecurity` on `public.monitoring` before shipping.
- **`EXPLAIN ANALYZE` not run.** The Supabase CLI is linked but has no access
  token and Docker/`psql` is unavailable, so query plans could not be captured.
  Indexes are present in the migrations (`monitoring_pkey`,
  `monitoring_user_id_key`, `users_monitor_id_key`); confirm plans once DB access
  is available.
- **Desktop network only.** Mobile-data latency was not measured; expect the
  same shape with higher numbers.

## Reproduce

```bash
# Authenticated (preferred)
PERF_TEST_EMAIL=... PERF_TEST_PASSWORD=... PERF_ITERATIONS=40 \
  npm run bench:monitoring

# Anonymous fallback (when auth is unavailable)
PERF_ALLOW_ANON=1 PERF_ITERATIONS=40 npm run bench:monitoring
```

The app-side timings are emitted as `[perf][monitoring]` logs when
`EXPO_PUBLIC_PERF_LOG=1` (or in dev builds). Run the app once on Wi-Fi and once
on mobile data and collect those lines for the real end-to-end path.
