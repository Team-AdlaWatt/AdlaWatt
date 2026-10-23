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
  - Public `appliance-images` bucket (per-user write scope) + `appliances.image_url` column
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
