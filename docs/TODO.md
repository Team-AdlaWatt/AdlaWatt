# AdlaWatt — To Do

## First Page

- [x] Login: Add Continue with Google / OAuth — **Resolved**
  - Official multicolor Google G icon (`GoogleGIcon.tsx`) on login + register
  - `signInWithGoogle()` in `auth.ts` (web redirect + native auth-session with PKCE code exchange)
  - Supabase Google provider enabled; client forces `flowType: 'pkce'`
  - Callback handles implicit-hash fallback, live-session check, Google-specific header/copy
- [x] Login: Add Forgot Password — **Resolved**
  - Recovery links land directly on `/auth/forgot-password` and verify in-screen (no callback UI)
  - Verified card morphs: success message + Continue to Account, opt-in password-change expander
  - Signed-in bounce exemption while a recovery link verifies
- [x] Login: Password visibility should only be available for 5 seconds — **Resolved**
  - `PasswordInput` eye toggle with 5s auto-hide, live countdown, timer bar, screen-reader labels
- [x] Overall: Display only the toggle that has content — **Resolved**
  - Electronics status filter renders only segments holding electronics (Caution → Advisable → Not Advisable auto-pick)
  - Empty active segment auto-corrects on add/archive/delete/battery verdict shifts
  - Empty electronics list keeps all three segments on Advisable
  - Example: If there are no advisable devices, display the default toggle for Not Advisable Devices
- [x] Navbar Upper: Display username — **Resolved**
  - Username slot in `Navbar.tsx` with profile-username + auth-fallback so it never renders empty
- [x] Electronics: Add image upload inside the Custom Electronics box with a media picker modal — **Resolved**
  - Public `appliance-images` bucket (per-user write scope) + `electronics.image_url` column
  - Library-only `MediaPickerModal` on the system `DropdownModal` shell (square crop, 5MB validation, permission-denied copy)
  - Photo preview in Add/Edit custom form (adlawatt icon stays the default for every custom); upload on save, orphan cleanup on replace/remove/delete
  - Box 3-dot camera button wired to the same picker; photos thread to modal list, dashboard list, and recommendation card
- [ ] Analytics: Battery band upgrade (avg + min/max lines + unsafe red dots)
  - Note: Critical — 17 charts already wired; this is the remaining gap per `analytics_charts.md`
- [x] Preferences: Add phone vibration for alert notifications — **Resolved**
  - Safe buzz-pause rhythm (400ms buzz / 2s rest; iOS re-buzz interval) that cannot escalate or overheat the motor
  - Buzz starts on unread alerts (mount check + realtime inserts) and stops only on mark-as-read, zero unread, toggle OFF, or sign-out
  - Menu Vibration row now persisted (default ON) instead of dead local state
- [x] Preferences: Add multi-language display — **Resolved**
  - EN/FIL/CEB locales with picker + persistence (`adlawatt.language.v1`); spot-verified zero hardcoded display strings across all 7 dashboard screens
- [x] User Manual: Add manual contents inside its screen — **Resolved (EN content)**
  - 15 sections in `user-manual.tsx` with section cards, quick-jump chips, callouts, AppLogo, Figure 1–8 slots
  - Remaining: screenshot capture, Filipino/Cebuano translation pass

## Second Page

- [ ] Account Profile: Maintain a fixed height when the Update button is clicked
- [ ] Account Profile: Remove the black border from the password field

## PROJECT NOTES

### 1. HARDWARE SIDE - DISPLAY

#### 1.1 Welcome Screen

- [ ] Display a welcome message.
- [ ] Show a QR code to download or open the mobile application.

#### 1.2 User Registration and Login

- [ ] Register an account through the mobile application.
- [ ] Log in using a PIN.

#### 1.3 Main Dashboard

- [ ] Display battery percentage (%).
- [ ] Display solar voltage (V).
- [ ] Display solar power (W).
- [ ] Display available load watts (W).
- [ ] Display consumed watts (W).

#### 1.4 Wi-Fi Status

- [ ] Display whether Wi-Fi is connected or offline.
- [ ] When online, send monitoring data to the database.
- [ ] When offline, store monitoring data locally on the SD card.
- [ ] Automatically synchronize stored data once Wi-Fi reconnects.

#### 1.5 Wi-Fi Connection

- [ ] Provide a Connect to Wi-Fi option on the display.

### 2. SYSTEM SIDE - USER SUGGESTIONS

**Planning note:** This pass verifies current implementation and defines the design direction only. No code, database, locale, build, commit, push, or OTA changes are included.

#### 2.1 Automatic Appliance Monitoring

**Verified: Partial** — System-level load, voltage, Wh, and runtime calculations exist, but wattage is supplied from catalog/custom nameplate values. There is no per-appliance detection or measured per-appliance consumption.

- [ ] Detect or measure the wattage of connected appliances.
- [ ] Display appliance power consumption.
- [ ] Estimate how long an appliance can operate based on available battery capacity.
  - [ ] Label the current capability as catalog/nameplate-based monitoring until per-device telemetry exists.
  - [ ] Show aggregate measured system load separately from catalog appliance watt ratings.
  - [ ] Surface the engine's runtime estimate in the recommendation result, not only in system ETR.

