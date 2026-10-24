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

### 4. The keyboard covered the fields when adding an electronics item

**Summary**
In the "add custom electronics" form, the keyboard sat on top of the name and
wattage fields. You couldn't see what you were typing.

**Steps to Reproduce**
1. Open the add/edit custom electronics form.
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

**Fixed:** Each figure is now a green "Open Dashboard" / "Open Electronics" / "Open
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
720 Wh pack with a 144 Wh reserve and 576 Wh usable. Because the electronics
recommendation engine reads the battery's energy, every label, limit, and
recommendation was built on the older 720 Wh figure.

**Steps to Reproduce**
1. Open the Electronics screen and add an electronics item, or open Menu, then User Manual.
2. Look at the battery capacity and reserve figures shown.
3. Compare them with the battery datasheet (756 Wh, 20% reserve = 151.2 Wh).

**Expected Behavior**
The app shows 756 Wh total, a 151.2 Wh reserve, and 604.8 Wh usable, and the
recommendations and wattage limits follow those numbers.

**Actual Behavior**
The app used 720 Wh / 144 Wh / 576 Wh and capped electronics wattage at 720 W.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Updated the recommendation engine (`BATTERY_NOMINAL_WH` 756, `RESERVE_WH`
151.2), the battery gauge ceiling (756 Wh) and low threshold (151.2 Wh), the
electronics wattage cap (756 W), the in-app advisory and User Manual, and the
README / implementation-plan docs, including the 1% SoC table recomputed as
756 × SoC ÷ 100. The capacity, reserve, and usable figures now come from a
single source of truth (`src/constants/battery.ts`) shared by the engine, the
battery gauge, and the electronics modals — 756 is the basis, the old 720 value is
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

### 17. [Bug] Empty electronics loading state stretched the panel

**Summary**
When the electronics picker had nothing to show while loading or after a search
returned no matches, the empty/loading state grew far taller than intended. Its
style used a minimum height, so it inherited the shared `EmptyState` component's
base `height: "90%"` and stretched to most of the modal.

**Steps to Reproduce**
1. Open the dashboard and open the electronics picker.
2. Search for an item with no results, or open the picker while the list is
   still loading.
3. Look at the empty/loading panel.

**Expected Behavior**
The empty/loading state keeps a compact, fixed height, and the rest of the
picker stays in place.

**Actual Behavior**
The empty state stretched to about 90% of the modal, leaving a tall blank area
and making the picker look broken.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** The picker's custom state now uses `height: 234` instead of
`minHeight: 234`, overriding `EmptyState`'s base height so the empty and
loading states stay compact.

---

### 18. feat(weather): improve location tracking and add sample coordinates

**Summary**
The Today weather card did not always follow the device's actual location. It
used a curated city-center list, could reuse a recent GPS fix, and quietly fell
back to a fixed point when location was unavailable, so the card could show
another area's weather or keep stale readings. We added sample coordinates for
testing and early fallback behavior, then improved the flow to rely on a live,
high-accuracy GPS fix.

**Steps to Reproduce**
1. Open the dashboard with location services off, or move to a different area
   while the app is open.
2. Wait for the Today card to refresh, or tap its refresh control.
3. Compare the displayed weather and location with the device's actual position.

**Expected Behavior**
The card uses the device's current location, refreshes when the user moves or
returns to the app, and explains when location is unavailable instead of showing
weather from somewhere else.

**Actual Behavior**
The app could snap to a configured city center, reuse an older fix, or silently
use fallback coordinates, so the reading did not always match where the user was.

**Environment**
- **Device:** Android and iPhone
- **App Version:** v1.0.0

**Fixed:** Today weather now requests a fresh high-accuracy GPS fix, rounds
coordinates to four decimals (about 11 m), and detects movement of 1 km or more.
The app refreshes the weather when it returns to the foreground. The sample
coordinates and curated city list used during development were removed; denied
permission, disabled location services, or a failed fix now show an explicit
location error with a retry path instead of putting another point's weather on
the card.

---

### 19. refactor(database): rename the Appliances table to Electronics

**Summary**
The database table was renamed from `public.appliances` to `public.electronics`,
and its `appliance_name` column became `electronics_name`. The app was still
querying the old names, so the Electronics screen would break after the rename.

