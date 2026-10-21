[![Android Builds](https://github.com/Team-AdlaWatt/AdlaWatt/actions/workflows/android.yml/badge.svg)](https://github.com/Team-AdlaWatt/AdlaWatt/actions/workflows/android.yml)

# AdlaWatt

A transportable off-grid solar power system with a mobile app for real-time energy monitoring, electronics recommendations, notifications, and backup power management during electricity interruptions.

AdlaWatt harvests solar energy, stores it in a 12V battery, and supplies power through a built-in AC outlet. The mobile app lets households monitor battery status, solar energy, power consumption, temperatures, system health, and energy history — and tells them which electronics are safe to run on the available power.

> **Project Status:** In Development. The mobile app is fully integrated with Supabase (auth, database, real-time). The ESP32 hardware feed is still being wired up end to end.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Hardware](#hardware)
- [Backend Setup](#backend-setup)
- [Installation](#installation)
- [User Roles](#user-roles)
- [Changelog](#changelog)
- [Academic Context](#academic-context)
- [Contributors](#contributors)
- [License](#license)

---

## Overview

AdlaWatt is a backup power solution for households during outages. A solar panel charges a 12V battery inside a transportable lockable enclosure, and a built-in AC outlet lets compatible electronics use the stored energy.

The system also watches itself. An ESP32 reads solar, load, voltage, and temperature sensors, sends the data to the cloud, and the mobile app shows it live. The app's main feature is electronics guidance: pick the electronics you plan to use and it recommends what fits your current battery level.

AdlaWatt is a backup source, not a replacement for the electrical grid.

---

## Features

- **Real-Time Monitoring** — Battery percentage, voltage, watt-hours, time remaining, charge/discharge status, load, depth of discharge, solar input, and battery/solar/interior temperatures, all updating live.
- **Electronics Recommendations** — Each electronics item is labeled **OK to use** or **Not advisable** based on the remaining battery energy, voltage, and power draw.
- **Weather & 5-Day Solar Forecast** — Current temperature, condition, and location, plus a 5-day outlook that flags the best day to charge.
- **Notifications** — Automatic alerts for battery, temperature, solar, load, and device status. Delivered in-app, by email for alerts, with an alert vibration, plus daily local reminders.
- **Analytics & Reports** — 17 charts across Battery, Solar, Energy, Health, and Usage, with CSV and PDF export.
- **Component Health** — Live status for each IoT and power component (ESP32, sensors, relay, fan, display).
- **Activity Logs** — A paginated history of system events, separate from notifications.
- **Personalization** — Dark mode, font size and family, language (English, Filipino, Cebuano), vibration, and email notifications.
- **Offline Support** — The dashboard shows the last cached readings with an offline banner when there is no connection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | Expo 57 (React Native 0.86) with Expo Router |
| Language | TypeScript |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Edge Functions, Storage) |
| Weather | OpenWeatherMap API (current + 5-day forecast) |
| Charts | react-native-gifted-charts |
| Reports | jsPDF (web) and expo-print (native), plus CSV |
| Alerts | In-app + AgentMail email via a Supabase Edge Function |

---

## Project Structure

```text
AdlaWatt/
├── src/
│   ├── app/
│   │   ├── (opening)/splash.tsx
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   └── callback.tsx
│   │   ├── dashboard/
│   │   │   ├── index.tsx
│   │   │   ├── electronics.tsx
│   │   │   ├── analytics.tsx
│   │   │   ├── components.tsx
│   │   │   ├── notifications.tsx
│   │   │   ├── activity-logs.tsx
│   │   │   ├── menu.tsx
│   │   │   ├── about-us.tsx
│   │   │   └── user-manual.tsx
│   │   └── admin/            (role-gated shell)
│   ├── components/           (charts, forms, layout, ui)
│   ├── constants/            (routes, catalog, colors, theme, sizing)
│   ├── context/              (auth, settings, theme)
│   ├── hooks/
│   ├── locales/              (en, fil, ceb)
│   ├── services/             (monitoring, notifications, analytics, ...)
│   └── lib/supabase.ts
├── supabase/
│   ├── functions/send-alert-email/
│   └── migrations/
├── assets/images/            (logos, appliances, components, developers)
├── android/
├── app.json
├── eas.json
└── package.json
```

---

## Hardware

**Power**

| Component | Purpose |
|---|---|
| Solar Panel | Collects solar energy |
| Charge Controller | Regulates battery charging |
| 12V Battery (ZENOVA 30Ah ×2) | Stores energy — 756 Wh nominal, 604.8 Wh usable |
| Inverter | Converts DC to AC |
| AC Outlet | Powers compatible electronics |

**IoT**

| Component | Purpose |
|---|---|
| ESP32-S3 | Main controller and Wi-Fi communication |
| INA228 (Input / Output) | Monitors solar and load voltage/current |
| DS18B20 (Battery / Solar) | Monitors temperatures |
| DHT22 | Monitors interior temperature and humidity |
| INA219 | Measures system voltage |
| Relay Module | Controls load and cooling fan |
| SPI TFT Display | Shows local real-time info |
| 5V DC Fan | Cooling |

Safety thresholds are fixed engineering constants: **800 W** high load, **11.6 V** minimum, **14.6 V** maximum.

---

## Backend Setup

Data lives in Supabase. Core tables used by the app:

| Table | Purpose |
|---|---|
| `users` | Profiles, role, email-notification preference |
| `monitoring` | Current live sensor readings |
| `monitoring_history` | Historical readings for analytics |
| `appliances` | Household appliances and their power ratings |
| `notifications` | In-app notification records |
| `activity_logs` | System activity history |
| `components` | IoT component list and status |

**Edge Function:** `send-alert-email` — a server-side AgentMail proxy (the API key never ships in the app).

**Storage buckets:** `email-assets` (email logo) and `appliance-images` (custom appliance photos).

---

## Installation

### Prerequisites

- Node.js and npm
- Expo CLI / EAS CLI
- Android Studio (for Android)
- A Supabase project and an OpenWeatherMap API key

### Steps

1. Clone the repository:
   ```
   git clone <repository-url>
   cd AdlaWatt
   ```

2. Create a `.env.local` file in the project root:
   ```text
   EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
   EXPO_PUBLIC_SUPABASE_KEY=<your-supabase-anon-key>
   EXPO_PUBLIC_OWM_KEY=<your-openweathermap-key>
   EXPO_PUBLIC_AGENTMAIL_LOGO_URL=<public-url-of-the-email-logo>
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Run on Android:
   ```
   npm run android
   ```

For email alerts, set the server-only secrets and deploy the function:
```bash
supabase secrets set AGENTMAIL_API_KEY=<agentmail-key>
supabase functions deploy send-alert-email
```

---

## User Roles

| Role | Access |
|---|---|
| Household User | Full app: dashboard, electronics, analytics, components, notifications, activity logs, and settings |
| Admin | A limited shell (login, log out, exit) — assigned in the database, not through the app |

Users sign up with a username, email, and password, or sign in with Google. Passwords can be reset by email.

---

## Changelog

### Latest Changes

- **Live weather** — today's card is now driven by real GPS coordinates with accurate OpenWeather condition labels and icons.
- **5-day solar forecast** — daily solar outlook with a "best day to charge" summary and hot/cold flags.
- **Electronics catalog refresh** — updated to the current electronics list with corrected wattage ranges and new images.
- **Battery figures** — standardized to 756 Wh nominal / 151.2 Wh reserve / 604.8 Wh usable.
- **Self-hosted auth links** — confirmation and recovery emails now route back into the app, with clearer create-account copy.
- **Language support** — English, Filipino, and Cebuano.
- **Analytics** — 17 charts across five sections with CSV and PDF export.

---

## Academic Context

- **Sustainable Development Goals** — SDG 7 (Affordable and Clean Energy), SDG 11 (Sustainable Cities and Communities), and SDG 13 (Climate Action).
- **Evaluation** — Usability measured with the System Usability Scale (SUS).
- **Purpose** — To provide an affordable backup power solution that combines off-grid solar harvesting, real-time monitoring, and electronics guidance in a single system.

---

## Contributors

**AdlaWatt Research and Development Team**

- Francis Adrian Idul — Programmer
- Rhics T. Geonzon — Documenter
- Troy M. Rojo — Data Analyst

Northern Bukidnon State College, Bukidnon, Philippines. Developed as an academic capstone project.

---

## License

This project is an academic capstone project with **no open-source license specified**. Please do not assume the code is available for commercial use, redistribution, or modification without permission from the authors.

Copyright © 2026 AdlaWatt Research and Development Team.
