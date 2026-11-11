# AdlaWatt: Manuscript vs. App Comparison

A claim-by-claim comparison of the capstone manuscript against the current
AdlaWatt codebase.

| | |
|---|---|
| **Manuscript** | `AdlaWatt-Manuscript.docx` — "AdlaWatt: An IoT-Based Off-Grid Solar Backup Power System with Real-Time Energy Monitoring and Appliance Recommendation" (Capstone Project, Northern Bukidnon State College, July 2025) |
| **App** | This repository, `development` branch @ `9f87e11` (Expo 57 / React Native 0.86 / TypeScript / Supabase) |
| **Compared on** | November 10, 2026 |
| **Direction of truth** | The **manuscript is authoritative for hardware values** (Wh, W, ratings); the **app is authoritative for features**. The system has **no admin role** and is **Android-only**. |
| **Rulings added** | November 10, 2026 (see next section) |

---

## Legend

| Status | Meaning |
|---|---|
| **Match** | Manuscript claim is implemented in the app as described |
| **Partial** | Implemented, but with meaningful differences or incomplete |
| **Mismatch** | Implemented differently than the manuscript states |
| **Not in app** | Manuscript describes it; the app does not have it |
| **Extra** | In the app, beyond what the manuscript describes |
| **N/A** | Outside app scope (physical hardware, research instruments, process docs) |

---

## Reconciliation Rulings (November 10, 2026)

The team ruled on every discrepancy below. Statuses in Sections 1–12 still
describe the **current state of the code** (branch `9f87e11`, before the
rulings are applied); each ruled row carries a "Ruled" note recording the
agreed direction. Once the corresponding changes land, the ruled mismatches
become matches.

