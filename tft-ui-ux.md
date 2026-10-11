# AdlaWatt SPI TFT Touch — UI/UX Spec (480×320, ESP32 Live-Direct)

> Source-extracted from mobile app (`src/constants/colors.ts`, `theme.ts`, `sizing.ts`,
> `services/monitoringService.ts`, `components/ChartCard.tsx`, `services/recommendation.ts`).
> TFT runs **ESP32 live sensors direct** — no Supabase / WiFi required for core displays.
> Phone app keeps history, analytics, forecast, email, logs.
> Boot flow (every boot): `Logo → 4-digit PIN → QR + Proceed → Dashboard`.

## 0. Onboarding (every boot, before dashboard)

Flow: `0A Splash (1.5s auto) → 0B PIN → 0C QR + Proceed → 1 Home`.
PIN is TFT-local only (separate from Supabase auth). QR screen is not skippable.

### 0A Splash / Logo

```txt
+----------------------480----------------------+
|                                              |
|              AdlaWatt LOGO 200px             |
|              bg #121212 centered             |
|              v1.0  sensors booting...        |
|                                              |
+----------------------320---------------------+
```

- Asset: `assets/images/adlawatt-logo.png` converted to 16-bit BMP/RGB565, ~200px wide centered.
- 1.5s auto-advance, no touch needed. Sensors init in background.

### 0B PIN — 4 digits

```txt
+----------------------480----------------------+
|  Enter PIN            ●Relay locked           |
+----------------------------------------------+
|  PIN: [ • • _ _ ]   Wrong PIN. 2 left        |
|  +------+------+------+                      |
|  |  1   |  2   |  3   |  64px keys           |
|  +------+------+------+                      |
|  |  4   |  5   |  6   |  3 fails = 30s lock  |
|  +------+------+------+                      |
|  |  7   |  8   |  9   |                      |
|  +------+------+------+                      |
|  | CLR  |  0   |  OK  |                      |
|  +------+------+------+                      |
+----------------------------------------------+
```

- Digits only, 4-digit. First boot = `SET + confirm match`, later boots = `ENTER`.
- `•` masking, NVS hashed storage (never plaintext). 3 fails → 30s lock + warning.
- Forgot PIN = physical reset combo (TBD). Relay locked until PIN passes.

### 0C QR + Proceed

```txt
+----------------------480----------------------+
|  Get the mobile app                           |
+----------------------------------------------+
|  +--------+   Scan to install                 |
|  | QR     |   AdlaWatt on your phone          |
|  | 160px  |   [ QR asset supplied later ]     |
|  | BMP    |                                   |
|  +--------+   [ Proceed 160x48 green ] → Dash |
+----------------------------------------------+
```

- QR 160px static BMP (pre-generated, no on-device QR lib). Payload: Expo install link supplied later — layout reserves fixed 160px so swap is 1:1.
- Shown every boot after PIN. `Proceed [160×48 primary #33C191]` enters dashboard Home.

## 1. Constraints

```c
#define SCREEN_W 480
#define SCREEN_H 320
```

- Landscape, resistive/capacitive touch, TFT_eSPI / LovyanGFX style stack.
- No chart library, no web fonts, 16-bit color (RGB565 — round hex to nearest).
- Timing: full screen redraw < 500ms, text/number partial update 1s, temps 5s.
- Offline-first: every screen must render with sensors only. `SENSORS OK / FAIL` dot replaces phone `Online/Offline`.
- Touch: debounce 300ms, auto-return Home after 30s idle, confirm relay ON under Unsafe.

## 2. Shell — left rail nav (not bottom tabs)

Bottom tabs steal 48px from an already-short 320px height (leaves ~232px for data).
Left rail keeps full 320px height for content and gives 72×64px targets.

```txt
<--480px-------------------------------->
+------+--------------------------------+  ^
| HOME | HEADER: AdlaWatt  78%  ●RelayON|  |
|  *   +--------------------------------+  |
| BATT |                                |  320px
|      |  CONTENT (408 x ~284)            |
| SOLAR|  2-col tiles, big numbers      |
|      |                                |
| TEMP |                                |
|      |                                |
| OUT  |                                |
+------+--------------------------------+  v
  72px   408px
  LEFT RAIL: 5 x 64px rows (icon + 10px label)
  Active fill #33C191 / inactive #A0A0A0 on #1E1E1E
```

