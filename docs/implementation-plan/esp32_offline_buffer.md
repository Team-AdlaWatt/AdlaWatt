# ESP32 Offline Buffer — Firmware Handoff Spec

Hardware-teammate contract for surviving Wi-Fi outages on the
unit side. The mobile app cannot implement this (no firmware
sources live in this repo); the app side is already done
(`monitoringService` last-reading cache + 60s stale tripwire
+ offline banner). This document states what the firmware
must guarantee so both sides agree on offline semantics.

Related: `monitoring_history.md` (snapshot + heartbeat
semantics), `notification_catalog.md` (stale rules),
`zenova_battery.md` (sensor map).

---

## 1. Goal

No reading taken while the unit is offline may be silently
dropped. Gaps already have defined server semantics — this
spec keeps the gap data flowing once connectivity returns.

## 2. Buffer requirements (firmware)

- **Ring buffer in NVS/RTC memory** holding timestamped
  readings (same payload shape as the live POST, plus a
  `buffered: true` flag and the original `recorded_at`).
- **Capacity:** minimum 24 hours of normal-cadence readings.
  On overflow, drop oldest first (energy totals stay
  recoverable; per-minute shape degrades gracefully).
- **Flush on reconnect:** oldest-first, paced (e.g. one batch
  per 2 seconds) so the reconnect burst does not brown out
  the radio or hammer PostgREST rate limits. Mark the batch
  complete only on HTTP 2xx per batch.
- **Heartbeat preserved:** the liveness heartbeat keeps its
  own cadence independent of the data backlog — a unit
  flushing backlog must still look alive, not stale.

## 3. Retry policy (firmware)

- Exponential backoff with jitter on POST failure
  (e.g. 5s → 10s → 20s → 40s → cap 5 min), reset on success.
- Distinguish **no route** (radio down — buffer, don't burn
  battery retrying every second) from **HTTP 4xx**
  (payload rejected — log locally, do NOT retry the same
  bytes forever; keep the buffer moving).
- Never block sensor sampling on network: sampling and
  upload run on independent cadences.

## 4. Server contract (already true — do not break)

- The heartbeat cron marks stale devices Offline and owns
  the `device_status` flip; firmware must not write
  `device_status` itself to paper over outages.
- `monitoring_history` ignores offline snapshots for
  averages/min/max/status counts and alerts, but counts
  them for energy totals — backfilled rows must carry true
  `recorded_at` values so they land in the right buckets.
- The app's client stale gate is 60s on `last_seen`
  (`STALE_MONITORING_INTERVAL_MS`); the unit should post
  at least every ~10s while online so jitter never trips it.

## 5. Acceptance

1. Kill unit Wi-Fi for 1 hour → readings continue locally.
2. Restore Wi-Fi → backlog flushes oldest-first, no drops,
   no duplicate `recorded_at` rows per user.
3. During the outage the app shows cached readings with the
   offline banner; on flush, charts fill the gap and no
   duplicate alert storm fires (transition gating +
   cooldowns already cover the replay).
4. 24-hour outage fits the buffer without overflow loss on
   the reference hardware.