| Topic | Ruling | Fix lands in |
|---|---|---|
| Battery energy basis | Manuscript-literal: **12 V × 60 Ah = 720 Wh total**, 20% reserve (**144 Wh**), **576 Wh usable**. The manuscript states only "12 V, 60 Ah" and no usable figure, so the app adopts the manuscript-literal basis. (The 640.8 Wh figure previously attributed to the paper does not appear anywhere in the docx.) | App: `src/constants/battery.ts` and dependents |
| Appliance wattage limit | Manuscript's **600 W** is authoritative: hard cap **600 W** for a single appliance and combined load stack, warning tier at **480 W**. | App: `src/services/recommendation.ts`, `notificationService.ts`, `customElectronicsValidation.ts` |
| Inverter rating | **1500 W** (Table 1 + Figures 3/5/7) is the real rating; the "Inverter 1000" phrase in the 3.3 design text is a manuscript typo. | Manuscript: 3.3 design text corrected |
| Admin | **No admin.** The app removes all admin code, routes, guards, and login-screen references (Supabase `users.role` column and role migrations stay untouched). The manuscript removes the Admin actor, Admin Dashboard definition, and web-dashboard scope sentences. | App: delete `src/app/admin/`, `src/admin/`; Manuscript: Definition of Terms, 1.4, 3.2, Figure 4, 3.4 |
| Platform | **Android-only** confirmed (already the manuscript's stated limitation). App drops the iOS config; manuscript wording "cross-platform mobile application" is corrected to Android. | App: `app.json`, `package.json`; Manuscript: 1.4 scope |
| Humidity | DHT22 humidity is **documented as a limitation** — not surfaced in the app and no firmware exists yet to feed it. No code change now. | Manuscript: limitation note |
| Voltage thresholds | Manuscript is silent on cell voltages; the app keeps its engineering values (10.6 V unsafe / 10.75 V caution / 10.85 V recovery; 11.6–14.6 V window). | No change |
| Feature scope | The **app's feature set is authoritative**; the manuscript gains the app's features (auth, offline, 3 languages, weather/solar forecast, exports, email/vibration/reminders, catalog, onboarding, in-app manual, component status, OTA) via a Word edit checklist. | Manuscript: `markdown/manuscript-updates.md` (planned deliverable) |

---

## Executive Summary

**Direction of truth.** The manuscript is the source of truth for the
hardware side (Wh, W, ratings); the app is the source of truth for features.
There is no admin, and the system is Android-only. Every discrepancy below
has a ruling recorded in the Reconciliation Rulings section.

Across 69 claim rows in Sections 1–12: **40 Match · 7 Partial · 2 Mismatch ·
4 Not in app · 11 N/A · 5 Extra**, plus 18 app additions catalogued in
Section 13.

> **Status note.** These counts describe the code as it stands at `9f87e11`,
> before the November 10 rulings are applied. Once the ruled changes land
> (Parts A–D of the reconciliation plan), the 2 Mismatch rows become matches,
> the admin rows disappear, and the tallies will be refreshed again.

**What matches well.** The app implements essentially every mobile-app
function the manuscript describes: the full real-time monitoring field list,
the appliance recommendation feature with the manuscript's exact
"OK to use" / "Not advisable" labels, user-input appliances, notifications,
activity logs (kept separate from notifications), historical data with
reports over date ranges, weather information, and Android-only delivery.
All Household User use-cases are covered.

**What did not match, and how it was ruled:**

1. **Appliance wattage limit** — manuscript limits compatible appliances to
   **600 W**; the app's engine warns at **800 W** and hard-caps at **1000 W**
   (`src/services/recommendation.ts:152,231`).
   *Ruled:* app moves to a 600 W hard cap with a 480 W warning.
2. **Battery usable energy** — the code used **604.8 Wh** usable on a 756 Wh
   basis (`src/constants/battery.ts`). Note: the "640.8 Wh usable" figure
   previously attributed to the paper (via `SYSTEM-STATUS.md`) **does not
   appear anywhere in the docx** — the manuscript only specifies a 12 V,
   60 Ah bank. *Ruled:* app adopts the manuscript-literal basis of
   720 Wh total / 144 Wh reserve (20%) / 576 Wh usable.
3. **Admin dashboard** — the manuscript describes a *web-based* platform for
   researchers; the app has an *in-app* role-gated shell with login/logout
   only. *Ruled:* there is no admin — the app removes admin code entirely
   (DB untouched) and the manuscript drops the Admin actor and dashboard.
4. **Software stack wording** — manuscript Table 2 says "C++, JavaScript,
   CSS, React.js (JSX)"; the app is TypeScript + React Native. *Ruled:* the
   manuscript's software table is updated to the real stack via the Word
   edit checklist.
5. **ESP32 telemetry** — the app side of the pipeline (Supabase `monitoring`
   row, realtime subscription, history cron) is ready, but no firmware
   exists in the repo. *Ruled:* remains a documented in-progress item (see
   `SYSTEM-STATUS.md`), not a value conflict.
6. **Humidity** — the manuscript's sensor list (DHT22, Figure 3) includes
   enclosure humidity; the monitoring data model has no humidity field.
   *Ruled:* documented as a limitation; no code change now.

---

## 1. Objectives & Scope

| Manuscript claim | In the app | Status |
|---|---|---|
| Specific Objective 1: transportable off-grid solar energy harvesting system (panel, 12 V battery, built-in AC outlet, lockable enclosure) | App is the monitoring/recommendation half; the physical unit is outside this repo | N/A — hardware |
| Specific Objective 2: mobile app for battery status, solar energy, power consumption, temperature, device status, appliance recommendations, notifications, activity logs, historical data | All implemented: monitoring dashboard, recommendation engine, notifications, activity logs, analytics | Match |
| Specific Objective 3: evaluate usability via System Usability Scale (SUS) | Research instrument; no SUS feature in the app (not expected of the product) | N/A — evaluation instrument |
| Compatible appliances max **600 W** (Scope 1.4) | Recommendation engine warns at 800 W, hard-caps at 1000 W (`MAX_SAFE_LOAD_W`, `warnLoadW`) | Mismatch — *Ruled:* manuscript wins; app moves to 600 W hard cap / 480 W warning |
| Excludes high-power appliances (air-conditioners, washing machines, electric stoves) | Engine blocks any electronics over the cap; catalog contains only low-power household items | Match |
| Android only; iOS not included (Limitations) | Expo/RN codebase is cross-platform-capable, but only an Android build is produced | Match |
| Prototype cost approx. PHP 14,500 | Not applicable to the app | N/A |

Section tally: 3 Match · 1 Mismatch · 3 N/A

---

## 2. Hardware Specifications (Manuscript Table 1)

| Manuscript component | App counterpart | Status |
|---|---|---|
| Jinko 100 W monocrystalline solar panel | Solar telemetry fields (`solar_input`, `solar_voltage`, `solar_current`, `solar_status`) | N/A — hardware (its data is surfaced) |
| SPD PVSPD1-40 surge protective device | None | N/A |
| Breaker FXBZ-63 (20–30 A DC) | None | N/A |
| W88-C PWM charge controller, 30 A | Charging state implied via `battery_status` (Charging / Discharging / Idle) | N/A — hardware |
| Zenova 12 V 30 Ah x2 parallel = 60 Ah bank | `BATTERY_CAPACITY_WH = 756` (12.6 V x 60 Ah), reserve 151.2 Wh (20%), usable 604.8 Wh (80%) — `src/constants/battery.ts` | Partial — *Ruled:* manuscript wins; app adopts 720 Wh total / 144 Wh reserve / 576 Wh usable (manuscript states only 12 V 60 Ah; no usable figure exists in the docx) |
| Inverter, 1500 W, 12 V DC to 220 V AC | Load model: 800 W warning / 1000 W hard cap (`src/services/recommendation.ts`) | Partial — *Ruled:* 1500 W is the true rating; the "Inverter 1000" phrase in the manuscript's 3.3 text is a typo to fix in Word; app load caps become 600 W / 480 W per the appliance ruling |
| Built-in AC outlet, 220 V, 600 W appliance limit | Engine caps loads at 1000 W (800 W warning) | Mismatch — *Ruled:* manuscript wins; app moves to 600 W hard cap / 480 W warning |
| ESP32-S3 (44-pin), Wi-Fi + BT | `monitoring` row designed to be ESP32-written; realtime subscription on the app side; **no firmware sources in this repo** | Partial — app side ready, device feed not wired end-to-end |
| INA219 — battery voltage/current | `voltage`, `watt_hours`, `battery_level` | Match |
| INA228 x2 — solar-side and load-side V/I/power | `solar_input`, `solar_voltage`, `solar_current`, `current_load`, `total_energy` | Match |
| DS18B20 x2 — battery & solar panel temperature | `battery_temperature`, `solar_temperature` (+ status each) | Match |
| DHT22 — interior temperature **and humidity** | `interior_temp` only; **no humidity field** in the monitoring model (humidity appears only in weather data) | Partial — *Ruled:* documented as a limitation (no code change now; no firmware yet to feed it) |
| Relay module 5 V (1 channel) | Component status card (`src/app/dashboard/components.tsx`) | Match |
| 5 V DC fans x2 | Component status card | Match |
| HW-688 buck converter (to 5 V) | None | N/A |
| Double-sided perfboard PCB, 22 AWG wires | None | N/A |
| SPI TFT touchscreen (local display) | Component status card ("SPI TFT Display") | Match |

Section tally: 6 Match · 4 Partial · 1 Mismatch · 6 N/A

---

## 3. Software & Tooling (Manuscript Table 2)

| Manuscript item | Actual stack | Status |
|---|---|---|
| Arduino IDE 2.x (firmware) | No ESP32 firmware sources exist in this repo | Not in app (external to repo) |
| Visual Studio Code | Dev tooling choice | N/A |
| C++, JavaScript, CSS, React.js (JSX) | TypeScript, React Native (TSX), StyleSheet-based styling; React 19 underneath; no C++ or CSS in the app | Partial — *Ruled:* app's stack is authoritative; manuscript Table 2 is corrected to React Native + TypeScript (C++ stays for ESP32 firmware; CSS drops) via the Word edit checklist |
| Supabase | Auth (incl. Google PKCE), Postgres, Realtime, Storage, Edge Function — `src/lib/supabase.ts`, `supabase/` | Match |
| Expo EAS | EAS build config + Expo Updates OTA — `eas.json`, `app.json` | Match |
| GitHub | Repo hosted on GitHub; static site deployed via GitHub Pages (`site/`) | Match |
| Canva | Design assets only | N/A |

Section tally: 3 Match · 1 Partial · 1 Not in app · 2 N/A

---

## 4. Real-Time Monitoring

Manuscript "Real-Time Monitoring" definition (plus 1.1 and 3.4 sensor
descriptions) vs `MonitoringData` in `src/services/monitoringService.ts:49-114`.

| Manuscript field | App field(s) | Status |
|---|---|---|
| Battery status | `battery_status` (Charging / Discharging / Idle) | Match |
| Battery voltage | `voltage` | Match |
| Battery energy | `watt_hours` | Match |
| Current load | `current_load` | Match |
| Solar input | `solar_input` | Match |
| Solar voltage | `solar_voltage` | Match |
| Solar current | `solar_current` | Match |
| Temperature readings | `battery_temperature`, `solar_temperature`, `interior_temp` (+ status each) | Match |
| Depth of discharge | `dod_status` (Safe / Unsafe) | Match |
| Device status | `device_status` (Online / Offline) | Match |
| Energy generation (solar) | `solar_input`, `total_energy` | Match |
| Energy consumption (load) | `current_load` | Match |
| Real-time updates via cloud | Supabase Realtime `postgres_changes` subscription filtered by `user_id`, with capped-backoff resubscribe | Match |
| Enclosure humidity (DHT22, Figure 3 sensors) | Not in the monitoring data model | Not in app — *Ruled:* documented as a limitation (no code change now) |
| — | `time_remaining`, `solar_timer`, `solar_status`, per-temperature status bands, offline cache + 60 s stale-reading tripwire + connectivity banner | Extra |

Section tally: 12 Match · 1 Not in app · 1 Extra

---

## 5. Appliance Recommendation

| Manuscript claim | In the app | Status |
|---|---|---|
| Evaluates appliances based on available battery energy, battery condition, and appliance power requirements | Full engine: tier model (Safe / Caution / Unsafe), reserve-floor usable energy, charge-scaled watt cap, voltage headroom projection, budget bands (10% / 25% per hour) — `src/services/recommendation.ts` | Match |
| Classifies appliances as "OK to use" or "Not advisable" | Exact badge labels in code (`BadgeLabel` type); three internal verdicts (`recommended` / `care` / `notRecommended`) collapse to the two manuscript labels | Match |
| Users can input the appliances they plan to use through the application | Electronics CRUD: add/edit/delete custom appliances with wattage ranges, areas, and photos — `src/services/electronicsService.ts` | Match |
| — | Middle "care" verdict, runtime estimates (min/mid/max hours), motor surge multiplier (x3), combined load-stack checks against the inverter limit, stale-reading fail-safe block | Extra |

Section tally: 3 Match · 1 Extra

---

## 6. Notifications

| Manuscript claim | In the app | Status |
|---|---|---|
| Users receive push notifications (Use-Case Diagram; objectives) | Expo push registration, notification center screen, transition-based alert rules — `src/services/notificationService.ts`, `src/services/pushNotifications.ts` | Match |
| — | Email alerts (Edge Function `send-alert-email`), vibration, daily reminders, cooldowns (10-min default / 5-min update), 50 W milestone alerts | Extra |

Section tally: 1 Match · 1 Extra

---

## 7. Activity Logs

| Manuscript claim | In the app | Status |
|---|---|---|
| Activity logs, kept distinct from notifications | `src/services/activityLogService.ts` + `src/app/dashboard/activity-logs.tsx`; logs user actions with info/warning/error/critical severity, separate from notifications | Match |

Section tally: 1 Match

---

## 8. Monitoring History & Analytics

| Manuscript claim | In the app | Status |
|---|---|---|
| "Monitoring History" — historical records to analyze system performance and generate reports over selected date ranges and frequencies (Definition of Terms) | `monitoring_history` table (5-minute cron snapshots), 17 charts across Battery / Solar / Energy / Health / Usage sections, 7/30/90/365-day presets — `src/services/analyticsService.ts`, `src/app/dashboard/analytics.tsx` | Match |
| — | CSV and PDF export (20,000-row CSV cap), lazy-loaded chart cards | Extra |

Section tally: 1 Match · 1 Extra

---

## 9. Weather

| Manuscript claim | In the app | Status |
|---|---|---|
| "Weather information" in the mobile application (Definition of Terms) | OpenWeather current conditions + forecast, live GPS snapped to 24 Bukidnon sample points (aligned with the Sto. Nino, Manolo Fortich deployment area) — `src/services/forecast.ts`, `src/services/weatherForecast.ts`, `src/data/weather.json` | Match |
| — | Solar outlook charts (sun hours, best sun days, hourly solar curve) | Extra |

Section tally: 1 Match · 1 Extra

---

## 10. Use-Case Diagram Actors (Figure 4)

| Manuscript use-case | In the app | Status |
|---|---|---|
| Household User: view dashboard | `src/app/dashboard/index.tsx` | Match |
| Household User: receive push notifications | Push registration + notification center | Match |
| Household User: monitor battery level | Monitoring dashboard + realtime | Match |
| Household User: monitor solar energy | Monitoring dashboard + realtime | Match |
| Household User: monitor load consumption | Monitoring dashboard + realtime | Match |
| Household User: view historical data | Analytics screen (17 charts) | Match |
| Admin actor exists | `users.role = admin`, `useAdminGuard` routes admins to `/admin` | Match — *Ruled:* no admin; remove from app (code only, DB untouched) and from the manuscript's use-case diagram |
| Admin: monitor battery level / solar energy / load consumption / historical data | Admin shell has **no live monitoring** — only login/logout/exit | Not in app — *Ruled:* no admin; remove the actor entirely rather than implement |
| Admin: configure alert thresholds | Threshold publishing was **removed by design** from the admin shell | Not in app — *Ruled:* no admin; remove from the manuscript use-case |

Section tally: 7 Match · 2 Not in app

---

## 11. Admin Dashboard

*Ruled November 10, 2026: there is no admin.* The app removes its admin shell
(code only; the Supabase `users.role` column and role migrations stay
untouched), and the manuscript removes the Admin Dashboard definition, the
web-dashboard scope sentences, and the Admin use-case actor via the Word edit
checklist. This section is retained for traceability.

| Manuscript claim | Current app state | Status |
|---|---|---|
| "Planned web-based platform" for researchers to monitor system data, manage records, and review system information (Definition of Terms; Scope 1.4) | In-app (React Native, not web) role-gated shell: "Starting UI — account actions only"; Users/Devices/Reports/Settings boxes are presentational no-ops — `src/admin/components/AdminDashboardScreen.tsx` | Partial — *Ruled:* remove (no admin) |
| Researchers are a distinct user class | Admin role + guard, fixed light theme and English-only admin area | Match — *Ruled:* remove (no admin) |

Section tally: 1 Partial · 1 Match

---

## 12. IoT / ESP32-to-Supabase Pipeline

| Manuscript claim (Figures 2, 3, 6) | In the app | Status |
|---|---|---|
| Sensors → ESP32-S3 → Wi-Fi → Supabase cloud → mobile app, real-time | App side fully built: `monitoring` table (one row per user, ESP32-written by design), realtime subscription with backoff, 5-minute cron into `monitoring_history`, server-owned heartbeat `device_status` — `docs/implementation-plan/monitoring_history.md` | Match (app side) |
| ESP32 firmware collects and transmits sensor data | **No firmware sources in this repo**; feed not wired end-to-end (documented as in-progress in `SYSTEM-STATUS.md`, README "In Development") | Partial — pending firmware |

Section tally: 1 Match · 1 Partial

---

## 13. In the App but Not in the Manuscript (Additions)

The manuscript does not mention any of the following, all of which are
implemented. (`README.md:294` already flags authentication as "an
implementation addition beyond the manuscript's stated scope.")
*Ruled:* the app's feature set is authoritative — these features are added
to the manuscript via the `markdown/manuscript-updates.md` Word edit
checklist, rather than removed from the app.

| # | Addition | Evidence |
|---|---|---|
| 1 | User accounts & authentication: username/email/password, Google OAuth (PKCE), password recovery, email confirmation, session persistence | `src/services/auth.ts`, `src/context/AuthContext.tsx` |
| 2 | Multi-language support: English, Filipino, Cebuano | `src/services/i18n.ts`, `src/locales/` |
| 3 | Dark mode, font size/family settings | `src/context/ThemeContext.tsx`, `src/context/SettingsContext.tsx` |
| 4 | Offline support: last-reading cache, memory cache, request coalescing, connectivity banner | `src/services/monitoringService.ts`, `src/services/memoryCache.ts`, `src/hooks/useConnectivity.ts` |
| 5 | Email alert delivery (AgentMail edge function) | `supabase/functions/send-alert-email/`, `src/services/alertEmailService.ts` |
| 6 | Vibration alerts | `src/hooks/useAlertVibration.ts` |
| 7 | Daily reminders | `src/services/reminderService.ts` |
| 8 | CSV / PDF report export | `src/services/reportPrint.ts`, `src/services/reportStorage.ts` |
| 9 | Predefined appliance catalog (29 items) plus custom items, photos, archive | `src/constants/electronicsCatalog.ts`, `src/services/electronicsService.ts` |
| 10 | GPS weather snapping to 24 Bukidnon sample points (10 km radius) | `src/services/weatherConfig.ts` |
| 11 | OTA updates (Expo Updates) and EAS build pipeline | `app.json`, `eas.json` |
| 12 | Sentry crash reporting | `src/services/sentry.ts` |
| 13 | Public website + QR code | `site/` |
| 14 | Automated test suite (24 Jest files) | `src/**/__tests__/`, `jest.config.js` |
| 15 | Onboarding flow | `src/app/onboarding/`, `src/constants/onboardingSlides.ts` |
| 16 | About Us screen (team profiles) | `src/app/dashboard/about-us.tsx` |
| 17 | In-app user manual | `src/app/dashboard/user-manual.tsx`, `docs/USER-MANUAL.md` |
| 18 | Hardware component status screen (ESP32-S3, relay, fan, TFT cards) | `src/app/dashboard/components.tsx` |

---

## 14. Manuscript-Internal Inconsistencies Noticed

Issues inside the docx itself (not app problems, but they affect the
comparison):

| # | Issue | Detail |
|---|---|---|
| 1 | Inverter rating conflict | 3.3 Design text says "Inverter 1000"; Table 1 and Figures 3/5/7 say 1500 W. `SYSTEM-STATUS.md:66` additionally lists 220 W among the paper's conflicting values. *Resolved:* 1500 W is the true rating; correct the 3.3 text. |
| 2 | Sensor naming conflict | 3.3 Design text lists "INA219, INA226" and "LCD2004"; Table 1 specifies INA228 and SPI TFT. Fix 3.3 to match Table 1. |
| 3 | Title variants | Cover: "Off-Grid Solar Backup Power System with Real-Time Energy Monitoring and Appliance Recommendation"; 1.1 and 2.2 use "Off-Grid Solar Energy Harvesting System with Mobile Application Monitoring". Harmonize. |
| 4 | Table numbering drift | List of Tables shows Tables 1, 4, 5, 6, 7, 8 and an "ISO/IEC 25010 Survey Test"; the body uses Tables 1, 2, 4, 5, 6, 7 and only the SUS instrument. Renumber. |
| 5 | Duplicate heading | 3.3.3 and 3.3.4 are both titled "Hardware Deployment Specification". Rename one. |
| 6 | Humidity gap | DHT22 humidity is described in the sensor list and Figure 3, but no humidity figure appears anywhere in the system's monitoring outputs. *Resolved:* documented as a limitation. |
| 7 | Platform wording conflict | 1.4 scope says "cross-platform mobile application"; the same section's limitation says Android-only with iOS excluded. *Resolved:* system is Android-only; correct the "cross-platform" wording. |

---

## Method & Sources

- Manuscript text extracted read-only from `word/document.xml` inside
  `AdlaWatt-Manuscript.docx` (443 non-empty paragraphs), covering the title
  page, approval sheet, Chapters 1–3, references, and all tables/figures.
- App claims verified directly against source files on the `development`
  branch (`9f87e11`), with cross-references to `README.md`,
  `SYSTEM-STATUS.md`, and `docs/implementation-plan/`.
- `SYSTEM-STATUS.md` ("Paper vs Current System") independently corroborates
  the 600 W vs 800/1000 W, 640.8 vs 604.8 Wh, admin-shell, and
  weather/offline/i18n additions reported here.
- **Correction:** the "640.8 Wh usable" figure referenced in
  `SYSTEM-STATUS.md:67` is *not present anywhere in the manuscript docx*.
  A full-text scan of `word/document.xml` (including headers/footers) found
  no usable-energy or reserve percentage; the manuscript specifies only a
  12 V, 60 Ah bank. The November 10 ruling therefore uses the
  manuscript-literal 720 Wh basis.
- **Reconciliation rulings (November 10, 2026):** manuscript is authoritative
  for hardware values, the app is authoritative for features, there is no
  admin, and the system is Android-only. Details in the Reconciliation
  Rulings section. Implementation of these rulings is tracked separately
  (apps: hardware constants, admin removal, Android-only config; manuscript:
  `markdown/manuscript-updates.md` checklist).
- Hardware rows are marked N/A where the component is physical and has no
  code counterpart; rows note where the app surfaces the component's data
  or status.
