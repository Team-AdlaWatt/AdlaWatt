# AdlaWatt Notes

Copy/paste reference file. Filename is final: `NOTES.MD`.

## A. TFT UI Style Reference

Small visual extraction from the AdlaWatt mobile app.

### A1. Color Rule (60-30-10)

#### Light Theme — recommended for normal TFT panels
- 60% Dominant: cream background `#F0EAD6`, white cards `#FFFFFF`
- 30% Primary: brand green `#00805A`
- 10% Accent: yellow `#FFBF00` / `#FACC15`

Use green for main buttons, active states, headers, and key borders.
Use yellow only for small highlights, icons, warnings, or selected accents.

#### Dark Theme
- 60% Dominant: soft black `#121212`, surface `#1E1E1E`, elevated `#2A2A2A`
- 30% Primary: muted green `#33C191`, near-white text `#E3E3E3`
- 10% Accent: yellow `#FCD34D` / `#FBBF24`

### A2. Core Palette

#### Light
- Background: `#F0EAD6`
- Surface / card: `#FFFFFF`
- Text: `#1C1B1F`
- Secondary text: `#747775`
- Primary green: `#00805A`
- Primary text green: `#00663F`
- Pressed green: `#33B98A`
- Soft green: `#99DCC4`
- Accent yellow: `#FFBF00`
- Icon accent: `#FACC15`
- Border: `#D8D2C2`
- Error: `#EF4444`
- Warning: `#F59E0B`

#### Dark
- Background: `#121212`
- Surface: `#1E1E1E`
- Elevated: `#2A2A2A`
- Text: `#E3E3E3`
- Secondary text: `#A0A0A0`
- Primary green: `#33C191`
- Accent yellow: `#FCD34D`
- Icon accent: `#FBBF24`
- Border: `#6A6A6A`
- Error: `#F87171`
- Warning: `#F59E0B`

### A3. Status Colors

- Nominal: bg `#E4EAD9`, text `#14532D`
- Elevated: bg `#EBE8CD`, text `#713F12`
- High: bg `#EFE2CC`, text `#7C2D12`
- Critical: bg `#EFE0DC`, text `#7F1D1D`

### A4. Font

- Primary mobile font: `Inter`
- Alternate font: `Roboto`
- TFT fallback: any clean sans-serif font
- No letter spacing is used

#### Text sizes
- Display: 36
- Title: 30 / bold
- Heading: 22 / semibold
- Body: 16 / regular
- Caption: 14 / regular
- Small: 12
- Button: 16 / semibold

### A5. UI Style

- Spacing: `4, 8, 16, 24, 32, 48`
- Border radius: `8, 12, 20, 28, 999`
- Cards: padding `16`, gap between cards `16`
- Buttons: height `48`, radius `12`, primary fill, `2px` border
- Inputs: height `56`, text size `16`
- Icons: `24` normal, `20` compact, `16` inline
- Header / navbar: green in light theme, dark surface in dark theme
- Overall look: clean, rounded, high contrast, simple cards, minimal decoration

### A6. TFT Usage Notes

- Use the light palette by default for backlit TFT.
- Keep yellow under 10% of the screen.
- Use green for the main action only.
- Keep text large: body `16`, minimum `12`.
- Avoid many status colors on one screen; use text labels with color.

## B. Dashboard Data Reference

Live monitoring table: `public.monitoring`.

Important: the app uses normalized UI fields such as `current_load`, `battery_level`, and `solar_input`. These are **not** the real database column names. The live table uses exact column names with spaces and capitalization, for example `"INA219 Load Side battery load"`. The ESP32 must write the raw names.

### B1. Battery Card

