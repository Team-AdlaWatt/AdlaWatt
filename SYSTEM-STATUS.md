# AdlaWatt System Status

Current state of the AdlaWatt prototype and the parts added after the Capstone 1 paper.

Status date: 27 October 2026

Status values: `Working`, `In progress`, `Limited`, `Available`, `Pending`.

## Current Status

| Area | Status | Notes |
|---|---|---|
| Mobile app | Working | Expo 57 / React Native 0.86. Auth, database, and real-time are connected. |
| Backend | Working | Supabase Postgres, Auth, Realtime, Storage, and one Edge Function. |
| Hardware feed | In progress | The ESP32 to Supabase feed is not yet wired end to end. |
| Admin | Limited | Login, log out, and exit shell only. |
| Android build | Available | Preview APK through Expo. OTA updates are configured. |
| Public site and docs | Working | GitHub Pages site is live. The latest app-download section is not merged yet. |
| Tests | Working | 24 Jest test files. Lint and typecheck scripts exist. |

## Features Not in the Paper

| Feature | What it does | Evidence |
|---|---|---|
| Google sign-in, password reset, username login | Lets users sign in with Google, recover a password, or use a username. | `src/app/auth/`, `src/services/auth.ts` |
| First-run onboarding | Shows a short walkthrough for new users. | `src/app/onboarding/` |
| 17 analytics charts | Shows Battery, Solar, Energy, Usage, and Health data. | `src/app/dashboard/analytics.tsx` |
| CSV and PDF reports | Exports the same data shown in the app. | `src/services/analyticsService.ts` |
| Weather and 5-day solar forecast | Shows current weather, daily forecast, and the best day to charge. | `src/services/weatherForecast.ts` |
| GPS snapping to Bukidnon points | Snaps to the nearest of 24 sample points within 10 km. | `src/services/weatherConfig.ts` |
| Custom electronics with photos | Adds user items and lets users upload a photo. | `src/components/forms/ElectronicsModal.tsx` |
| Archive, delete, filter, and sort | Keeps the electronics list organized and recoverable. | `src/app/dashboard/electronics.tsx` |
| In-app, email, vibration, and reminder alerts | Sends alerts through several paths, not just one. | `src/services/notificationService.ts` |
| Component health | Shows live status for ESP32, sensors, relay, fan, and display. | `src/app/dashboard/components.tsx` |
| Activity logs | Shows a paginated history separate from notifications. | `src/app/dashboard/activity-logs.tsx` |
| Offline cache and banner | Shows the last saved reading when the network is down. | `src/services/monitoringService.ts` |
| English, Filipino, and Cebuano | Changes app language and saves the choice. | `src/services/i18n.ts` |
| Dark mode and font settings | Changes theme, font size, and font family. | `src/app/dashboard/menu.tsx` |
| Deleted-account detection | Detects an account deleted while the app is open. | `src/services/accountSessionChecker.ts` |
| OTA updates | Sends JavaScript updates without a new APK. | `app.json`, `docs/buildplan.md` |
| Sentry crash reporting | Captures app errors for review. | `src/services/sentry.ts` |
| Public site and QR download | Gives users a web page and QR code for the Android app. | `site/`, `README.md` |

## Implementation Not in the Paper

| Area | How it works | Evidence |
|---|---|---|
| Data and security | Seven core tables, row-level security on electronics and photos, server-side role lock, storage for email assets and electronics photos, server-side email key. | `supabase/migrations/`, `supabase/functions/` |
| Live data | Supabase Realtime with memory and AsyncStorage cache, request coalescing, and retry. | `src/services/monitoringService.ts` |
| Recommendation engine | Uses 756 Wh nominal, 151.2 Wh reserve, 604.8 Wh usable, 800 W warning, 1000 W cap, and 11.6 V / 14.6 V limits. | `src/services/recommendation.ts` |
| Load stack | Checks a group of electronics together and blocks stacks over the inverter limit. | `src/services/recommendation.ts` |
| Analytics | Five sections, 17 charts, 7/30/90-day ranges, lazy loading, CSV and PDF export. | `src/services/analyticsService.ts` |
| Alerts | Threshold rules, cooldowns, in-app records, email, vibration, and daily reminders. | `src/services/notificationService.ts` |
| Weather | OpenWeather current and forecast data, live GPS, 24 sample points, and solar outlook. | `src/services/forecast.ts` |
| Auth lifecycle | Supabase Auth, Google PKCE flow, username RPC, recovery links, and session checks. | `src/services/auth.ts` |
| Localization | i18next with EN, FIL, and CEB locales and a saved preference. | `src/services/i18n.ts`, `src/locales/` |
| Delivery | EAS build, Expo Updates OTA, runtime version, and an installable APK. | `app.json`, `eas.json` |
| Observability and tests | Sentry, 24 Jest files, ESLint, and TypeScript checks. | `src/services/sentry.ts`, `src/services/__tests__/` |
| Public site | Static GitHub Pages, JSON-LD, sitemap, robots file, Open Graph image, and QR asset. | `site/` |

## Paper vs Current System

| Paper | Current system | Note |
|---|---|---|
| Appliance | Electronics | Renamed across app, database, and docs. |
| Inverter and scope values: 220 W, 1000 W, 1500 W, 600 W | 800 W warning, 1000 W cap | The paper values conflict. The code uses one model. |
| 640.8 Wh usable | 604.8 Wh usable | Corrected usable energy. |
| Basic dashboard | 17 charts and reports | Analytics scope grew. |
| Manual catalog | Catalog plus custom items, photos, and archive | More user control. |
| Basic alerts | In-app, email, vibration, and reminders | More delivery paths. |
| Admin dashboard | Limited shell | Not fully built. |
| No weather | Weather and 5-day solar forecast | Added. |
| No offline mode | Cache and offline banner | Added. |
| No language options | English, Filipino, and Cebuano | Added. |
| No OTA or crash reporting | Both | Added. |
| No public site or QR | Both | Added. |
| No test suite | 24 Jest files | Added. |

## Current Gaps

| Gap | Status | Note |
|---|---|---|
| ESP32 feed end to end | In progress | Hardware is not fully connected. |
| Analytics battery band | Not started | The chart still shows average values only. |
| Manual screenshots and FIL/CEB | Pending | English content is done. |
| Profile UI fixes | Pending | Listed in `docs/TODO.md`. |
| On-device alert and report checks | Pending | Needs a real device test. |
| Paper alignment | Pending | Wattage, capacity, and terms differ. |
| App-download site deploy | Pending | Merge the docs branch to deploy. |

## Where to Verify

| Path | What it shows |
|---|---|
| `README.md` | Status, features, stack, and hardware. |
| `docs/USER-MANUAL.md` | Screens and everyday use. |
| `docs/TODO.md` | Remaining work. |
| `docs/RECOMMENDATIONS.md` | Decisions and closed items. |
| `docs/implementation-plan/` | Subsystem designs. |
| `src/app/dashboard/` | App screens. |
| `src/services/` | App logic. |
| `supabase/migrations/` | Database and security. |
| `site/` | Public site and QR assets. |
| `package.json`, `app.json`, `eas.json` | Build and release setup. |
