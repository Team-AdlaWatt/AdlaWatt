# AdlaWatt User Manual

> **Version:** 1.0 — matches app version 1.0.0
> **Language:** English (Filipino and Cebuano in-app translations cover screen labels; this guide is English-only)
> **Scope:** Operating the AdlaWatt mobile app. Physical installation and wiring of the solar box are covered by the separate hardware setup guide from the research team.

---

## Table of Contents

1. [What Is AdlaWatt?](#1-what-is-adlawatt)
2. [Quick Start: Your First 5 Minutes](#2-quick-start-your-first-5-minutes)
3. [Creating an Account](#3-creating-an-account)
4. [Signing In](#4-signing-in)
5. [Resetting a Forgotten Password](#5-resetting-a-forgotten-password)
6. [Dashboard: Reading Your System](#6-dashboard-reading-your-system)
7. [Electronics: What Can I Safely Use?](#7-electronics-what-can-i-safely-use)
8. [Analytics & Reports](#8-analytics--reports)
9. [Notifications](#9-notifications)
10. [Activity Logs](#10-activity-logs)
11. [Components: Checking System Health](#11-components-checking-system-health)
12. [Menu: Profile and Preferences](#12-menu-profile-and-preferences)
13. [Troubleshooting and FAQs](#13-troubleshooting-and-faqs)
14. [Glossary](#14-glossary)
15. [Safety, Limits, and Support](#15-safety-limits-and-support)

---

## 1. What Is AdlaWatt?

AdlaWatt is a transportable, off-grid solar backup power system for households. A solar panel collects sunlight, a battery inside a lockable enclosure stores the energy, and a built-in AC outlet supplies backup electricity to everyday electronics during power interruptions.

The mobile app is your window into the system. It shows:

- Live battery level, voltage, stored energy, and estimated time remaining
- Incoming solar power and 5-day solar outlook
- Current electronics load and depth-of-discharge safety status
- Battery, solar panel, and interior temperatures
- Smart electronics recommendations based on your remaining battery
- Notifications, activity history, and exportable energy reports

AdlaWatt is a **backup power source only**. It is not a replacement for the electrical grid.

<!-- SCREENSHOT: annotated Dashboard overview with callouts for battery gauge, solar card, load card -->

---

## 2. Quick Start: Your First 5 Minutes

Follow these steps the first time you open the app:

1. **Create your account.** Open the app, tap **Create Account**, enter a username, email, and password, agree to the Terms and Conditions, then tap **Create Account**. See [Section 3](#3-creating-an-account).
2. **Confirm your email.** Check your inbox for the confirmation link and tap it. You cannot sign in until your email is confirmed.
3. **Sign in.** Enter your username or email and password, then tap **Sign In**. See [Section 4](#4-signing-in).
4. **Read your battery.** On the Dashboard, look at the battery gauge at the top. It shows your current battery percentage and whether the battery is Charging, Discharging, or Idle.
5. **Check one electronics item.** Scroll to Electronics Recommendation on the Dashboard or open the **Electronics** tab. A badge of **OK to use** means safe; **Not advisable** means wait for more charge. See [Section 7](#7-electronics-what-can-i-safely-use).

That is enough to start monitoring. The rest of this manual explains each screen in detail.

---

## 3. Creating an Account

1. On the welcome screen, tap **Create Account**.
2. Fill in the three fields:
   - **Username** — 3 to 30 characters; letters, numbers, and underscores only.
   - **Email Address** — must be valid; confirmation and alert emails go here.
   - **Password** — 8 to 72 characters. Tap the eye icon to preview what you typed; the preview hides automatically after 5 seconds.
3. Check the box to agree to the **Terms and Conditions** (tap the link to read them first).
4. Tap **Create Account**.
5. A **Check your email** message appears and stays on screen. Open your inbox, find the AdlaWatt confirmation email, and tap the link inside.
6. Return to the app and tap **Continue to Sign In**.

**If the email does not arrive:** check spam first, then tap **Resend confirmation email**. Resends are throttled — if you just requested one, wait about a minute before trying again. You can also tap **Use a different email address** to restart with a corrected address.

**Tip:** you can also register or sign in with **Continue with Google** instead of a password.

<!-- SCREENSHOT: Register screen with field callouts -->

---

## 4. Signing In

1. Enter your **username or email** and your **password**.
2. Tap **Sign In**.
3. If your email is not confirmed yet, the app will tell you to confirm it first (see Section 3, step 5).

**If sign-in fails:** the most common causes are a wrong password, an unconfirmed email, or no internet connection. The error message on screen tells you which one — follow what it says, then retry. After too many rapid attempts the app briefly locks further tries; wait a moment and try again.

**Staying signed in:** the app keeps you signed in between sessions. To switch accounts or secure a shared phone, sign out from the Menu (see [Section 12](#12-menu-profile-and-preferences)).

<!-- SCREENSHOT: Login screen with Google button and Forgot Password link callouts -->

---

## 5. Resetting a Forgotten Password

1. On the Sign In screen, tap **Forgot Password?**
2. Enter your account **email** and tap **Send Recovery Link**.
3. Open the recovery email and tap the link. It opens the Reset Password screen directly and verifies the link there.
4. If the link is valid, you will see **Email Confirmed**. Either tap **Continue to Account** or expand the password form to set a new password immediately.
5. Enter the new password twice and tap **Update Password**.

**If the link does not work:** links expire. Request a fresh one from the same screen. Recovery emails are throttled like confirmation emails — wait a bit before resending, and check spam.

---

## 6. Dashboard: Reading Your System

The Dashboard is the home screen. It updates in real time whenever the AdlaWatt unit has internet. Data arrives every few seconds; if readings freeze, see [Section 13](#13-troubleshooting-and-faqs).

### Battery section

- **Battery gauge** — your state of charge as a percentage, animated as it changes.
- **Battery status** — *Charging* (solar is filling the battery), *Discharging* (electronics are drawing power), or *Idle*.
- **Voltage** — current battery voltage in volts.
- **Watt-hours + time remaining** — stored energy and the estimated runtime at the current load, e.g. `7h 45m`.
- **Depth of discharge (DoD)** — *Safe* means normal use; *Unsafe* means the battery is drained past its healthy limit and needs recharging immediately.

**The 20% rule.** Treat **20% battery as your empty line** for daily use. The battery keeps a 151.2 Wh safety reserve (20% of its 756 Wh capacity) that the app never counts as usable. Electronics advice, alerts, and the DoD status all follow this rule: at or below 20%, the system considers the battery unsafe for further loads.

### Solar section

- **Solar input** — incoming power in watts right now.
- **Solar status** — *Low*, *Moderate*, or *High*.
- **Details** — solar voltage, current, charging timer, and total energy harvested.
- **Weather card** — current temperature, conditions, and location for your area (needs location permission), refreshing about every 10 minutes.
- **5-day solar outlook** — groups the forecast into daily summaries with a solar outlook (High / Moderate / Low) and names the best sun day. Use it to plan high-draw electronics use on sunny days and conserve when a low-sun stretch is coming.

### Load, temperature, and device

- **Current load** — what connected electronics are drawing right now, in watts.
- **Temperatures** — battery, solar panel, and interior, each rated *Nominal*, *Elevated*, *High*, or *Critical*. *Critical* triggers an alert — check the unit when safe.
- **Device status** — *Online* (unit is reporting) or *Offline* (unit unreachable — see troubleshooting).

### Quick navigation

Buttons near the top scroll the Dashboard to each section, including the **Electronics Recommendation** card. If you are new and have no electronics yet, that card shows a welcome greeting with an **Add Electronics** button that takes you straight to setup (see [Section 7.1](#71-picking-electronics-from-the-catalog)). The top bar shows a notification bell with an unread-count badge — tap it to open Notifications.

<!-- SCREENSHOT: Dashboard with numbered callouts per card -->

---

## 7. Electronics: What Can I Safely Use?

Open the **Electronics** tab to see household electronics with a safety badge computed from your live battery:

- **OK to use** — the electronics item is within your safe energy budget (includes light "use with care" cases).
- **Not advisable** — blocked: battery unsafe, peak draw over the charge-scaled limit, or the electronics item would drain too much per hour. Recharge first or pick a lighter electronics item.

Each row shows the power range (e.g. `35-75W`) and estimated runtime from your usable energy.

### 7.1. Picking electronics from the catalog

1. On the Dashboard, tap the **Electronics Recommendation** button (it scrolls you to the recommendation card), then tap **Add Electronics**. Or open the **Electronics** tab directly and tap **Select Electronics**.
2. A selection modal appears with the electronics catalog — scroll through it.
3. Use the **search box** to find electronics by name instead of scrolling.
4. Tap the boxes to select what you plan to use; tap again to deselect.
5. Tap **Add**. The modal closes and your picks are now rated advisable or not advisable.

**Why selection matters:** the boxes' selection circles mark what you plan to run. Selection feeds the dashboard recommendation summary — and a safety alert if your combined selected load exceeds the safe limit while the battery is at 20% or below.

### 7.2. Adding a custom electronics item

If your electronics item is not in the catalog:

1. In the selection modal, tap **Add Custom** (if you have no customs yet, the empty state points you to the same button).
2. A form modal appears. Enter the electronics **name**, **minimum wattage**, and **maximum wattage**. Look the wattage up online (nameplate or manufacturer specs) — accurate numbers make the recommendation accurate.
3. Optionally attach a photo: tap the photo area, then **Choose from Library**, and pick an image from your files (5 MB maximum, photo-library permission required). It attaches when you save. Without a photo, the default AdlaWatt icon is used.
4. Tap **Add**. The electronics item registers and appears in your list, ready for recommendation.

### 7.3. Edit, archive, or delete (3-dot menu)

Each custom electronics box has a **3-dot icon** at its bottom-right. Tap it to open its menu:

- **Pen icon** — edit: a modal opens with the electronics item's info for editing.
- **Box icon** — archive: a Yes/No confirmation appears. Confirming moves the electronics item to the archives.
- **Trash icon** — delete: a Yes/No confirmation appears. Confirming permanently deletes it.

The menu closes by itself after about **3 seconds** if you tap nothing, or tap the dots again to close it.

### 7.4. Archives

1. Inside the selection modal, tap the **Archived** button (below the search box, showing how many items are archived).
2. The archived viewer opens: here you can edit, **unarchive**, or delete archived electronics.
3. Unarchiving returns the electronics item to the custom display.
4. To go back to the selection screen, tap the **Back** button in the footer.

### 7.5. Select all and reset

The selection modal footer has two bulk actions:

- **Select All** — selects every electronics item, catalog and custom.
- **Reset** — clears all selections.

### 7.6. Sorting the list

On the Electronics screen, use the two dropdowns to sort by **power level** and **area**, plus the advisability segments (which only show segments that actually contain electronics). Play with the combinations until the list shows what you need.

<!-- SCREENSHOT: Electronics list with badge, filter, and 3-dot menu callouts -->

---

## 8. Analytics & Reports

Open the **Analytics** tab to review history. Pick a **From/To date range** (dates cannot be in the future) and a report **frequency** (Daily, Weekly, Monthly, Yearly). Charts group your 5-minute system snapshots accordingly.

Sections:

- **Battery** — level over time (with the 20% safety floor marked), unsafe-discharge events, charge-vs-drain activity.
- **Solar** — solar vs load, best sun days, sun hours, and the daily solar curve (when the sun is strongest).
- **Energy** — energy in and out, net surplus/deficit, running balance, and how much of your use the sun covered.
- **Health** — temperature trends, temperature alerts, device uptime, online-vs-offline share.
- **Usage** — average vs peak load, and power use by hour of day (tells you when to avoid high-draw electronics).

### Exporting reports

1. Open the **Analytics** tab and go to the **Generate Report** panel at the bottom of the screen.
2. Choose your preferred **frequency** from the dropdown (Daily, Weekly, Monthly, Yearly).
3. Tap the **From date**: a calendar modal appears — pick the start date. Do the same for the **To date**. Dates cannot be in the future.
4. Tap **Export CSV** for raw spreadsheet data, or **Export PDF** for a formatted report with summary tables.
5. The file is now ready: on phones the system **share sheet** opens — save it or send it, then open it with your file viewer or spreadsheet app. On web it downloads directly.
6. While an export is running, the buttons show **Exporting...** and lock to prevent duplicate files.

**Note:** very long periods produce large PDFs; the PDF table shows the head of the range and points you to the CSV for the complete dataset.

<!-- SCREENSHOT: Analytics screen with section headers and Export buttons callouts -->

---

## 9. Notifications

Open the **bell icon** or Notifications screen to see what the hardware did:

- **Normal** (gray/info) — routine events: charging started, fully charged, solar input changed, device came online.
- **Alert** (demands attention) — low battery (20% or below), unsafe depth of discharge, critical temperatures, stale or missing data, unsafe load while battery is low.

### Email, vibration, and reminder alerts

- **Email notifications** (Menu → Preferences, default **ON**) send alert-type events to your account email with AdlaWatt branding. Turning it off stops emails only — in-app notifications are always kept.
- **Reminders** (Menu → Preferences, default **ON**) are phone banners scheduled on-device: a daily evening review nudge and a next-morning advisory when the forecast shows a low-sun stretch. They work fully offline and need no account or server.
- **Vibration** (Menu → Preferences, default **ON**) buzzes in a gentle pattern while unread alerts exist, and stops when you read them, when nothing is unread, or when you sign out.

### Managing the list

Filter by **type** (All / Normal / Alert) and **time** (All, Last Hour, Today, This Week, This Year). Tap a notification to mark it read, or use **Mark all as read**. The bell badge counts unread items. Pages navigate with Prev / Next.

**Not receiving emails?** Check spam, confirm the address in your profile, confirm Email Notifications is ON, and confirm the event was an *alert* (normal events never email).

<!-- SCREENSHOT: Notifications list with filter and mark-read callouts -->

---

## 10. Activity Logs

Activity Logs record **what you did** (sign-ins, electronics changes, settings updates) — not what the hardware did. That separation is deliberate: hardware events live in Notifications.

Filter by **type** (Info, Warning, Error, Critical) and **time range**, and page with Prev / Next. The Dashboard shows a recent-activity preview with a **View All** link to this screen.

---

## 11. Components: Checking System Health

The **Components** screen lists the IoT and power parts (ESP32 controller, solar/load sensors, battery and solar temperature sensors, interior sensor, voltage sensor, relay, display, cooling fan, buck converter) with live **Active / Inactive** status and photos.

Use it to answer "is the unit itself healthy?" If the Dashboard shows Offline but your phone has internet, check here: an Inactive controller or sensor points to a hardware-side problem (power, wiring, or Wi-Fi at the unit) rather than an app problem.

<!-- SCREENSHOT: Components grid with status callouts -->

---

## 12. Menu: Profile and Preferences

Open the **Menu** tab. Changes here are staged as drafts — **Save** applies them, **Cancel** discards them.

### Account Profile

- **Username and email** — edit, then enter your **current password** to confirm and tap Submit. Changing the email sends a confirmation to the new address.
- **Password** — enter the current password plus the new password twice.
- **Log Out** — asks for confirmation first. On shared phones, always log out.

### Preferences

- **Theme** — System, Light, or Dark (applies instantly across the app).
- **Color Blind Mode** — adjusts colors for readability (resets each session).
- **Font Size** — Small, Medium, or Big. **Font Family** — Inter, Roboto, Times New Roman, Monospace, or System Default.
- **Language** — English, Filipino, or Cebuano (screen labels; this manual stays English).
- **Vibration** — on/off for alert buzzes (saved).
- **Email Notifications** — global on/off for alert emails (saved, default ON).

Theme, fonts, language, vibration, and the email toggle survive restarts and hold their last saved values offline. Color-blind mode resets each session; live data always needs an active connection.

<!-- SCREENSHOT: Menu preferences with Save/Cancel callouts -->

---

## 13. Troubleshooting and FAQs

**Dashboard data is frozen or the device shows Offline.**
First look for the offline banner: if your *phone* has no connection, the Dashboard shows your last readings with their time — reconnect and it goes live by itself. If the phone is online but the device reads Offline, the unit has likely lost Wi-Fi or power — confirm the unit is powered and within Wi-Fi range, then wait a few minutes for it to reconnect. A *Monitoring Data Stale* alert (fires after 60 seconds without fresh data) confirms the app side is working and the unit side is silent.

**My electronics item says Not advisable but I need it.**
That badge means the battery cannot safely cover it right now (low charge, over the safe draw limit, or too costly per hour). Options: recharge via solar, switch to a lighter electronics item, or run it briefly and watch the battery gauge. Do not repeatedly override the warning below 20%.

**I never got the confirmation / recovery / alert email.**
Check spam, verify the address in Menu → Account Profile, and respect the resend throttle (wait ~1 minute). Only *alert*-type events send emails — routine events never do. If Email Notifications is OFF, turn it ON.

**Photo upload fails.**
The picker is library-only (5 MB max). "Over 5 MB" means pick a smaller image or screenshot; "needs photo access" means allow access in device Settings and retry.

**Export fails or produces nothing.**
Exports need history in the selected range — widen the dates. On phones, the share sheet needs a few seconds for large ranges (buttons show Exporting...). On web, check the browser's download bar and popup blocker.

**Login keeps failing.**
Confirm the email verification is done, check caps lock, and note that too many rapid attempts briefly lock sign-in. Use **Forgot Password?** if unsure about the password rather than guessing repeatedly.

**Who do I contact?**
This manual covers app operation. For hardware faults (damaged panel, enclosure, outlet) or account issues you cannot resolve above, contact the AdlaWatt research team at Northern Bukidnon State College — see the **About Us** screen in the app.

---

## 14. Glossary

- **State of charge (SoC)** — battery level as a percentage (0–100%).
- **Depth of discharge (DoD)** — how much of the battery has been used; *Unsafe* means past the healthy limit.
- **Watt-hour (Wh)** — energy unit. Your battery holds 756 Wh total; 151.2 Wh is locked as reserve, leaving 604.8 Wh usable.
- **Reserve floor** — the protected 20% (151.2 Wh) the app never counts as spendable.
- **Load** — the combined wattage your connected electronics draw right now.
- **Solar input / solar status** — incoming panel watts, rated Low / Moderate / High.
- **Time remaining** — estimated runtime at the current load (e.g. `7h 45m`).
- **ESP32** — the unit's microcontroller that reads sensors and uploads data over Wi-Fi.
- **Real-time updates** — the app streams database changes live; no pull-to-refresh needed while online.
- **Normal vs Alert** — notification severities: informational vs needs-attention (alerts also email and vibrate).
- **Activity log** — record of your actions, separate from hardware notifications.

---

## 15. Safety, Limits, and Support

- **Backup only.** AdlaWatt carries you through interruptions; it does not replace grid power. The 1000 W inverter sets the ceiling — never exceed it.
- **Sunlight dependent.** Charging follows the sun; plan heavy use for high-outlook days (see the 5-day outlook).
- **Heat matters.** Treat *High* temperatures as a warning and *Critical* as stop-and-inspect (when safe).
- **Internet required.** Monitoring, notifications, and email all need connectivity on both the phone and the unit.
- **Prototype.** This is a research capstone system, not a commercial product. Report problems to the team so they become thesis data.
- **About the project.** The **About Us** screen in the app describes the team's mission, the developers, and contact details.

---

*End of manual. If a screen in the app disagrees with these steps, the app is newer than this document — follow the app and report the mismatch to the team.*
