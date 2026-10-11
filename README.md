# AdlaWatt

An IoT-based transportable off-grid solar energy harvesting system with a mobile application for real-time energy monitoring, appliance recommendations, notifications, and backup power management during electricity interruptions.

AdlaWatt is designed to provide households with an alternative backup power source by harvesting solar energy, storing it in a battery, and supplying electricity through a built-in AC outlet. The mobile application allows users to monitor battery status, solar energy, power consumption, temperature, system status, energy history, and appliance recommendations.

> **Project Status:** In Development
> The mobile application is integrated with Supabase — authentication, database, Edge Functions, and real-time streaming — for live monitoring, notifications (in-app + email), activity logs, appliances, and analytics report export. Implemented: 17 analytics charts across Battery/Solar/Energy/Health/Usage (`AnalyticsChartCard` + `charts/` via `react-native-gifted-charts`) with CSV/PDF export (real files on native via expo-print, jsPDF binary on web), 5-day solar forecast, branded alert emails via AgentMail, slim appliance catalog (`GIVEN_CATALOG` + `appliancesService`), in-app User Manual (15 EN sections), fixed safety thresholds (800 W / 11.6 V / 14.6 V), and persisted theme/typography/language/preference stores. Still in progress: end-to-end ESP32 hardware feed, offline hardening beyond the last-reading cache, and push on-device verification.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Components](#system-components)
- [Mobile Application](#mobile-application)
- [User Manual](#user-manual)
- [Tech Stack](#tech-stack)
- [Hardware Components](#hardware-components)
- [Software Architecture](#software-architecture)
- [Project Structure](#project-structure)
- [Application Screens](#application-screens)
- [Data and Backend](#data-and-backend)
- [Data Flow](#data-flow)
- [Installation](#installation)
- [Development](#development)
- [Build and Deployment](#build-and-deployment)
- [Current Development Status](#current-development-status)
- [Limitations](#limitations)
- [System Specifications](#system-specifications)
- [SDG Alignment](#sustainable-development-goals)
- [Research Evaluation](#research-evaluation)
- [Development Approach](#development-approach)
- [Future Improvements](#future-improvements)
- [Research Purpose](#research-purpose)
- [Contributors](#contributors)
- [License](#license)

---

## Overview

AdlaWatt is an IoT-based off-grid solar energy harvesting system developed as a backup power solution for households during electricity interruptions.

The system collects solar energy through a solar panel and stores the generated energy in a 12V battery housed inside a transportable lockable enclosure. A built-in AC outlet allows compatible household appliances to use the stored energy.

The system monitors energy generation, energy consumption, battery status, battery temperature, solar panel temperature, and interior temperature. Sensor data is transmitted through an ESP32 to a cloud database and streamed in real time to the AdlaWatt mobile application.

One of the main features of AdlaWatt is its appliance recommendation system. Users can identify appliances they plan to use, and the application recommends suitable appliances based on their power requirements and the available battery level.

AdlaWatt is intended as a backup power source during electricity interruptions and is not designed to replace the electrical grid.

---

## Features

### Real-Time Monitoring

The application displays live monitoring information received in real time from Supabase (the ESP32 writes to the `monitoring` table; the app subscribes to `postgres_changes` updates). The dashboard shows:

- Battery percentage and battery status (Charging / Discharging / Idle)
- Battery voltage
- Battery energy in watt-hours and estimated time remaining
- Current appliance load
- Depth of discharge (DoD) status (Safe / Unsafe)
- Incoming solar energy and solar status (Low / Moderate / High)
- Solar voltage, solar current, solar timer, and total energy
- Battery temperature, solar panel temperature, and interior temperature (each with Nominal / Elevated / High / Critical status)
- Device status (Online / Offline)
- Live weather (temperature, description, location) from OpenWeatherMap

A battery gauge with smooth animated transitions and a live weather card are rendered on the dashboard.

### Appliance Recommendation

The application allows users to view or select household appliances and receive recommendations based on the available battery state.

A battery-aware recommendation engine (`src/services/recommendation.ts`) classifies the battery tier (Safe / Caution / Unsafe) using remaining energy, the 144 Wh reserve floor (20% of the 720 Wh ZENOVA 12V 30Ah ×2 nominal, 576 Wh usable), voltage, and depth of discharge, then estimates per-appliance runtime from the usable energy and the appliance power range (`wattage_min`/`wattage_max`). The engine computes the full analysis (tier, usable Wh, charge-scaled wattage cap, voltage headroom, budget share, runtime range, `recommended` / `care` / `notRecommended` verdict, reasons, load-stack checks) while the dashboard and Appliances screens expose the simplified two-badge display:

- **OK to use** — `recommended` or `care` (usable with care)
- **Not advisable** — `notRecommended` (blocked battery, unsafe voltage, over wattage cap, draws > 25%/hr, < 10 minutes runtime, or invalid wattage)

Appliance data comes from the slim `appliances` table (`app_id, appliance_name, type, catalog_key, wattage_min/max, selection, archive, user_id`) resolved through `src/constants/applianceCatalog.ts` (`GIVEN_CATALOG`, `catalog:` namespaced keys, `min-maxW` display) and `src/services/appliancesService.ts`. Catalog wattage/area always come from code, never from DB columns. When no live monitoring reading is available yet, the screens fall back to the previous wattage-threshold rule.

### Dashboard

The dashboard provides a summary of the current AdlaWatt system condition, including:

- Battery status and battery gauge
- Solar input
- Current load
- Device status
- Battery, solar panel, and interior temperatures
- Depth of discharge status
- Appliance recommendations
- Recent activity logs
- Quick navigation buttons with smooth scrolling

### Weather & 5-Day Solar Forecast

The dashboard includes a live weather card that displays the current temperature, condition description, and location using the OpenWeatherMap API. Location is resolved through device permissions (`expo-location`) with balanced accuracy, and weather refreshes automatically every 10 minutes (`autoRefreshMs 600000` in `src/data/weather.json`).

A 5-day solar outlook (`src/services/forecast.ts`) groups OpenWeatherMap `/forecast` 3-hour steps into daily summaries tuned for solar planning: peak condition (most extreme present, not majority vote), solar outlook (High / Moderate / Low), `tempMax`/`tempMin`, `popMax%`, hot/cold flags (`hotC 30` / `coldC 20`), and a best-sun day summary (“Best sun: {day} — good day to charge fully.” / “Low sun all week — conserve battery.”). The Weather Monitoring card (`ChartCard type="weather"`) renders pinned Today plus a horizontal upcoming strip alongside thresholds, icons, and error/skeleton states from `src/services/weatherConfig.ts` + `src/services/weatherForecast.ts`. Forecast loads independently so it never blocks monitoring.

### Notifications (In-App + Email)

The application generates and displays system notifications in real time via transition-gated `check*()` rules in `src/services/notificationService.ts`:

- Battery alerts (charging, discharging, low level, fully charged, runtime, voltage — voltage rules fire on the fixed 11.6 V / 14.6 V safety window)
- Temperature alerts (battery, solar panel, and interior — Nominal to Critical)
- Solar alerts (input detected, increased, unavailable, low input during charging)
- Load alerts (current load detected, no load, consumption increased, high load above the fixed 800 W safety trip)
- Depth of discharge alerts (safe, unsafe, returned to safe)
- Device status alerts (online, offline, status changed)
- Data health alerts (stale monitoring, missing records, invalid time remaining)

Notifications are stored in the Supabase `notifications` table, include `normal` or `alert` types, use 10-min / 5-min cooldowns to avoid alert spam, and can be marked as read. An unread-count badge is shown on the navigation bar. Notifications and activity logs are kept as separate lists with a hard boundary (see `implementation plan/notification_catalog.md`); login uses a generic message.

Alert-type notifications also send a branded email via `src/services/alertEmailService.ts` → Supabase Edge Function `send-alert-email` (AgentMail proxy, API key server-only). The email is a Gmail-safe 600px table with inline styles, exact AdlaWatt logo (hosted via `EXPO_PUBLIC_AGENTMAIL_LOGO_URL`, cream/white header), and no CTA. Sends are JWT-gated, fire-and-forget, and cooldown-gated. A global per-user “Email notifications” toggle (default ON, `users.email_notifications`) gates email sends on every device — in-app rows are always written regardless. The toggle persists server-side with a per-user `AsyncStorage` cache (`adlawatt.email_notifications.v1(:userId)`) so it survives offline.

### Activity Logs

The application provides an activity log for viewing recorded system activities and events. Logs are paginated and typed (info, warning, error, critical). The dashboard also provides a preview of recent activity logs with an option to view all recorded activities.

### Appliance Management

Users can view household appliances and their power requirements, select appliances for use, and manage custom appliances backed by the slim `appliances` table and `GIVEN_CATALOG`:

- Add, edit (shared dialog), and delete custom appliances; archive with confirmation (mirrors delete); `archive=true` hides the row
- 3-dot toggle menu (replaces long-press), selection circle, archives button with select-all and archived count, loading + empty states
- Advisable / Caution / Not Advisable status from the recommendation engine (simplified to Advisable / Not Advisable badges in list views)
- Filters by advisability, power rating (All / Highest / Moderate / Low via `levelFromWatts`), and area (Living / Bedroom / Kitchen / Work-Study / Bathroom / Porch / Custom Appliances)
- Display stays `min-maxW` (e.g. `35-75W`) so `parseWattageRange` + validators keep working; `catalog:` keys are never renamed after release

### Component Monitoring

The Components screen provides live status information for the IoT and power components used by the AdlaWatt system (`Buck Converter`, `DS18B20 (Battery/Solar)`, `ESP32`, `INA228 (Input/Output)`, `Relay Module 5V 1 Channel`, `Voltage Sensor`, `DHT22`, `5V DC Fan`, `SPI TFT Display`), retrieved from Supabase with real-time updates and mapped to local images in `assets/images/components/`.

### Analytics & Reports

The Analytics screen loads historical data from the `monitoring_history` table for a selected date range and frequency (Daily, Weekly, Monthly, Yearly). It renders 17 charts in 5 sections — **Battery** (level over time with 20% safety floor, unsafe-discharge events, activity), **Solar** (vs load, best sun days, sun hours, curve by hour), **Energy** (in/out, net, running balance, solar coverage), **Health** (temperatures, temp alerts, uptime, online/offline share), **Usage** (average vs peak load, power by hour) — all through the reusable `AnalyticsChartCard` shell (header + optional frequency `SlidingToggle` + `{children}`) with data via `groupMonitoringHistory` + range shapers in `src/services/analyticsService.ts` and shared constants in `src/services/chartMath.ts`. It generates:

- **PDF reports**: jsPDF + jspdf-autotable binary download on web; expo-print HTML template (500-row cap, logo embed) shared to a real file on native
- **CSV exports**: full dataset download on web, real `.csv` file via share sheet on native

Chart axes always render, even without enough history (empty → zero points).

### Settings (Menu)

The Menu screen (`SettingsScreen`, staged Save/Cancel draft flow) provides account management and user preferences:

- Edit username and email
- Change password (with current-password verification)
- Dark mode toggle (system / light / dark, instant apply), font size (Small / Medium / Big, 0.875 / 1 / 1.15 scale), font family (Inter / Roboto / Times New Roman / Monospace / System Default via `expo-font` + `useAppFonts`), language (English / Filipino / Cebuano), vibration, reminders (device-local daily review + low-sun advisories), and global per-user email-notification preference
- Logout with confirmation

> Persistence: theme (`adlawatt.theme.v2`, with v1 migration), typography (`adlawatt.typography.v1`), language (`adlawatt.language.v1`), vibration (`adlawatt.vibration.v1`), email-notifications (server `users.email_notifications` + per-user `AsyncStorage` cache) survive app restarts and offline. `fontWeight` was removed — old saves carrying it are ignored without migration. A single shared `SettingsProvider` + `ThemeProvider` in `app/dashboard/_layout.tsx` propagates typography/theme to all dashboard screens (auth screens intentionally render light).

### About Us

The About Us section provides information about the AdlaWatt project and its developers.

### Authentication

The application uses Supabase authentication with:

- Registration (username, email, password) with validation and Terms and Conditions; profile row created by DB trigger (with backfill migration), non-dismissable “check-your-email” modal
- Login by username or email (60s resend throttle, mapped error messages)
- Auth callback (`/auth/callback`, `adlawatt://auth/callback` for PKCE on native, `/auth/callback` on web)
- Persistent login sessions (`AuthContext` single source via `getSession` + `onAuthStateChange`; AsyncStorage on native, localStorage on web)
- User profile loading and account updates (username, email, password; `email_notifications` defaults ON)
- Email change handling with confirmation
- Logout functionality (silences expected Realtime `CLOSED`, guards logout writes; `shutdownNotificationService` on sign-out/user change)

- Password recovery (`/auth/forgot-password`): emailed recovery link verifies in-screen, then sets a new password (60s resend throttle, mapped error messages)

---

## System Components

AdlaWatt consists of three major parts:

### 1. Physical Power System

The physical system consists of:

- Solar panel
- Solar charge controller
- 12V battery
- Inverter
- Built-in AC outlet
- Protection components
- Transportable lockable enclosure

### 2. IoT Monitoring System

The IoT system collects and processes information from the physical power system using an ESP32 and connected sensors (INA228 input/output, DS18B20 battery/solar, DHT22 interior, voltage sensor, relay, SPI TFT display). Sensor readings are transmitted to the cloud database over Wi-Fi.

### 3. Software System

The software system consists of:

- Cross-platform mobile application for household users
- Role-gated admin shell for researchers (starting UI: login-gated entry with Log Out / Exit; no operational tabs by final decision)
- Supabase cloud database with real-time data streaming
- REST/HTTP communication between the IoT system and cloud services

The capstone identifies the household user and admin as the primary actors. Household users monitor the system through the mobile application. Units are researcher-provisioned (no in-app pairing flow); the admin route is a starting shell only, and safety thresholds are fixed engineering constants (800 W / 11.6 V / 14.6 V), not admin-configurable.

---

## Mobile Application

The AdlaWatt mobile application is designed as a cross-platform application for household users. It is built with Expo (React Native) and Supabase for authentication, data storage, and real-time updates.

### Main Navigation

| Screen | Purpose |
|---|---|
| Dashboard | Displays system overview and real-time monitoring |
| Appliances | Displays household appliances and recommendations |
| Analytics | Displays 17 historical charts (Battery/Solar/Energy/Health/Usage) and CSV/PDF report export |
| Components | Displays IoT and system component status |
| Notifications | Displays system notifications and alerts |
| Activity Logs | Displays system activity history |
| Menu | Account management and user preferences |
| About Us | Displays information about AdlaWatt |
| User Manual | In-app usage guide (`/dashboard/user-manual`) |

> Auth also includes `/auth/callback` (PKCE callback, not a user-facing screen).

### Navigation Components

The application uses:

- Custom bottom tab bar (Dashboard, Appliances, Analytics, Menu)
- Top navigation bar with a notification icon and unread-count badge
- Device status indicator in the navigation bar
- Quick-navigation buttons with smooth animated scrolling on the dashboard
- Route-based navigation through Expo Router
- Screen-specific containers and layout components

## User Manual

The User Manual screen (`src/app/dashboard/user-manual.tsx`, `Routes.USER_MANUAL = "/dashboard/user-manual"`) provides an in-app usage guide reachable from the dashboard and menu.

---

## Tech Stack

### Mobile Application

| Technology | Purpose |
|---|---|
| Expo SDK 55 (expo-dev-client) | Development platform |
| React Native 0.83 | Cross-platform mobile framework |
| React 19.2 | Component-based user interface |
| Expo Router | File-based routing and typed navigation |
| TypeScript (strict) | Static typing and application development |
| Supabase (`@supabase/supabase-js`) | Authentication, database, Edge Functions, real-time streaming |
| React Native StyleSheet | Component styling |
| `react-native-svg` | SVG battery/solar gauges (dashboard `ChartCard`) |
| `react-native-gifted-charts` | Analytics charts (17 across Battery/Solar/Energy/Health/Usage via `AnalyticsChartCard`) |
| `react-native-reanimated` + `react-native-worklets` | Animations |
| `expo-linear-gradient` | Gradient navigation interface |
| `expo-glass-effect` | Glass-style surfaces |
| `expo-image` | Optimized image rendering |
| `@expo/vector-icons` / Ionicons | Application icons |
| `@react-native-async-storage/async-storage` | Session, theme, typography, language, vibration, email-preference, and last-reading persistence |
| `expo-location` | Location access for weather/forecast |
| `expo-font` + `@expo-google-fonts/inter|roboto` | Bundled Inter/Roboto (Light/Regular/Bold) for typography preferences |
| `expo-device` | Device info |
| `eslint-config-expo` (ESLint 9 flat config) | Linting |

### Backend and Cloud

| Technology | Purpose |
|---|---|
| Supabase | Cloud database (PostgreSQL), authentication, Edge Functions, and real-time streaming |
| Supabase Realtime | `postgres_changes` live updates for monitoring, notification, and components |
| Supabase Edge Function `send-alert-email` | Server-side AgentMail proxy (key never ships in app bundle, JWT-gated) |
| `@react-native-community/netinfo` | Phone-side connectivity for the dashboard offline banner |
| Supabase Storage (`email-assets` public bucket) | Hosted alert-email logo/assets |
| OpenWeatherMap API | Live weather + 5-day forecast data |
| REST/HTTP | Communication between the IoT system and cloud services |
| ESP32 Wi-Fi | Wireless transmission of sensor data |

### App Services (`src/services/`)

| Service | Purpose |
|---|---|
| `monitoringService.ts` | `MonitoringData` types + `useMonitoring()` realtime subscription |
| `notificationService.ts` | Transition-gated alert rules, cooldowns, `maybeSendAlertEmail()` |
| `alertEmailService.ts` | Branded HTML/text builder + `functions.invoke("send-alert-email")` client |
| `activityLogService.ts` | Manual fire-and-forget `logActivity()` (no triggers/hooks, never throws) |
| `appliancesService.ts` | Slim-schema CRUD + `GIVEN_CATALOG` resolution |
| `recommendation.ts` | Pure battery-aware engine (tier/verdict/runtime/budget/load-stack) |
| `analyticsService.ts` | History grouping, chart range data, PDF/CSV generation |
| `chartMath.ts` | Shared chart constants/colors + `clampPercent`/`useChartColors` |
| `forecast.ts` | 5-day solar outlook fetcher |
| `weatherForecast.ts` / `weatherConfig.ts` | Current weather fetcher + typed `weather.json` gateway |
| `settings.ts` / `typography.ts` | Persisted typography + email-preference cache + font resolution |
| `auth.ts` | Validation, error mapping, profile loading, resend throttle |

### Analytics and Reporting

- **jsPDF + jspdf-autotable** — PDF report generation (real binary download on web)
- **expo-print HTML template** — native PDF as a real file via share sheet (500-row cap, logo embed)
- **CSV export** — full-dataset download on web, real `.csv` file via share sheet on native
- **react-native-gifted-charts** — 17 analytics charts rendering

### Development Tools

- **Visual Studio Code** — Application development
- **Android Studio** — Android testing and emulation
- **Expo CLI / EAS CLI** — Development and application builds
- **Git / GitHub** — Version control

---

## Hardware Components

The AdlaWatt physical prototype consists of power and IoT components.

### Power Components

| Component | Purpose |
|---|---|
| Solar Panel | Collects solar energy |
| PWM Charge Controller | Regulates battery charging |
| 12V Battery | Stores electrical energy |
| 1000W Inverter | Converts DC power to AC power |
| Breaker | Provides overcurrent protection |
| Surge Protection Device | Protects against voltage surges |
| AC Outlet | Supplies power to compatible appliances |

### IoT Components

| Component | Purpose |
|---|---|
| ESP32 | Main microcontroller and Wi-Fi communication |
| INA228 (Input) | Monitors solar panel voltage and current |
| INA228 (Output) | Monitors load voltage and current |
| DS18B20 (Battery) | Monitors battery temperature |
| DS18B20 (Solar) | Monitors solar panel temperature |
| DHT22 | Monitors interior temperature/humidity |
| Voltage Sensor | Measures system voltage |
| Relay Module 5V 1 Channel | Controls load and cooling fan switching |
| SPI TFT Display | Displays local real-time system information |
| 5V DC Fan | Provides cooling when required |
| Buck Converter | Steps down voltage for low-voltage components |

The component list and images in the app (`components.tsx` `componentImages` → `assets/images/components/`) are the source of truth for the prototype. Battery capacity reference for the recommendation engine is ZENOVA 12V 30Ah ×2 in parallel (720 Wh nominal, 144 Wh reserve, 576 Wh usable); INA228 is the primary SoC source with voltage backup (see `implementation plan/zenova_battery.md`).

---

## Software Architecture

The power system flow:

```text
Solar Panel
     │
     ▼
Surge Protection
     │
     ▼
Circuit Breaker
     │
     ▼
PWM Charge Controller
     │
     ▼
12V Battery
     │
     ▼
Inverter
     │
     ▼
Built-in AC Outlet
     │
     ▼
Household Appliance
```

Sensor and data flow:

```text
INA228 (Input) ───────┐
                      │
INA228 (Output) ──────┤
                      │
DS18B20 (Battery) ────┤
                      │
DS18B20 (Solar) ──────┤
                      │
DHT22 ────────────────┤
                      │
Voltage Sensor ───────┤
                      ▼
                    ESP32
                      │
                    Wi-Fi / HTTP
                      │
                      ▼
                 Supabase
          (PostgreSQL + Realtime
           + Edge Functions + Storage)
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
    Mobile App    Admin Shell    ESP32 Status
    (Realtime)   (login/logout)  (monitoring)
```

Sensor information is collected by the ESP32, transmitted to Supabase over HTTP, and streamed to the mobile application through Supabase Realtime channels filtered by the authenticated user. Alert-type notifications fan out through the `send-alert-email` Edge Function (AgentMail, gated by the per-user email preference).

---

## Project Structure

The application follows a component-based Expo Router structure with the source under `src/` and the `@/` path alias pointing to `src/`.

```text
AdlaWatt/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── splash.tsx
│   │   ├── auth/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── callback.tsx
│   │   └── dashboard/
│   │       ├── _layout.tsx
│   │       ├── index.tsx
│   │       ├── appliances.tsx
│   │       ├── analytics.tsx
│   │       ├── components.tsx
│   │       ├── notifications.tsx
│   │       ├── activity-logs.tsx
│   │       ├── menu.tsx
│   │       ├── about-us.tsx
│   │       └── user-manual.tsx
│   │
│   ├── components/
│   │   ├── charts/
│   │   │   └── BatteryLevelChart.tsx
│   │   ├── forms/
│   │   ├── layout/
│   │   └── ui/
│   │       ├── AnalyticsChartCard.tsx
│   │       ├── ChartCard.tsx
│   │       ├── AppRecCard.tsx
│   │       ├── ActivityCard.tsx
│   │       ├── NotificationCard.tsx
│   │       └── ...
│   │
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── routes.ts
│   │   ├── theme.ts
│   │   ├── sizing.ts
│   │   └── applianceCatalog.ts
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── SettingsContext.tsx
│   ├── hooks/
│   │   ├── useAppColors.ts
│   │   ├── useTypography.ts
│   │   ├── useAppFonts.ts
│   │   └── useSafeAsync.ts
│   ├── data/
│   │   └── weather.json
│   ├── lib/
│   │   └── supabase.ts
│   ├── services/
│   │   ├── auth.ts
│   │   ├── monitoringService.ts
│   │   ├── notificationService.ts
│   │   ├── alertEmailService.ts
│   │   ├── activityLogService.ts
│   │   ├── appliancesService.ts
│   │   ├── analyticsService.ts
│   │   ├── chartMath.ts
│   │   ├── forecast.ts
│   │   ├── weatherForecast.ts
│   │   ├── weatherConfig.ts
│   │   ├── recommendation.ts
│   │   ├── settings.ts
│   │   └── typography.ts
│   └── global.css
│
├── supabase/
│   ├── functions/
│   │   └── send-alert-email/
│   └── migrations/
├── assets/images/components/
├── android/
├── .env.local
├── app.json
├── eas.json
├── package.json
└── tsconfig.json
```

> The structure may change as additional screens, services, database integration, and reusable components are implemented.

---

## Application Screens

### Splash Screen

Displays the AdlaWatt logo when the application starts before navigating to authentication.

### Login

Allows users to sign in using:

- Username or email
- Password
- Invalid credential warnings

### Register

Allows users to create an account using Supabase authentication with:

- Username, email, and password validation
- Terms and Conditions agreement
- Account details (username) stored in auth metadata with the `users` profile created by the database trigger

### Dashboard

The dashboard provides the primary system overview with:

- Battery gauge and status with smooth animations
- Real-time monitoring cards (battery, voltage, watt-hours, load, solar, temperatures, depth of discharge)
- Live weather card
- Appliance recommendations
- Recent activity logs
- Quick-navigation buttons with animated scrolling
- View All Activity Logs link

### Appliances

The Appliances screen manages household appliances and power requirements:

- Live appliance list from Supabase resolved through `GIVEN_CATALOG` + `appliancesService`
- Advisable / Caution / Not Advisable status (simplified to Advisable / Not Advisable badges in list)
- Filters by advisability, power rating (`levelFromWatts`), and area
- Add, edit (shared dialog), delete, and archive custom appliances with confirmation; archives button with select-all and archived count
- Appliance selection for recommendations

### Analytics

The Analytics screen provides historical analysis and report export:

- Date range and frequency selection (daily, weekly, monthly, yearly)
- Data from monitoring history and appliance usage history
- Battery Level Over Time chart (`AnalyticsChartCard` + `BatteryLevelChart`)
- CSV export and PDF report generation (real jsPDF binary on web, share-sheet text on native; embedded logo and summary tables)

### Components

The Components screen:

- Displays IoT and power component status (active/inactive, connected/not connected) with images (`Buck Converter`, `DS18B20`, `ESP32`, `INA228`, `Relay`, `Voltage Sensor`, `DHT22`, `DC Fan`, `SPI TFT Display`)
- Shows ESP32 device status
- Updates in real time through Supabase channels

### Notifications

The Notifications screen:

- Displays generated notifications (normal / alert types)
- Filters by type and time period
- Paginated list with unread state
- Mark-as-read support with unread-count badge in the navigation bar

### Activity Logs

The Activity Logs screen:

- Provides a complete, paginated view of recorded system activities
- Categorizes logs by type (info, warning, error, critical) with normalized icons

### Menu

The Menu screen (`SettingsScreen`) provides:

- Account management (username, email, password change)
- Preferences staged as drafts (Save commits, Cancel discards): theme (system/light/dark), font size/family, language, vibration, email notifications
- Persisted: theme, typography, language, vibration, email-notifications.
- Logout with confirmation

### About Us

Provides information about the AdlaWatt project and its developers.

### User Manual

In-app usage guide (`user-manual.tsx`) reachable from dashboard and menu.

### Auth Callback

PKCE callback handler (`auth/callback.tsx`) for email confirmation and OAuth-style redirects — not a user-facing screen.

---

## Data and Backend

### Current Integration State

The application is connected to Supabase for authentication, database, Edge Functions, Storage, and real-time streaming. Data is scoped to the authenticated user through `user_id` filtering and Supabase Realtime channels. The notification service starts explicitly on sign-in (staggered 600ms after first paint in `dashboard/_layout.tsx` to avoid channel-burst socket 1006) and shuts down on sign-out/user change.

Static/mock dashboard values have been replaced by live Supabase queries and real-time subscriptions.

### Supabase Tables & Storage

| Table / Bucket | Purpose |
|---|---|
| `users` | User profiles (created by database trigger on sign-up + backfill migration; includes `email_notifications` boolean default true) |
| `monitoring` | Current live sensor readings (single row per user) |
| `monitoring_history` | Historical monitoring records for analytics (5-min cron snapshots via `record_all_monitoring_snapshots()`) |
| `appliance_usage_history` | Historical appliance usage for analytics |
| `appliances` | Slim schema: `app_id, appliance_name, type, catalog_key, wattage_min/max, selection, archive, user_id` (`archive=true` = hidden) |
| `notifications` | Generated notifications with read state (separate list from activity logs) |
| `activity_logs` | Recorded system activities via manual `logActivity()` (no triggers/hooks) |
| `components` | IoT/power component list and live status |
| Storage `email-assets` (public) | Hosted alert-email logo/assets |

### Real-Time Features

- **Monitoring**: `postgres_changes` subscription on the `monitoring` table (all events) for the current user
- **Device status**: `UPDATE` subscription dedicated to the device online/offline state
- **Notifications**: automatic alert generation driven by real-time monitoring updates, staleness checks, and auth state changes; alert-type rows also trigger `maybeSendAlertEmail()`
- **Components**: live `componentsChannel` and `monitoringChannel` subscriptions
- **Startup hardening**: stable topics, leak guard/retry, staggered startup, silenced expected `CLOSED`/1006, web touch hardening

### Edge Function: `send-alert-email`

Server-side AgentMail proxy (`supabase/functions/send-alert-email/index.ts`). The AgentMail API key lives only as a Supabase secret — never in the app bundle. Calls are JWT-gated (`supabase.functions.invoke` with caller token).

```bash
supabase secrets set AGENTMAIL_API_KEY=<agentmail-key>
# optional, defaults to adlawatt@agentmail.to
supabase secrets set AGENTMAIL_SENDER_INBOX=<sender-inbox>
supabase functions deploy send-alert-email
```

### Environment Variables

The app reads its configuration from local environment files (`.env.local`, gitignored). Required variables:

```text
EXPO_PUBLIC_SUPABASE_URL=<supabase project url>
EXPO_PUBLIC_SUPABASE_KEY=<supabase anon/publishable key>
EXPO_PUBLIC_OWM_KEY=<openweathermap api key>
EXPO_PUBLIC_AGENTMAIL_LOGO_URL=<public https url of alert-email logo, e.g. email-assets bucket file>
```

Server-only (set via `supabase secrets set`, never `EXPO_PUBLIC_`):

```text
AGENTMAIL_API_KEY=<agentmail api key>
AGENTMAIL_SENDER_INBOX=<sender inbox, optional>
```

### Placeholder / Inactive Modules

The following remain pending:

- **Battery band upgrade** — 17 charts wired; min/max lines + unsafe red dots are the remaining gap

---

## Data Flow

The intended data flow is:

```text
Physical Sensors (ESP32)
       │
       ▼
   Wi-Fi / HTTP
       │
       ▼
   Supabase
(PostgreSQL + Realtime + Edge Functions + Storage)
       │
        ├──────────────► Admin Shell (login-gated, logout/exit)
        │
        ├── Alert Email (AgentMail via Edge Function)
        │
       ▼ (Realtime postgres_changes)
AdlaWatt Mobile App
       │
       ├── Dashboard
       ├── Notifications
       ├── Activity Logs
       ├── Appliances
       ├── Components
       └── Analytics
```

Users authenticate through Supabase; all queries and real-time channels are scoped to the authenticated user.

---

## Installation

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- Git
- Expo CLI / EAS CLI
- Android Studio for Android development and emulation
- Visual Studio Code or another code editor
- A Supabase project and an OpenWeatherMap API key

### Clone the Repository

```bash
git clone <repository-url>
cd AdlaWatt
```

### Environment Setup

Create a `.env.local` file in the project root and add the required values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<your-supabase-anon-key>
EXPO_PUBLIC_OWM_KEY=<your-openweathermap-key>
EXPO_PUBLIC_AGENTMAIL_LOGO_URL=https://<your-project>.supabase.co/storage/v1/object/public/email-assets/<logo-file>
```

The file is already ignored by Git. Server-only email secrets (`AGENTMAIL_API_KEY`, optional `AGENTMAIL_SENDER_INBOX`) are set via `supabase secrets set` — never in `.env.local`.

### Install Dependencies

```bash
npm install
```

### Start the Development Server

The project uses a development build (native modules):

```bash
npm start
```

For LAN or tunnel connections:

```bash
npm run start:lan
npm run start:tunnel
```

### Android Development

To build and open the application on an Android emulator or device:

```bash
npm run android
```

---

## Development

### Start Development Server

```bash
npm start
```

### Web Development

```bash
npm run web
```

### Lint

```bash
npm run lint
```

### TypeScript Checking

Run the project's TypeScript compiler:

```bash
npx tsc --noEmit
```

### Clear Expo Cache

If the application behaves unexpectedly:

```bash
npx expo start -c
```

### USB Debugging

When using a physical Android device over USB:

```bash
npm run reverse
```

### Git

Check the current repository status:

```bash
git status
```

Create a commit:

```bash
git add .
git commit -m "Update AdlaWatt application"
```

Push changes:

```bash
git push
```

---

## Build and Deployment

The Android application is built using Expo Application Services (EAS) with three build profiles.

| Profile | Distribution | Build Type |
|---|---|---|
| `development` | Internal | Development client (APK) |
| `preview` | Internal | APK |
| `production` | Store-ready | APK (auto-incrementing version) |

### Install EAS CLI

```bash
npm install -g eas-cli
```

### Login to Expo

```bash
eas login
```

### Configure EAS

```bash
eas build:configure
```

### Development Build

```bash
eas build --platform android --profile development
```

### Preview Build

```bash
eas build --platform android --profile preview
```

### Production Build

```bash
eas build --platform android --profile production
```

The final build configuration may change as the project approaches deployment.

---

## Current Development Status

### Completed

- [x] Expo SDK 55 / React Native project setup
- [x] TypeScript (strict) configuration with `@/` path alias
- [x] Expo Router navigation with typed routes + auth callback + user manual
- [x] Splash screen + authentication-aware guard (unauthenticated deep-links bounce to login)
- [x] Login screen (username or email)
- [x] Registration screen with validation, Terms and Conditions, and non-dismissable check-email modal
- [x] Supabase authentication (sign-up, sign-in, profile trigger + backfill, account update)
- [x] Persistent login sessions (AsyncStorage)
- [x] Custom bottom tab bar
- [x] Gradient navigation bar with notification icon
- [x] Unread notification count badge
- [x] Dashboard layout with quick-navigation scrolling
- [x] Real-time monitoring cards (battery, solar, temperature, load, device status)
- [x] Battery gauge with smooth animations
- [x] Depth of discharge (safe/unsafe) status
- [x] Live weather card (OpenWeatherMap + location) + 5-day solar forecast
- [x] Appliance catalog overhaul (slim schema, `GIVEN_CATALOG`, archive flag, 3-dot menu, archives view)
- [x] Advisable / Caution / Not Advisable appliance states and filters
- [x] Battery-aware appliance recommendation engine (ZENOVA 720 Wh / 144 Wh reserve)
- [x] Component monitoring with real-time status (INA228, DS18B20, DHT22, SPI TFT)
- [x] Notification service (auto-generated alerts, transition-gated rules, cooldowns)
- [x] Safety threshold rules live on fixed engineering constants (800 W / 11.6 V / 14.6 V); admin dashboard is a non-functional shell (login/logout/exit only)
- [x] Alert emails via Edge Function + AgentMail (branded template, per-user toggle, offline-safe cache)
- [x] Notifications screen with filters and pagination
- [x] Activity logs with pagination (separate list from notifications)
- [x] Analytics data pipeline (monitoring history)
- [x] 17 analytics charts across Battery/Solar/Energy/Health/Usage (`gifted-charts` + `chartMath` + `AnalyticsChartCard` shell)
- [x] CSV and PDF report export (web binary download / native real files via share sheet)
- [x] Light/dark/glass color tokens and theme hooks
- [x] Full dark-mode adoption across dashboard screens and shared components (auth screens intentionally remain light)
- [x] Typography preferences (Inter/Roboto via `expo-font`, Small/Medium/Big) with persistence
- [x] Theme persistence (`system/light/dark` v2) + email-preference persistence
- [x] Realtime/web hardening (stable topics, leak guard, staggered startup, silenced CLOSED)
- [x] EAS build configuration (development, preview, production)
- [x] ESLint flat config (eslint-config-expo)

### In Progress

- [ ] Battery band upgrade (avg + min/max lines + unsafe red dots; 17 charts wired, this is the remaining gap)
- [x] Notification safety threshold configuration (fixed 800 W / 11.6 V / 14.6 V engineering constants; admin has no publishing role)
- [x] Forgot password screen (`/auth/forgot-password` with in-screen verification + password update)
- [ ] Color-blind persistence (session-only by design; language and vibration persist)
- [ ] End-to-end ESP32 → Supabase hardware feed
- [x] Admin dashboard (starting shell: login-gated entry with Log Out / Exit; no operational tabs by final decision)
- [ ] Offline data handling (dashboard paints the last cached readings with an offline banner; ESP32 buffering is a firmware handoff)

---

## Limitations

The current prototype has several limitations.

### Prototype Limitation

The project is currently a prototype and is not intended for commercial production or large-scale deployment.

### Backup Power Only

AdlaWatt is designed as an alternative power source during electricity interruptions. It is not intended to replace the electrical grid.

### Solar Dependence

Energy harvesting depends on available sunlight.

### Compatible Appliances

The system is intended for compatible household appliances within the supported power capacity.

### Internet Connectivity

Real-time mobile monitoring requires network connectivity between the IoT system, cloud services, and mobile application.

### ESP32 / Hardware Integration

The ESP32 hardware feed is being integrated. The application consumes data through Supabase, but the end-to-end hardware → cloud → app loop is not yet fully verified.

### Placeholder Modules

- Analytics charts are implemented (17 across 5 sections); the remaining gap is the battery band upgrade (min/max lines + unsafe dots)
- Appliance recommendations are battery-aware only while live monitoring data is present; without it, the app falls back to a wattage threshold
- Notification safety rules for high load and voltage min/max fire on fixed engineering constants (800 W / 11.6 V / 14.6 V)

### Settings Persistence

Theme, typography (font size/family), language, vibration, and the global email-notification toggle persist across restarts (AsyncStorage + Supabase). Color-blind mode is session-only by design.

### Dark Mode Coverage

Dashboard screens and shared components follow the active theme via `useAppColors`. Auth screens intentionally remain light (no theme provider there by design).

---

## System Specifications

The capstone documentation identifies the following major system characteristics:

| Specification          | Description                                       |
| ---------------------- | ------------------------------------------------- |
| System Type            | IoT-based off-grid solar energy harvesting system |
| Intended Use           | Backup power during electricity interruptions     |
| Battery                | ZENOVA 12V 30Ah ×2 parallel (720 Wh nominal, 144 Wh reserve, 576 Wh usable) |
| Inverter               | 1000W                                             |
| Solar Monitoring       | INA228 (Input)                                    |
| Load Monitoring        | INA228 (Output)                                   |
| Temperature Monitoring | DS18B20 (battery, solar), DHT22 (interior)        |
| Main Controller        | ESP32                                             |
| Local Display          | SPI TFT Display                                   |
| Cloud Platform         | Supabase (database, auth, Edge Functions, storage, real-time) |
| Alert Email            | AgentMail via `send-alert-email` Edge Function + `email-assets` bucket |
| Weather Data           | OpenWeatherMap API (current + 5-day forecast)     |
| Mobile Platform        | Android / Cross-platform mobile application       |
| Mobile Monitoring      | Real-time system information via Supabase Realtime |
| Report Export          | PDF (jsPDF web / expo-print native) and CSV + 17 charts (gifted-charts) |
| Evaluation             | System Usability Scale (SUS)                      |

---

## Sustainable Development Goals

AdlaWatt supports the following United Nations Sustainable Development Goals:

### SDG 7 — Affordable and Clean Energy

AdlaWatt promotes the use of solar energy as a renewable source of backup electricity.

### SDG 11 — Sustainable Cities and Communities

The system provides households with an alternative source of electricity during power interruptions.

### SDG 13 — Climate Action

The project encourages the use of solar energy and renewable electricity sources.

The capstone specifically identifies SDG 7, SDG 11, and SDG 13 as the primary SDG alignments of the study.

---

## Research Evaluation

The AdlaWatt study uses the **System Usability Scale (SUS)** to evaluate the usability of the mobile application.

The evaluation focuses on users' assessment of:

- Real-time monitoring
- Appliance recommendation
- Overall user experience
- Mobile application usability

The SUS consists of 10 evaluation items and is interpreted using a Likert scale.

The SUS calculation follows:

```text
SUS Score = (Sum of Score Contributions) × 2.5
```

The capstone identifies SUS as the evaluation tool for assessing the usability of the developed mobile application.

---

## Development Approach

The project follows an iterative development process for the hardware and software components.

The development process includes:

1. Requirements Analysis
2. Planning
3. System Design
4. Hardware Development
5. Software Development
6. Unit Testing
7. Integration Testing
8. System Testing
9. Acceptance Testing

The research documentation identifies experimental research as the study design and uses the V-Model development approach for system development and testing.

---

## Future Improvements

Future development may include:

- Battery band upgrade (min/max lines + unsafe dots on top of the 17 wired charts)
- Detailed runtime / load-stack recommendation views on top of the recommendation engine
- End-to-end ESP32 → Supabase integration and real-time sensor data
- ESP32 offline buffer firmware (handoff spec exists; app side done)
- Color-blind persistence
- Offline hardening beyond the last-reading cache
- Remote monitoring
- Improved authentication flows
- Optimized appliance power consumption calculations
- Improved accessibility
- Application performance optimization
- Production deployment

---

## Research Purpose

AdlaWatt was developed to address the need for a practical and affordable backup power solution during electricity interruptions.

The research identifies a gap in existing systems that commonly provide energy monitoring but do not combine portable off-grid solar harvesting, real-time battery monitoring, temperature monitoring, appliance recommendations, and mobile application monitoring in one system.

The project therefore combines these features into a single system intended to help households monitor and manage available backup energy more safely and efficiently.

---

## Contributors

**AdlaWatt Research and Development Team**

Northern Bukidnon State College
Bukidnon, Philippines

This project was developed as part of an academic capstone research project.

---

## License

This project is an academic capstone project.

The project currently has **no separate open-source license specified**. Unless a license is added by the project authors, the source code and associated materials should not be assumed to be available for unrestricted commercial use, redistribution, or modification.

Copyright © 2026 AdlaWatt Research and Development Team.