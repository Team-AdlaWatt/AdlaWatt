# AdlaWatt — Known Issues

A short record of the problems we found and fixed recently, written in plain
language so anyone on the team can follow them.

> Repo: https://github.com/Team-AdlaWatt/AdlaWatt

---

## How to Title an Issue

Start the title with a type so issues are easy to filter:

* `[Bug] Short description of the problem`
* `bug(area): short description of the problem`

| Type | Use it for |
| --- | --- |
| `bug` / `fix` | Something broken or behaving oddly |
| `feat` | A request for something new |
| `docs` | Documentation changes or typos |
| `refactor` / `chore` | Cleanup and behind-the-scenes work |

Examples:

* `[Bug] Yellow background in login input fields`
* `[Feat] Add a dark mode toggle to the navigation bar`

---

## Issue Template

Copy this into a new GitHub issue:

```markdown
## Summary
A brief description of the issue.

## Steps to Reproduce
1. Go to '...'
2. Tap on '...'
3. Type in '...'
4. See what happens.

## Expected Behavior
What should have happened.

## Actual Behavior
What actually happened.

## Screenshots / Code Snippets
Attach screenshots, GIFs, or logs if you have them.

## Environment
- **OS:** [e.g. Windows 11, Android 14, iOS 17]
- **Browser:** [e.g. Chrome, Safari]
- **App Version:** [e.g. v1.0.0]
- **Device:** [e.g. Desktop, Android phone]
```

---

## Issues

### 1. The report buttons seemed broken

**Summary**
On the Analytics screen, tapping the buttons to download a report did nothing.
No message, no error, no file — so the buttons looked dead. The app was trying
to show its message in a way that only works on phones, not on the web version,
and if there was no data to export it stayed completely silent.

**Steps to Reproduce**
1. Open the Analytics screen.
2. Pick a time range with no data (or make the export fail).
3. Tap the report or export button.

**Expected Behavior**
A message appears telling you what happened — success, "no data", or an error.

**Actual Behavior**
Nothing happened at all. The button appeared to be broken.

**Environment**
- **Device:** Android and web browser
- **App Version:** v1.0.0

**Fixed:** The app now shows a small message on screen instead of a phone-only
popup, reports real errors, and limits how much it exports so it can't freeze.

---

### 2. The app slowed down or crashed on older phones

**Summary**
On lower-end Android phones, the Analytics screen could become unresponsive or
crash. The app was loading a full year of data and all of its charts at once,
which is far more than such phones can handle smoothly. Taps seemed to be
ignored while this was happening.

**Steps to Reproduce**
1. Open the app on a lower-end Android phone.
2. Go to the Analytics screen.
3. Scroll and tap around, or try to export.

**Expected Behavior**
The screen stays smooth and responds to taps. The app does not crash.

**Actual Behavior**
The screen froze, taps did nothing, and the app sometimes closed itself.

**Environment**
- **Device:** Lower-end Android phone
- **App Version:** v1.0.0

**Fixed:** The screen now starts with the last 30 days instead of a full year,
with quick buttons for 7 days / 30 days / 90 days / 1 year. Charts load only as
you scroll to them, and exports are capped in size.

---

### 3. Login fields turned yellow in dark mode

**Summary**
In dark mode, when the phone or browser filled in your saved login details, the
username and password boxes turned yellow. That color came from the browser or
phone, not from our design.

**Steps to Reproduce**
1. Turn on dark mode.
2. Open the login screen.
3. Let your browser or phone autofill your saved details.

**Expected Behavior**
The fields keep our normal dark colors.

**Actual Behavior**
The fields showed a bright yellow background.

**Environment**
- **Device:** Android and web browser (Chrome)
- **App Version:** v1.0.0

**Fixed:** The fields keep our colors when autofilled.
**Note:** To stop the yellow on Android we also turned off the phone's autofill
on those fields. If we'd rather keep autofill, we can undo that part and keep the
web fix only.