| Label | UI field | Raw source | Live table column | Type | Unit | Badge / classification |
|---|---|---|---|---|---|---|
| Battery % ring | `battery_level` | `INA219 Voltage Percentage` | `"INA219 Voltage Percentage"` | integer | `%` | red if `<= 20` |
| Estimated Time Remaining | derived | `battery_status`, `watt_hours`, `battery_level`, `current_load`, `solar_input` | derived from the five columns listed | string | `Xh YYm` | Charging / Solar covering load / depleted |
| battery status | `battery_status` | `INA219 Load Battery status` | `"INA219 Load Battery status"` | enum | — | `Charging`, `Discharging`, `Idle`, `Reading Error` |
| DoD Safe / DoD Unsafe / DoD -- | `dod_status` | `INA219 Load Side dod_status` | `"INA219 Load Side dod_status"` | enum | — | Unsafe if `Unsafe` or battery `<= 20` |
| Voltage | `voltage` | `INA219 Voltage` | `"INA219 Voltage"` | numeric | `V` | red if `<= 10.65` |
| Watt-hour | `watt_hours` | `INA219 Load Side battery watt_hour` | `"INA219 Load Side battery watt_hour"` | integer | `Wh` | red if `<= 144`; use 720 Wh scale |
| Load Now | `current_load` | `INA219 Load Side battery load` | `"INA219 Load Side battery load"` | numeric | `W` | missing = `--` |
| Interior | `interior_temp` | `DHT22 Interior Temp` | `"DHT22 Interior Temp"` | numeric | `°C` | missing = `Sensor fault` |
| Interior badge | `interior_temp_status` | `DHT22 Interior Temp Status` | `"DHT22 Interior Temp Status"` | enum | — | `Nominal`, `Elevated`, `High`, `Critical`, `Critical (rapid rise)`, `Critical (sensor fault)` |

Raw `"INA219 Load battery time remaining"` exists, but the card computes Estimated Time Remaining from the live battery/load/solar values instead of displaying that column directly.

### B2. Solar Card

| Label | UI field | Raw source | Live table column | Type | Unit | Badge / classification |
|---|---|---|---|---|---|---|
| Solar Input | `solar_input` | `INA219 Solar Side input` | `"INA219 Solar Side input"` | numeric | `W` | sun color by solar status |
| center solar value | `solar_input` | `INA219 Solar Side input` | `"INA219 Solar Side input"` | numeric | `W` | displayed as metric |
| Timer: | `solar_timer` | `INA219 Solar Side timer` | `"INA219 Solar Side timer"` | interval | `HH:MM:SS` | blank = `00:00:00` |
| solar status badge | `solar_status` | `INA219 Solar Side solar status` | `"INA219 Solar Side solar status"` | enum | — | `Low`, `Moderate`, `High` |
| Voltage | `solar_voltage` | `INA219 Solar Side voltage` | `"INA219 Solar Side voltage"` | numeric | `V` | missing = `--` |
| Current | `solar_current` | `INA219 Solar Side current` | `"INA219 Solar Side current"` | numeric | `A` | missing = `--` |
| Total Energy | `total_energy` | `INA219 Load Side total energy` | `"INA219 Load Side total energy"` | numeric | `Wh` | shown inside solar card |
| Solar Panel Temp | `solar_temperature` | `DS18B20 2 Solar Temp` | `"DS18B20 2 Solar Temp"` | numeric | `°C` | missing = `Sensor fault` |
| Solar Panel badge | `solar_temperature_status` | `DS18B20 2 Solar Temp Status` | `"DS18B20 2 Solar Temp Status"` | enum | — | `Nominal`, `Elevated`, `High`, `Critical`, `Critical (rapid rise)`, `Critical (sensor fault)` |

Important: **Total Energy** in the Solar card maps to `"INA219 Load Side total energy"`, not to a solar-side-named column.

### B3. Load / Recommendation

| Label | Source | Type | Unit | Badge / classification |
|---|---|---|---|---|
| Recommendation | recommendation result | enum status | — | `No electronics selected`, `Waiting for battery data`, `Battery check needed`, `Combined recommendation` |
| verdict badge | `result.verdict` | enum | — | `OK to use`, `Use with care`, `Not advisable`, `Waiting` |
| Estimated remaining battery | `result.remainingPercent` | number | `%` | only when ready |
| Estimated runtime | `result.runtimeLabel` | string | `Xh YYm` | only when ready |
| Combined peak load | `result.combinedPeakWatts` | number | `W` | current load + selected peak watts |
| Current load | `result.currentLoadW` | number | `W` | from live `current_load` |
| Better options | `result.alternatives` | array | — | shown when available |
| Appliance watt range | selected electronics | string | `W` | e.g. `35-75W` |

