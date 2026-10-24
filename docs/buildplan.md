# AdlaWatt Build Plan — Preview APK + OTA Updates

> **Scope:** Android preview builds (`com.teamadlawatt.adlawatt`, owner `fadrians-team`, Expo SDK 55) distributed internally with Over-The-Air updates on the `preview` channel.
> **Repo state at writing:** `expo-updates` is NOT installed, the preview profile has NO channel, and `app.json` has NO `runtimeVersion` — the one-time setup below is all still to do.

---

## 1. Rule of thumb: rebuild or OTA?

| Change | Path |
|---|---|
| JS, styling, assets, docs-only edits | OTA (`eas update --channel preview`) |
| New/changed native modules (e.g. `expo-notifications`, NetInfo, `expo-print`/`sharing`/`file-system`, `expo-asset`), Expo SDK upgrade, new permissions, `app.json` native settings | Fresh native build (`eas build --profile preview`) — OTA **cannot** deliver these |

Because recent work added native modules, the **first** preview APK must be built fresh from current code. OTA works for everything after that baseline.

---

## 2. One-time setup

- Install tools: `npm i -g eas-cli`, then `eas login`.
- Run `eas build:configure` if `eas.json` is missing (it exists already — verify, don't overwrite blindly).
- Run `npx expo install expo-updates`.
- Run `eas update:configure`. This adds the update URL and `runtimeVersion` to `app.json`.
- Confirm the package name in `app.json`: `"android": { "package": "com.teamadlawatt.adlawatt" }` (already set — do not change).
- Link the preview profile to its channel in `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" }
    }
  }
}
```

- `buildType: "apk"` is important. Without it, Android builds an AAB, which cannot be installed directly.
- `channel` links the build to OTA updates — without it, published updates are never fetched.

---

## 3. Build and install the preview APK

### Before you build (pre-build checklist)

- Use `buildType: "apk"` in the `preview` profile (already set — verify, don't assume).
- Run `npx expo-doctor` and `npx expo install --fix` before building. This fixes version mismatches.
- Keep the `package` name (`com.teamadlawatt.adlawatt`) consistent. Do not change it between builds — a rename breaks update/install continuity.
- Test the production-like bundle first: `npx expo export --platform android`. If this fails, the build will crash too.
- Put every `EXPO_PUBLIC_*` variable in `eas.json` (under `env`) or EAS secrets. Missing variables are a top cause of crashes — they bake in at build/update time and can't be fixed on the phone.
- `google-services.json`: only if you use Firebase. **AdlaWatt does not** — skip this unless Firebase is ever added (point it via `android.googleServicesFile` if so).
- Make sure every native library is in `package.json` (`expo-notifications`, `@react-native-community/netinfo`, `expo-print`, `expo-sharing`, `expo-file-system`, `expo-asset`, `expo-location`, `expo-image-picker`, `expo-dev-client`, `react-native-reanimated`, and friends) and rebuild after adding one.
- Use `eas build --clear-cache` if the build behaves strangely (stale caches produce haunted binaries).

### Install

- Run `eas build --platform android --profile preview`.
- When done, open the link or scan the QR code on your phone to download the APK.

### Fixing "does not install"

- **File is an AAB, not an APK:** add `buildType: "apk"` and rebuild.
- **"App not installed":** uninstall any old version first, such as a dev build or a version with a different signature. Then install again.
- **Blocked by phone:** allow "Install unknown apps" — Settings › Apps › your browser or file manager › Allow from this source.
- **Play Protect warning:** tap "Install anyway" or "More details". Or turn off scanning briefly.
- **Download is broken:** download the APK again. Make sure the file ends in `.apk`.
- **Parse error or not compatible:** check that your phone's Android version meets the app's `minSdkVersion`.
- **Not enough storage:** free some space (keep at least 1 GB free).
- **Date and time:** set to automatic. Wrong time can break network and SSL calls (Supabase included).
- **Battery:** set the app to "Unrestricted" battery use. This helps background tasks and notifications.
- **Permissions:** open App info › Permissions and allow what the app needs (location for weather, notifications for reminders).
- **Internet:** every AdlaWatt backend call is HTTPS, so cleartext is a non-issue — but if the phone sits behind a captive portal or VPN, requests fail the same way.
- **Still stuck:** connect the phone to your PC with USB debugging on, then run `adb install -r app.apk`. The error name it prints (like `INSTALL_FAILED_UPDATE_INCOMPATIBLE`) tells you the exact cause.

---

## 4. Send OTA updates

- Change JS code or assets only (see Section 5 for what disqualifies an update).
- Make sure the `EXPO_PUBLIC_*` values in your environment are the ones the app should run with — they are baked in at `eas update` time, not read from the phone.
- Run `eas update --channel preview --message "your message"`.
- Open the app on your phone. It downloads the update on the first launch and applies it on the next launch, so close and reopen the app twice.

### When OTA applies

- OTA only works for JS and asset changes.
- If you add a native library, change `app.json` native settings, or upgrade the SDK, make a new build.
- Keep `runtimeVersion` the same between the build and the update, or the update will not load. A blank phone that never got the baseline build cannot OTA itself into compliance — install the APK first.

---

## 5. When OTA does NOT apply (rebuild instead)

- New or upgraded native modules (`expo-notifications`, `@react-native-community/netinfo`, `expo-print`, `expo-sharing`, `expo-file-system`, `expo-asset`, or any future native dep).
- Expo SDK upgrade.
- New/changed Android permissions.
- Any `app.json` change under `android`, `plugins`, or `experiments`.

## 6. Android version and SDK compatibility

### Short answer

- Expo's current SDKs (54 to 57) all support **Android 7.0 and up** (`minSdkVersion` 24), per the Expo docs.
- `compileSdkVersion` and `targetSdkVersion` are **36** for all of them. Android 7 up to the newest Android is covered.

### Which SDK to use

- This repo runs **SDK 55** — stay on it until after the defense. An SDK upgrade means a fresh native binary, full regression, and a new OTA baseline: real risk with no thesis benefit right now.
- For reference only: the latest stable is **SDK 57** (React Native 0.86, needs Node 22.13+); **SDK 56** has the same Android support and needs Node 20.19+. If you ever upgrade, run `npx expo install --fix` after changing the SDK to align package versions.
- This repo sets no custom `minSdkVersion`/`targetSdkVersion` (verified in resolved config) — Expo SDK 55 defaults apply.

### Limits

- Android 6 and older are **not supported** by Expo. There is no safe way to lower `minSdkVersion` below 24.
- Some libraries may need a higher minimum than Expo. Check their docs.

### Do not change these

- Do not set `minSdkVersion` lower than 24 in `expo-build-properties`.
- Keep `targetSdkVersion` at 36. Google Play needs a recent target level for new apps.

### For your install problem

- If your phone is Android 7 or newer, the SDK is not the cause — work through Section 3 instead.
- On Android 6 or older, the APK will not install. Test on a newer phone or emulator.

### Newer phones

Short answer: **yes**, for almost all new Android phones. SDK 57 builds for Android 7 up to Android 16 (API 36) — and this repo's SDK 55 sits inside the same supported range.

- **Why newer phones still work:** Android keeps old apps working on newer versions. An app targeting API 36 will run on a phone with a newer Android. Some new Android behavior changes may only apply once you raise `targetSdkVersion`, so your app should keep working.

Things to watch:

- **Very new Android versions:** small bugs can appear on a brand-new Android release before Expo updates. Check the Expo changelog if something breaks.
- **Phone brand quirks:** some brands (Xiaomi, Oppo, Vivo) have strict battery and install rules. This can affect background tasks and APK installs — allow "Install unknown apps" and disable battery restrictions for AdlaWatt when testing.
- **Old phones:** Android 6 and below will not work.
- **Libraries:** a third-party library can have its own limits, even if Expo supports the phone.

Tips:

- Test your preview build on at least one older phone (Android 7 to 10) and one new phone.
- Use `npx expo-doctor` to catch version problems early.

## 7. If it installs but crashes on open

- Turn on Developer options and USB debugging.
- Run `adb logcat *:E` and open the app. The red error shows the cause.
- Common causes for this project: missing `EXPO_PUBLIC_*` env variables baked at build/update time, Supabase URL/key mismatch, an update published to the wrong channel (`preview` vs other), or opening an OTA update on a binary whose `runtimeVersion` doesn't match.
- Share the exact error message (logcat excerpt) for a pinpoint fix.

## 8. Good habits

- Test the preview APK on one old phone (Android 7 to 10) and one new phone (Section 6).
- Build a new APK whenever you change native stuff. Use OTA only for JS and images (Section 5).
- Keep `runtimeVersion` stable so updates match the build.

---

*End of build plan. Re-verify this document whenever the SDK, native dependencies, or EAS configuration change — a stale build doc causes exactly the install failures Section 3 troubleshoots.*