---

### 4. The keyboard covered the fields when adding an appliance

**Summary**
In the "add custom appliance" form, the keyboard sat on top of the name and
wattage fields. You couldn't see what you were typing.

**Steps to Reproduce**
1. Open the add/edit custom appliance form.
2. Tap the name field, or the min/max wattage fields.
3. Start typing.

**Expected Behavior**
The field you're typing in stays visible above the keyboard.

**Actual Behavior**
The keyboard covered the field.

**Environment**
- **Device:** Android and iPhone
- **App Version:** v1.0.0

**Fixed:** The popup now shifts and scrolls out of the keyboard's way, so the
field you're typing in stays visible. Buttons also respond on the first tap.

---

### 5. Downloaded reports didn't match the app

**Summary**
The CSV and PDF reports showed different numbers and columns than the monitoring
history table and the Analytics screen. Some columns were missing, the numbers
weren't grouped the same way as the charts, and the two PDF versions didn't even
match each other.

**Steps to Reproduce**
1. Open the Analytics screen and note the numbers.
2. Download the CSV and both PDFs.
3. Compare them with each other and with the Analytics screen.

**Expected Behavior**
Every report matches the app and shows the same numbers, grouped the same way.

**Actual Behavior**
The reports disagreed with each other and with the screen.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** All reports now use the same numbers and groupings as the Analytics
screen. The CSV includes every column from the history table, and the PDFs show a
short, readable summary.

---

### 6. The User Manual's figures were empty boxes

**Summary**
Every section of the User Manual pointed at a picture — "Figure 1", "Figure 2", and
so on — but the boxes were empty and nothing could be tapped. You had to leave the
manual, find the screen yourself, and hope it still looked the same.

**Steps to Reproduce**
1. Open Menu, then User Manual.
2. Scroll to any section that mentions a figure.
3. Tap the figure box.

**Expected Behavior**
The figure shows the screen it describes, or takes you straight to it.

**Actual Behavior**
An empty, labeled box. Nothing to see, nothing to tap.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Each figure is now a green "Open Dashboard" / "Open Appliances" / "Open
Analytics" button that opens the real screen with live data. Generate Report,
Notifications, Components, and Menu got one too, and Activity Logs — which had
nothing — now has one as well.
**Note:** We tried real screenshots first, then dropped them: they go out of date the
moment a screen changes. The Register and Sign In sections now explain the steps in
words, since the app sends signed-in users away from those screens anyway.

---

### 7. The Generate Report button stopped short and felt slow

**Summary**
On the Analytics screen, the quick button that should jump to the report panel
scrolled down but stopped before the end, so you still had to scroll the rest of the
way yourself. The slide also took a slow 1.5 seconds, and it aimed at the top of the
panel instead of the end of the page.

**Steps to Reproduce**
1. Open the Analytics screen.
2. Tap the Generate Report button near the top.
3. Wait for the scroll to stop.

**Expected Behavior**
You land at the very end of the page in a fraction of a second, with the report panel
in view.

**Actual Behavior**
The scroll ended above the bottom, leaving the panel off screen.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** The jump now takes 0.4 seconds and lands exactly at the bottom. It works
out the position from the page's real length minus the screen height instead of
measuring the panel's top edge, so it can't stop short, and it stops instantly if you
touch the screen while it is moving.

---

### 8. Charts loading mid-scroll changed the page length and broke the jump

**Summary**
Analytics draws its charts only when they come into view; until then each one is an
estimated placeholder. During a quick jump the scroll and the chart loading raced
each other, so by the time the scroll settled the page had grown and the spot it had
aimed at was no longer the bottom. The same button could land in a different place
depending on what had already loaded.

**Steps to Reproduce**
1. Open the Analytics screen on a fresh start, before any chart has loaded.
2. Tap the Generate Report button.
3. Compare where the scroll stops with the real end of the page.

