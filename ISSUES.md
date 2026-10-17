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

## Still To Do

- Test the real APK on a phone and confirm all five issues above are gone.
- Small pre-existing warning in the code cleanup (not related to these fixes).