### B4. Device Status Badges

| Label | Source | Live table column | Type | Logic |
|---|---|---|---|---|
| Online / Offline | `last_seen` | `"ESP32S3 Last seen"` | timestamp string | online if age `< 5000 ms` |
| Connected / Not Connected | device online state | derived from `"ESP32S3 Last seen"` | derived | dashboard/component status label |
| Last seen {{time}} | `last_seen` | `"ESP32S3 Last seen"` | formatted string | `just now`, `Xs ago`, `Xm ago`, `Xh ago`, date |
| Last seen unavailable | `last_seen` | `"ESP32S3 Last seen"` | null/invalid | shown when missing or unparsable |

`"ESP32S3 Status"` is stored and constrained to `Online` / `Offline`, but the app's online calculation uses `"ESP32S3 Last seen"` freshness, not that status value.

### B5. Main Classifications

```text
BatteryStatus: Charging | Discharging | Idle | Reading Error
SolarStatus: Low | Moderate | High
DoDStatus: Safe | Unsafe
DeviceStatus: Online | Offline
TemperatureStatus: Nominal | Elevated | High | Critical | Critical (rapid rise) | Critical (sensor fault)
RecommendationVerdict: recommended | care | notRecommended | unknown
```

### B6. Missing Value Rules

```text
number missing       -> "--"
temperature missing  -> "Sensor fault"
solar time blank     -> "00:00:00"
critical sensor fault label -> "Critical"
```

## C. Components Screen Reference

Main table: `public.components`
Live ESP32 connection state: `public.monitoring`

### C1. Components Query

```text
.from("components")
.select("component_id, component_name, status")
.eq("user_id", userId)
.order("component_name", { ascending: true })
```

Realtime subscription: `postgres_changes` on `public.components`, filtered by `user_id=eq.<userId>`.

### C2. Components Table Columns

| Column | Type | Default | UI use |
|---|---|---|---|
| `component_id` | uuid | `gen_random_uuid()` | React key; not displayed |
| `user_id` | uuid | — | owner filter; not displayed |
| `component_name` | text | — | displayed component name and image lookup key |
| `status` | boolean | `false` | displayed as `Active` / `Inactive` for non-ESP32 rows |

### C3. Components Screen Fields

| UI field | Source | Table / column | Notes |
|---|---|---|---|
| Component name | `component.component_name` | `components.component_name` | text |
| Active / Inactive | `component.status` | `components.status` | boolean; formatted by UI |
| Connected / Not Connected | `deviceOnline` | `monitoring."ESP32S3 Last seen"` | ESP32-S3 rows only |
| ESP32 row detection | name match | `components.component_name` | accepts `ESP32-S3` only |
| Component image | local asset map | none | selected by canonical `component_name` |
| Canonical rows | migration + UI normalization | `components.component_name` | `ESP32-S3`, `INA219`, `DS18B20`, `DHT22`, `Relay Module 5V 1 Channel`, `SPI TFT Display`, `5V DC Fan` |
| Component key | `component_id` | `components.component_id` | uuid; not displayed |
| Owner filter | `user_id` | `components.user_id` | used in query; not displayed |

Important: the Components screen does **not** use `components.status` for ESP32. ESP32 and ESP32-S3 use the monitoring heartbeat freshness rule from `monitoring."ESP32S3 Last seen"`.

## D. ESP32 Write Contract

### D1. Target Table and Ownership

- Table: `public.monitoring`
- Primary key: `monitor_id`
- Unique key: `user_id`
- Foreign key: `user_id` -> `users(id)` on delete cascade
- One monitoring row per user.
- App reads the row by `user_id`; app does not write monitoring rows.
- ESP32 should update the row by `monitor_id` or `user_id`, using exact raw key names.

### D2. Permissions / RLS