**Expected Behavior**
You end at the real end of the page, no matter when the charts finish loading.

**Actual Behavior**
The page grew after the scroll settled, leaving you above the bottom.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** While a jump is running, the screen now tracks the page's real height and
follows the end as placeholders turn into real charts (for up to two seconds), so the
final position is the true bottom. Any future "jump to section" button on this screen
benefits too, because chart loading is what made the old position calculations
unreliable.

---

### 9. Opening the report from the manual landed at the top of Analytics

**Summary**
The manual's Generate Report button took you to the Analytics screen but at the very
top, so you still had to find the report panel yourself. The button promised a
shortcut and delivered the long way around.

**Steps to Reproduce**
1. Open Menu, then User Manual.
2. Under Analytics, tap Open Generate Report.
3. Look at where the Analytics screen opens.

**Expected Behavior**
Analytics opens with the report panel already in view.

**Actual Behavior**
Analytics opened at the top of the page.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** The manual's button now tells Analytics to open at the report panel, so it
arrives at the end of the page with nothing left to scroll.

---

### 10. The app carried half a megabyte of screenshots nothing displayed

**Summary**
While reviewing the manual change we found nine screenshots (508 KB in total) still
bundled with the app after the manual had switched to live buttons. Nothing
referenced them, so every install was paying for images no one could ever see.

**Steps to Reproduce**
1. List the manual images in `assets/images/manual`.
2. Search the code for anything that uses them.
3. Check what the manual actually shows.

**Expected Behavior**
The app ships only the images it displays.

**Actual Behavior**
Nine unused images were bundled — about half a megabyte.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** All nine screenshots were removed, so the manual now ships no images at
all.

---

### 11. [Chore] The battery capacity reference was 720 Wh, now 756 Wh

**Summary**
The battery bank is rated 756 Wh (12.6 V × 60 Ah), but the app still described a
720 Wh pack with a 144 Wh reserve and 576 Wh usable. Because the appliance
recommendation engine reads the battery's energy, every label, limit, and
recommendation was built on the older 720 Wh figure.

**Steps to Reproduce**
1. Open the Appliances screen and add an appliance, or open Menu, then User Manual.
2. Look at the battery capacity and reserve figures shown.
3. Compare them with the battery datasheet (756 Wh, 20% reserve = 151.2 Wh).

**Expected Behavior**
The app shows 756 Wh total, a 151.2 Wh reserve, and 604.8 Wh usable, and the
recommendations and wattage limits follow those numbers.

**Actual Behavior**
The app used 720 Wh / 144 Wh / 576 Wh and capped appliance wattage at 720 W.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Updated the recommendation engine (`BATTERY_NOMINAL_WH` 756, `RESERVE_WH`
151.2), the battery gauge ceiling (756 Wh) and low threshold (151.2 Wh), the
appliance wattage cap (756 W), the in-app advisory and User Manual, and the
README / implementation-plan docs, including the 1% SoC table recomputed as
756 × SoC ÷ 100. The capacity, reserve, and usable figures now come from a
single source of truth (`src/constants/battery.ts`) shared by the engine, the
battery gauge, and the appliance modals — 756 is the basis, the old 720 value is
gone.
**Note:** The ESP32 firmware must also report `watt_hours` on the 756 Wh scale
before recommendations reflect the new capacity — still to do on the hardware side.

---

### 12. Account verification via Supabase auth fails

**Summary**
After creating an account, the email verification link opened
`http://localhost:3000`, which cannot be reached from a phone. Verification
never completed because the link pointed at a development address instead of
the app.

**Steps to Reproduce**
1. Register a new account.
2. Open the confirmation email on the phone.
3. Tap the verification link.

**Expected Behavior**
The link verifies the account and hands the user back to the app.

**Actual Behavior**
The browser showed "localhost:3000 refused to connect" / the page was not
reachable, and the account stayed unverified.