#### 2.2 Manual Appliance Selection

**Verified: Partial** — Appliance selection and persistence work, but combined wattage is not shown as a selection result.

- [ ] Allow users to select appliances from the mobile application.
- [ ] Allow users to select any number of appliances.
- [ ] Calculate the combined wattage of the selected appliances.
  - [ ] Allow unlimited selected appliances in toggle, Select All, and save flows.
  - [ ] Show a live `N selected` counter and total watts in the selection modal.
  - [ ] Reuse `ElectronicsBox` and `ElectronicsModal` semantics instead of adding a new selection component.

#### 2.3 Recommendation Results

**Verified: Partial** — Advisability verdicts are wired into Dashboard and Electronics, but total watts, operating time in hours/minutes, estimated remaining battery percentage, and alternatives are not displayed.

- [ ] Show whether the selected appliances are advisable to use.
- [ ] Display the total power consumption of the selected appliances.
- [ ] Estimate operating time in hours and minutes.
- [ ] Show the estimated remaining battery percentage.
- [ ] Suggest alternative appliances if the selected appliances are not advisable.
  - [ ] Add one shared `evaluateSelection(battery, selectedElectronics[])` result consumed by both Dashboard and Electronics.
  - [ ] Surface combined typical/peak watts, `displayRuntime`, projected remaining battery percentage, and ranked alternatives.
  - [ ] Replace optimistic no-data fallbacks with an explicit waiting-for-battery-data state.

#### 2.4 Main Purpose

**Verified: Partial** — Safety guards exist in the recommendation engine and alerts, but several are not wired into the user-facing result and are not testable as a single product goal.

- [ ] Help users determine which appliances they can operate.
- [ ] Prevent excessive power consumption.
- [ ] Maximize battery usage and efficiency.
  - [ ] Apply reserve floor, charge-scaled watt cap, projected voltage, stale-data fail-safe, and current-load checks to the whole selected set.
  - [ ] Add tests for unlimited selection, no-data state, combined evaluator, and alternative suggestions.
  - [ ] Keep the exact verdict labels so the result remains consistent across screens.

#### 2.5 Design Alignment Contract

- [ ] Reuse `AppText`, `SlidingToggle`, `ElectronicsBox`, `ElectronicsStatusBox`, `EmptyState`, `ErrorState`, and `AppButton` instead of introducing new components.
- [ ] Use `useAppColors()` tokens only: `primary`, `warning`, `error`, `surface`, `cardBorder`, `text`, `textSecondary`, `selectedWash`, and `glass.white`.
- [ ] Keep the exact verdict vocabulary: `OK to use`, `Use with care`, `Not advisable`; segments remain `Advisable`, `Caution`, `Not Advisable`.
- [ ] Keep the existing card structure: bordered shell, themed header, segmented toggle, status grid, then empty/error states.
- [ ] Keep status signaled by icon plus text plus color; never color alone.
- [ ] Hide empty segments and render only groups that contain appliances.
- [ ] Follow `docs/UI-STANDARDS.md`: 4/8 spacing grid, card padding 16, radius 16, section gap 24, left-aligned labels, and right-aligned numeric values.
- [ ] Use the existing reduced-motion-aware `SlidingToggle` behavior; do not add a new carousel or custom animation.

#### 2.6 System-Side UI Concept (Text)

```txt
DASHBOARD / ELECTRONICS SCREEN
ScreenContainer2
  NavBar
    PullRefreshScroll
      AppText heading: "Electronics Recommendation"
      AppText caption: "Monitor your AdlaWatt system in real time."

      Card shell
        tokens: surface + cardBorder + glass.white
        radius/spacing: UI-STANDARDS card rhythm

        SlidingToggle
          Advisable | Caution | Not Advisable
          only non-empty segments rendered

        Status area
          ElectronicsStatusBox / AppRecCard status boxes
          OK to use      -> primary + checkmark icon
          Use with care  -> warning + warning icon
          Not advisable  -> error + alert icon + text label

          [app appliance box]
          Name
          Watt range: 40-60 W
          Status label + icon

        EmptyState / ErrorState
          No Advisable Electronics
          Waiting for battery data
```

```txt
SELECTION MODAL
DropdownModal / ElectronicsModal shell
  themed header + 48px close
  AppText body: "Battery: 72%  |  Usable: 518 Wh"
  AppText caption: "Select appliances."

  selection counter: N selected
  [x] Fan          40 W
  [x] TV           120 W
  [ ] Rice cooker  800 W

  sticky footer
    Select All | Reset | Add / Save
```

```txt
RESULT PANEL
Card shell
  header: Electronics Recommendation

  badge: Use with care
  reason: Peak draw may approach the safe cap.

  AppText body: "Total power: 160 W typical / 240 W peak"
  AppText body: "Estimated operating time: 2h 05m"
  AppText body: "Estimated battery after 1h: 54%"

  AppText caption: "Suggested alternatives"
  [Fan 40 W]  [LED bulb 12 W]

  AppButton: Adjust Selection
  AppButton: Save Selection
```