**Steps to Reproduce**
1. Apply the database rename.
2. Open the Electronics screen and load, add, edit, or archive an item.

**Expected Behavior**
Every read and write targets `public.electronics` and `electronics_name`.

**Actual Behavior**
Queries still used `public.appliances` and `appliance_name`, so they failed
against the renamed table.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Updated all 12 `.from("appliances")` queries to
`.from("electronics")` and replaced `appliance_name` in select lists, ordering,
search clauses, insert payloads, and row types. The migration
`20261022000000_rename_appliances_to_electronics.sql` renames the table and
column and repairs the stored function bodies. Legacy RPC names
(`archive_appliance`, `unarchive_appliance`, `save_appliance_selection`,
`reset_appliance_selection`), the `appliance-images` storage bucket, and the
`"Appliance not found."` database message were left unchanged on purpose.

---

### 20. feat(navigation): add a scroll-to-top button above the lower navbar

**Summary**
Long household screens had no quick way back to the top after scrolling down.
Users had to swipe repeatedly or drag the scrollbar, which was awkward on
phones, especially on Analytics, Components, and Activity Logs.

**Steps to Reproduce**
1. Open a long screen such as Analytics or Activity Logs.
2. Scroll down past the first screenful of content.
3. Look for a control that returns to the top.

**Expected Behavior**
A clear scroll-to-top button appears above the lower navigation bar and returns
the screen to the top when tapped.

**Actual Behavior**
There was no shortcut, so the user had to scroll all the way back up manually.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Added a reusable 48x48 round button on the dashboard, Electronics,
Analytics, Components, Activity Logs, Notifications, and User Manual screens,
plus the electronics picker modal. It appears after 50% of the scroll range and
hides below 45% to avoid flicker, respects reduced-motion settings, uses a
translated accessibility label, and sits 16 px above the lower navbar or footer
with no shadow.

---

### 21. refactor(copy): rename Appliances to Electronics throughout the app

**Summary**
The app still called the household items "Appliances" in menus, headings,
buttons, messages, routes, files, and translations, even though the product
language had moved to "Electronics."

**Steps to Reproduce**
1. Open the lower navigation and the dashboard.
2. Visit the Electronics screen, recommendation card, activity logs, and user
   manual.
3. Read the labels and messages.

**Expected Behavior**
The app consistently says "Electronics" in every screen and language.

**Actual Behavior**
The screens mixed "Appliances" and "Electronics," which made the feature feel
inconsistent and outdated.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Renamed the screen and route to Electronics, renamed the related
components, services, cards, hooks, types, and image assets, and updated the
English, Filipino, and Cebuano translations plus the user manual and
documentation. This is the app-facing rename; the database contract change is
covered separately in issue 19.

---

### 22. fix(components): refresh hardware names and remove unused components

**Summary**
The Components screen still showed older hardware names and images, including
"ESP32" and the retired "Voltage Sensor," and it carried component entries and
assets that were no longer used.

**Steps to Reproduce**
1. Open the Components screen.
2. Compare the listed hardware names and pictures with the actual unit.
3. Scroll through the list for components that are no longer part of the build.

**Expected Behavior**
The screen shows the current hardware names, matching images, and only the
components that are actually installed.

**Actual Behavior**
The board still appeared as "ESP32," the voltage sensor used the old name, and
some unused component assets remained in the project.

**Environment**
- **Device:** Android and iPhone
- **App Version:** v1.0.0

**Fixed:** The board now reads "ESP32-S3" with a matching image, the voltage
sensor now reads "INA219" with a matching image, and the migration
`20261021000000_rename_components_esp32s3_ina219.sql` updates existing rows in
one pass. The obsolete Voltage Sensor mapping and unused component assets were
removed, while the app still accepts the old "ESP32" row name until the
migration runs.

---

### 23. feat(auth): detect deleted accounts and show an on-screen message

**Summary**
Deleting a user in Supabase Authentication did not immediately sign them out in
the app. The stored session token stayed valid until it expired, so the
dashboard kept rendering a "ghost" account that only failed on the next server
write.

**Steps to Reproduce**
1. Sign in to the app on a phone.
2. Delete that account from Supabase Authentication while the app is open.
3. Return to the app or bring it back to the foreground.

**Expected Behavior**
The app notices the account is gone, stops using the session, shows an on-screen
message, and returns the user to the sign-in screen.