**Environment**
- **Device:** Android and iOS phone
- **Browser:** Brave (default)
- **App Version:** v1.0.0

**Fixed:** The app now sends an app-specific redirect
(`adlawatt://auth/callback`) on sign-up and resend, and the Supabase project's
Site URL + Redirect URLs were set to the app's deep links, so the link no
longer falls back to `localhost`. Email confirmation is back on: sign-up shows
the "check your email" dialog, the confirmation template carries
`{{ .ConfirmationURL }}` with `redirect_to=adlawatt://auth/callback`, and the
link verifies on Supabase, reopens the app, and is exchanged on `/auth/callback`
before the layout routes to the dashboard.

---

### 13. Create-account password labels incorrectly said "New"

**Summary**
On the create-account screen the two password fields were labeled "New
Password" and "Confirm New Password". A brand-new user has no existing
password, so calling it "new" is confusing and wrong.

**Steps to Reproduce**
1. Open the create-account screen.
2. Look at the two password field labels.

**Expected Behavior**
The labels read "Password" and "Confirm Password".

**Actual Behavior**
The labels read "New Password" and "Confirm New Password".

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** The create-account fields now use the plain "Password" label and a
new "Confirm Password" label (`labelConfirmPassword`). The reset and
change-password flows keep the correct "new password" wording, added in
English, Filipino, and Cebuano.

---

### 14. Create-account confirm-password placeholder was wrong

**Summary**
The confirm-password field on the create-account screen did not show its
intended hint. It fell back to generic text because its translation key was
missing from every language file.

**Steps to Reproduce**
1. Open the create-account screen.
2. Tap into the confirm-password field and read the placeholder.

**Expected Behavior**
The field shows "Enter password to confirm".

**Actual Behavior**
The field showed a fallback/generic placeholder instead of the intended hint.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Added the missing `passwordInput.placeholderConfirmNewPassword`
string ("Enter password to confirm") in English, Filipino, and Cebuano, so the
field no longer falls back.

---

### 15. Reset password via Supabase auth fails

**Summary**
Requesting a password reset sent a recovery email whose link opened
`http://localhost:3000`, which is unreachable from a phone, so the password
could never be reset.

**Steps to Reproduce**
1. Open the sign-in screen and choose "Forgot password".
2. Enter the account email and send the recovery email.
3. Open the email and tap the reset link.

**Expected Behavior**
The link opens the in-app reset screen where the user can set a new password.

**Actual Behavior**
The browser showed a `localhost` page that could not be found.

**Environment**
- **Device:** Android and iOS phone
- **App Version:** v1.0.0

**Fixed:** Recovery links now target `adlawatt://auth/forgot-password` (via a
shared redirect helper) and that URL is allowlisted in the Supabase project,
so the link returns to the app instead of `localhost`.

---

### 16. Login with Google fails

**Summary**
Signing in with Google ended at `http://localhost:3000`, which is unreachable
from a phone, so the user never got back into the app.

**Steps to Reproduce**
1. Open the sign-in screen.
2. Tap "Continue with Google" and pick an account.

**Expected Behavior**
Google returns the user to the app and signs them in.

**Actual Behavior**
The browser ended on a `localhost` page that could not be found.

**Environment**
- **Device:** Android and iOS phone
- **Browser:** Brave (default)
- **App Version:** v1.0.0

**Fixed:** Google sign-in now passes `adlawatt://auth/callback` as the
redirect, that URL is allowlisted in the Supabase project, and Google is
enabled as a provider — so OAuth returns to the app.
**Note:** The Google Cloud OAuth client must list
`https://nxdabgvbwunyeffzrzta.supabase.co/auth/v1/callback` as an authorized
redirect URI for the browser hand-off to complete.

---

## Still To Do

- Update the ESP32 firmware so watt_hours is reported on the 756 Wh scale.
- Small pre-existing warning in the code cleanup (not related to these fixes).