| Table | RLS | Role | Command | Policy result |
|---|---|---|---|---|
| `monitoring` | enabled | `anon` | INSERT | allowed, `true` |
| `monitoring` | enabled | `anon` | SELECT | allowed, `true` |
| `monitoring` | enabled | `anon` | UPDATE | allowed, `true` |
| `monitoring` | enabled | `authenticated` | SELECT | own row via `users.monitor_id` |
| `monitoring` | enabled | `authenticated` | UPDATE | own row via `users.monitor_id` |
| `components` | enabled | `authenticated` | SELECT | `auth.uid() = user_id` |

### D3. Heartbeat / Connection Rules

- Keep `"ESP32S3 Status"` as `Online` or `Offline`.
- Refresh `"ESP32S3 Last seen"` on every successful heartbeat.
- App treats the device as online only when `"ESP32S3 Last seen"` age is `< 5000 ms`.
- If `"ESP32S3 Last seen"` is missing or unparsable, the device is Offline / Not Connected.

### D4. Exact Raw Keys

```text
"monitor_id"
"user_id"
"INA219 Voltage Percentage"
"INA219 Load Battery status"
"INA219 Load battery time remaining"
"INA219 Solar Side input"
"INA219 Solar Side timer"
"INA219 Solar Side voltage"
"INA219 Solar Side current"
"INA219 Load Side total energy"
"INA219 Solar Side solar status"
"INA219 Load Side battery load"
"ESP32S3 Status"
"ESP32S3 Last seen"
"INA219 Load Side dod_status"
"DS18B20 2 Solar Temp"
"DS18B20 2 Solar Temp Status"
"DHT22 Interior Temp"
"DHT22 Interior Temp Status"
"INA219 Voltage"
"INA219 Load Side battery watt_hour"
"cumulative_energy_input_wh"
"cumulative_energy_output_wh"
"heartbeat_expires_at"
"ESP32S3 Sampled at"
```

### D5. Validation Rules

| Column | Rule |
|---|---|
| `"INA219 Voltage Percentage"` | integer, 0–100 |
| `"INA219 Load Battery status"` | `Charging`, `Discharging`, `Idle`, `Reading Error` |
| `"INA219 Solar Side solar status"` | `Low`, `Moderate`, `High` |
| `"INA219 Load Side dod_status"` | `Safe`, `Unsafe` |
| `"ESP32S3 Status"` | `Online`, `Offline` |
| `"INA219 Load battery time remaining"` | non-empty when present |
| `"DS18B20 2 Solar Temp Status"` | `Nominal`, `Elevated`, `High`, `Critical`, `Critical (rapid rise)`, `Critical (sensor fault)` |
| `"DHT22 Interior Temp Status"` | `Nominal`, `Elevated`, `High`, `Critical`, `Critical (rapid rise)`, `Critical (sensor fault)` |
| numeric voltage/current/input/load/energy columns | non-negative |
| `cumulative_energy_input_wh` | non-negative; only increase |
| `cumulative_energy_output_wh` | non-negative; only increase |

### D6. Read-Only / Non-Displayed Columns

These live columns are part of the app's schema contract but are not displayed in the battery or solar cards:

```text
cumulative_energy_input_wh
cumulative_energy_output_wh
heartbeat_expires_at
"ESP32S3 Sampled at"
```

The app's raw contract lists 25 live monitoring columns. `src/services/monitoringSchema.ts` has a stale comment saying 27.

## E. Source Map

| Area | Source |
|---|---|
| Raw-to-UI monitoring map | `src/services/monitoringSchema.ts:215` |
| Live row fetch | `src/services/monitoringService.ts:330` |
| Battery card | `src/components/ChartCard.tsx:673` |
| Solar card | `src/components/ChartCard.tsx:1196` |
| Load Now field | `src/components/ChartCard.tsx:2708` |
| Solar Panel Temp field | `src/components/ChartCard.tsx:2845` |
| Components load query | `src/app/dashboard/components.tsx:253` |
| ESP32 override rule | `src/app/dashboard/components.tsx:169` |
| Components realtime | `src/app/dashboard/components.tsx:294` |
| 5-second online window | `src/utils/monitoringDisplay.ts:84` |
| 720 Wh scale note | `docs/ISSUES.md:396` |
| Live schema verification | Supabase project `nxdabgvbwunyeffzrzta`, verified 2026-11-22 |