- Tabs (mirrors mobile navbar, rotated 90°): `Home | Batt | Solar | Temp | Out`.
- Header (inside content, 36px): `title + batt% + relay dot`. Rail stays visible under Unsafe banner so user can always jump Home.
- Tradeoff accepted: 72px rail shortens tile text (`12.4V` not `Battery Voltage 12.4V`). Icon-only 56px rail is the fallback if text truncates.

## 3. Screens — most important first

### 3.1 Home (default after Proceed, no scroll)

```txt
+------+--------------------------------+
| HOME*| Batt 12.4V  78% [██████░░]     |
| BATT | Load 85W   Solar 142W HIGH     |
| SOLAR| Temps 32/34/29C  ●SENSORS OK   |
| TEMP | [ Relay ON 120x64 ]  3.2h left  |
| OUT  |                                |
+------+--------------------------------+
```

Widgets: SoC% bar + V, Load W, Solar W + Low/Mod/High, 3 temps mini, relay state + time-left estimate, sensors dot.

### 3.2 Battery

```txt
+------+--------------------------------+
| HOME | 78% big + 12.4V + Charge ↑     |
| BATT*| usable 417Wh | low@10.65V      |
| SOLAR| [====bar red if <20% / Unsafe] |
| TEMP | cut@10.6V banner when Unsafe     |
| OUT  |                                |
+------+--------------------------------+
```

Source: ADC batt divider → V; SoC% mapped 9.0–12.6V (EMA 5–10 samples); usableWh = remaining − 144Wh reserve.

### 3.3 Solar

```txt
+------+--------------------------------+
| HOME | Solar 142W HIGH  14.1V  10.0A  |
| BATT | Today 812Wh  Timer 04:12:33    |
| SOLAR*  sun bar Low/Mod/High       |
| TEMP |                                |
| OUT  |                                |
+------+--------------------------------+
```

Widgets: Panel V + charge A + W (V×A) + day Wh counter (RTC/millis integrate) + sun Low/Mod/High + charging timer HH:MM:SS.

### 3.4 Temps / Safety

```txt
+------+--------------------------------+
| HOME | Batt 32C Nom | Sol 34C Elev    |
| BATT | Int 29C Nom  | ●SENSORS OK    |
| SOLAR| [red banner if High/Critical]   |
| TEMP*| relay auto-cut state            |
| OUT  |                                |
+------+--------------------------------+
```

`Batt °C + Solar °C + Interior °C` with severity colors (Nominal/Elevated/High/Critical) + relay auto-cut banner. Any Critical → full-width red banner over content, rail stays tappable.

### 3.5 Output (relay control)

```txt
+------+--------------------------------+
| HOME | Load 85W  cap 800W warn         |
| BATT | [ Relay ON 120x64 big ]         |
| SOLAR| Unsafe → confirm ON required    |
| TEMP |                                |
| OUT *|                                |
+------+--------------------------------+
```

Big `120×64` `Relay ON/OFF` touch toggle + `Load W + 800W warn / 1000W cap block`. Confirm dialog for OFF→ON when tier = Unsafe.

### 3.6 Weather mini (optional, phone-assisted only)

```txt
+------+--------------------------------+
| HOME | Cebu 31C partly  pop 20%        |
| BATT | Outlook Mod  Best sun: Fri       |
| SOLAR| (pushed from phone, else hidden)|
| TEMP |                                |
| OUT  |                                |
+------+--------------------------------+
```

Only if phone/BLE pushes it: `city + now°C + outlook + bestSunDay`. Never blocks live screens. No 5-day strip on TFT.

### Skip on TFT (phone app owns these)

Supabase history, 17 analytics charts, 5-day forecast strip, appliance carousel, activity logs, notifications list, email, auth, settings.

## 4. ESP32 live mapping (no Supabase)