**Actual Behavior**
The dashboard stayed visible and the app kept acting as if the account still
existed until a server request failed.

**Environment**
- **Device:** Android and iPhone
- **App Version:** v1.0.0

**Fixed:** Added a session guard that checks on mount, every 15 seconds while the
app is active, and whenever the app returns to the foreground. It only treats
explicit server signals as a deleted account; offline, server errors, expired
tokens, and missing sessions stay "unknown" so a flaky connection cannot lock
anyone out. A confirmed deletion signs the user out right away and shows a
full-screen "Account Not Existing" message with a "Back to Sign In" button.

---

### 24. feat(onboarding): add a first-run walkthrough for new users

**Summary**
New users landed directly on the dashboard with no introduction to what AdlaWatt
does, what the main features are, or what the app is trying to protect. The
first session assumed knowledge the user had not been given yet.

**Steps to Reproduce**
1. Create a new household account.
2. Sign in for the first time.
3. Observe the first screen after authentication.

**Expected Behavior**
A short, skippable walkthrough introduces the app before the dashboard, and it
does not appear again once completed.

**Actual Behavior**
The app went straight to the dashboard with no introduction.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Added a five-slide swipeable onboarding panel covering welcome, what
AdlaWatt is, key features, goals, and a final confirmation. It includes a page
indicator, a Skip action on the first four slides, and a "Proceed to Dashboard"
button on the last slide. Both Skip and Proceed set `users.onboarding_completed`,
and routing from splash, login, register, and password recovery now sends
incomplete household accounts to onboarding. Admins are never routed there, the
copy is available in English, Filipino, and Cebuano, and tests cover the routing
rules.

---

### 25. feat(location): add sample coordinates for the location tracking

**Summary**
Location tracking relied entirely on the device's GPS/location services. When location permissions were denied, services were disabled, or in testing environments, there were no fallback coordinates. As a result, location-dependent features (like weather) failed to load or showed empty/error states without a sensible default.

**Steps to Reproduce**
1. Deny location permission on first launch, or disable location services.
2. Open the app and navigate to the Dashboard/Weather screen.
3. Observe how location-dependent data behaves.

**Expected Behavior**
When device location is unavailable or not permitted, the app should fall back to predefined sample coordinates for location tracking so that location-dependent features can still load with a reasonable default location.

**Actual Behavior**
No fallback coordinates existed. Location tracking failed and location-dependent features showed errors or remained empty with no default location applied.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Added sample coordinates for location tracking as a fallback. The app now uses these predefined coordinates when device location cannot be obtained, allowing location-dependent features to continue working in those scenarios.

---

### 26. chore: clean-up and organize the project folder

**Summary**
The repository root has accumulated many documentation and planning files. The goal is to tidy the structure by moving documentation into a root `docs/` folder while removing junk/unnecessary files that are no longer needed.

**Steps to Reproduce**
1. Browse the repository root.
2. Notice many `.md` files and planning folders mixed with config/source files.

**Expected Behavior**
Documentation lives under `docs/` for organization, `README.md` stays at root, and only necessary files remain. Unused/junk files are removed.

**Actual Behavior**
Documentation is scattered across the root and some folders with spaces exist alongside source/config files.

**Environment**
- **Device:** Any
- **App Version:** v1.0.0

**Fixed:** Created `docs/` at root and moved documentation files into it (keeping their content), kept `README.md` at root, removed junk/unnecessary files (e.g. temp/backups/duplicates) that are no longer needed. Verified no broken internal references.

---

### 27. fix(analytics): keep analytics chart card shells visible with placeholders while data loads

**Summary**
On first open of the Analytics screen, the chart card shells do not appear until the analytics data finishes loading. Because entire card lists are conditionally rendered or hidden behind loading guards, users see a mostly blank screen when scrolling down before `get_analytics_report` and `get_analytics_summary` return results.

**Steps to Reproduce**
1. Open the app and go to Dashboard > Analytics.
2. Load the screen on a fresh open or with a slower network.
3. Scroll down through the active tab before the data finishes fetching.
4. Observe that the chart cards are missing until the data loads.

**Expected Behavior**
All analytics chart card shells should render immediately on first load for the active tab, regardless of loading state. While waiting for data, each card should show a placeholder (e.g. "Waiting for graph and chart data...") inside it. Once the data arrives, the actual chart should render in place without layout shift.