| TFT widget | ESP32 source | Notes |
|---|---|---|
| Batt V | ADC voltage divider | calibrate, EMA filter |
| Solar V / A / W | INA226 / divider + shunt | W = V × A |
| SoC % | computed from V curve 9.0–12.6V | show % + bar |
| Temps °C | DS18B20 / DHT22 ×3 | batt / solar / interior |
| Relay ON/OFF | GPIO relay out + back-read | big touch target |
| Day Wh | integrate W over time | RTC/millis, reset at sunrise |
| Sun level | thresholds on Solar W | Low/Mod/High mirrors app badge |
| Load W | batt discharge shunt or smart plug | cap 800W warn, 1000W block |

Thresholds (copied from app): `SoC low 20%, reserve 144Wh / full 720Wh, caution 10.65V, unsafe 10.6V, notify band 11.6–14.6V, max load 1000W`.

## 5. Color palette (copied from `src/constants/colors.ts`)

Dark-first for TFT (night + glare readable). Round to RGB565.

```txt
bg        #121212   surface  #1E1E1E   elevated #2A2A2A
text      #E3E3E3   muted    #A0A0A0   border   #6A6A6A
primary   #33C191   pressed  #20A578   onPrimary #121212
secondary #FCD34D   accent   #FBBF24
error     #F87171   errorDark #FF8A80  errorDeep #FF6B60
warning   #F59E0B
cardBorder #E3E3E3  headerBg #2A2A2A   headerTx #E3E3E3
```

Light alt (day kiosk only): `bg #F0EAD6, surface #FFFFFF, text #1C1B1F, primary #00805A, onPrimary #FFFFFF, secondary #FFBF00, border #D8D2C2, error #EF4444`.

Frozen severity (same both themes):

```txt
nominal  bg #E4EAD9 border/text #14532D
elevated bg #EBE8CD border/text #713F12
high     bg #EFE2CC border/text #7C2D12
critical bg #EFE0DC border/text #7F1D1D
```

Sun gauge: `Low #dcdc6d, Moderate #EDEB44, High = secondary`. Chart orange `#F97316` for warnings only.

60-30-10 rule: 60% bg/surface, 30% primary/green, 10% yellow/red accents.

Onboarding uses same palette: splash/logo on `bg`, PIN dots `text`, keypad `surface` + `primary` OK key, QR box `surface` + `border`, Proceed `primary` fill.

## 6. Layout structure (copied from `theme.ts` / `sizing.ts`, TFT-adapted)

```txt
Spacing  xs 4 / sm 8 / md 16 (use 8/12 on TFT, never 24/32)
Radius   sm 8 / md 12 (cards) — no 20/28 on 320px height
Type     small 12 / caption 14 / body 16 / subheading 20 (no 30/36)
Card     pad 12, gap 8-12, border 2px, header-panel pattern
Touch    target ≥48 (rail rows 64, relay 64h, keypad 64, Proceed 48h), icon 24/16
Bar      appBar 36-40 (TFT, not 56), rail 72w (not bottomNav 64h)
```

- Tiles: 2 columns × 2 rows in 408×284 content, 12px pad, 2px border, left color strip for status.
- Numbers right-aligned tabular, units 12px muted (`V / A / W / Wh / °C`).
- Unsafe: full-width `#F87171` banner 32px under header, black text; Critical temp tile inverts to red fill.
- Onboarding: keypad 3×4 grid of 64px keys centered (fits 480 width with side margins), QR 160px left + text/Proceed right (no scroll).

## 7. Touch UX rules

- Rail tabs only (no swipe — cheap touch panels misread swipes). Onboarding has no rail until Proceed.
- Relay toggle requires confirm when Unsafe; double-tap guard 300ms. PIN keys debounce 300ms.
- Idle 30s → back to Home (never back to PIN/QR mid-session; re-lock PIN only on reboot).
- Any Critical → auto-jump Safety screen once, then user-dismissable.
- Failed sensor shows `--` + grey tile, never 0 (0 implies real reading and caused the false cutoff log seen on web).

## 8. What NOT to port

`ChartCard` 13-type system, gifted-charts, 17 analytics charts, forecast 5-day UI, AppRecCard carousel (show verdict only), Supabase realtime/cache, expo-notifications scheduling, auth/menus.