**Actual Behavior**
Card shells are omitted during the initial fetch. The screen appears empty on first scroll and only shows the cards after data exists.

**Environment**
- **Device:** Android, iPhone, and web browser
- **App Version:** v1.0.0

**Fixed:** Render a fixed registry of chart cards per tab in `src/app/dashboard/analytics.tsx` unconditionally (no filtering by data presence). Move loading/empty states into `src/components/forms/AnalyticsChartCard.tsx` to display a waiting placeholder while loading and the correct "no data for this range" state when applicable. Prevent individual chart components from returning `null` on missing data, add `minHeight` to `AnalyticsChartCard` to reserve layout space, and remove any section-level early returns that hide entire card lists.

---

### 28. fix(ci): resolve test failures from request coalescing and in-memory cache

**Summary**
After adding request coalescing and in-memory caching for monitoring and weather refreshes, the CI Jest suite began failing due to cross-test pollution. The new singletons (`memoryCache` and the weather in-flight state) were persisting between tests, causing state leakage that broke existing test expectations.

**Failing Tests**
- `src/services/__tests__/todayWeather.test.ts`
  - "getWeather coordinates › rounds raw coordinates outside coverage"
  - "getWeather coordinates › a failed GPS fix throws location_unavailable"
- `src/services/__tests__/monitoringCache.test.ts`
  - "getMonitoringData write-through › error returns null without poisoning the cache"

**Steps to Reproduce**
1. Run the test suite after introducing the perf changes.
2. Observe failures in the above tests due to stale cached/in-flight state from previous tests.
3. CI exits with code 1.

**Expected Behavior**
Each test should run in isolation with a clean cache and in-flight state.

**Actual Behavior**
CI reported: 21 passed, 2 failed (23 suites total) and 308 passed, 14 failed (322 tests total). The failures were caused by shared cache/in-flight state leaking between tests, not production logic regressions.

**Environment**
- **CI:** GitHub Actions (Android Builds workflow)
- **Stack:** Expo 57, React Native, TypeScript, Jest

**Fixed:** Cleared `memoryCache` in the affected test `beforeEach` blocks and added `__clearInFlightTodayForTests()` to `src/services/weatherForecast.ts` to reset in-flight weather requests between tests. Test-only changes with no impact to production code paths or OTA.

---

### 29. fix(electronics): improve custom electronics modal keyboard handling and add name validation

**Summary**
The Add/Edit Custom Electronics modal has two issues: (1) when the on-screen keyboard opens, the action buttons (Cancel/Save) get pushed behind or hidden by the keyboard, and (2) there is no validation message like "Must be valid electronics name" displayed when the name is invalid.

**Steps to Reproduce**
1. Open the Electronics screen and tap "Add Custom Electronics" (or edit an existing custom electronics item).
2. Tap the "Name" input field to open the keyboard.
3. Observe that the Cancel/Save buttons may be hidden behind the keyboard.
4. Enter an invalid name (or leave empty) and try to save - no constraint message is shown.

**Expected Behavior**
- The modal should stay above the keyboard with all action buttons visible and accessible.
- When the electronics name is invalid/empty, display "Must be valid electronics name" below the name input field (matching the style of other validation messages in the app).
- The Save/Add button should be disabled until both name and wattage are valid.
- Both add and edit flows should behave consistently.

**Actual Behavior**
- Buttons get covered by the keyboard on smaller screens/devices.
- No name validation message is displayed; users only see generic behavior.
- Layout doesn't adapt well to keyboard appearance.

**Environment**
- **Device:** Android and iPhone
- **App Version:** v1.0.0

**Fixed:** Restructured `src/components/forms/CustomElectronicsModal.tsx` to use `KeyboardAvoidingView` with proper behavior/offsets, split layout into fixed header, scrollable content area, and fixed footer with buttons. Added name validation (alphanumeric, spaces, hyphens, parentheses allowed) with "Must be valid electronics name" error message displayed below the name input. Disabled confirm button when name or wattage is invalid. Applied consistent styling with existing validation messages.

---

## Still To Do

- Update the ESP32 firmware so watt_hours is reported on the 756 Wh scale.
- Small pre-existing warning in the code cleanup (not related to these fixes).
