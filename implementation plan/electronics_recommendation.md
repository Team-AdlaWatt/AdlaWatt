# Electronics Recommendation Engine Design

## Overview

The electronics recommendation engine is a **pure calculation module** with no network calls and no React Native imports, so its logic can be verified anywhere and unit-tested in isolation. It lives in `src/services/recommendation.ts` and answers one question per electronics item: *should the user run this electronics item off the battery right now?*

It consumes two things:

- A **live battery reading** (SoC, terminal voltage, remaining energy, depth-of-discharge guard).
- A **wattage string** per electronics item (e.g. `"35-75W"`, `"50W"`, `"15-20"`).

It produces a **verdict** (`recommended`, `care`, `notRecommended`), a projected **runtime range**, the per-hour **budget share** of usable energy, a charge-scaled **peak wattage cap**, a **projected voltage** after the estimated draw drop, and a human-readable **reason**. The UI exposes **three toggle segments** that mirror the verdicts so the user is never overloaded:

| Badge             | Verdict behind it   | Toggle segment |
|-------------------|---------------------|----------------|
| **OK to use**     | `recommended`       | Advisable      |
| **Use with care** | `care`              | Caution        |
| **Not advisable** | `notRecommended`    | Not Advisable  |

The engine performs the full analysis pipeline:

1. Battery tier classification (Safe / Caution / Unsafe).
2. Reserve-floor usable energy calculation.
3. Charge-scaled peak wattage cap (SoC-backed).
4. Voltage headroom projection (estimated draw drop vs `UNSAFE_VOLTAGE`).
5. Budget share (mid draw vs usable energy per hour).
6. Per-electronics-item wattage resolution and runtime estimate.
7. Recommendation verdict and reason.
8. Combined load-stack checks (reserved for a future catalog screen).

The battery the engine reasons about is the same **ZENOVA 12 V 30 Ah ×2 parallel** bank documented in `zenova_battery.md`.

---

## Battery Reference

| Item                                | Value                                   |
|-------------------------------------|-----------------------------------------|
| Battery model                       | ZENOVA 12 V 30 Ah lithium battery       |
| Battery quantity                    | 2                                       |
| Configuration                       | Parallel                                |
| Bank nominal energy                 | 756 Wh                                  |
| Energy reserve floor                | 151.2 Wh (20%)                          |
| Usable energy window                | 604.8 Wh (80%)                          |
| Minimum preferred SoC               | 20%                                     |
| Recommended normal-use cutoff       | 20% SoC / 151.2 Wh / 80% DoD            |
| Caution voltage boundary            | 10.65 V                                 |
| Unsafe (hard cut) voltage           | 10.60 V                                 |
| Maximum safe combined load          | 1000 W (inverter assumption)            |

### Energy calculations

```
12.6 V × 60 Ah = 756 Wh (nominal)
756 Wh × 0.20 = 151.2 Wh (reserve floor — do not spend)
756 Wh − 151.2 Wh = 604.8 Wh (usable window)
```

The reserve floor is what separates "can be spent" from "cannot be spent." Remaining energy **below 151.2 Wh is not spendable** without risking the battery, so the engine never budgets it into a runtime.

---

## Constants

| Constant                       | Value    | Meaning                                             |
|--------------------------------|----------|-----------------------------------------------------|
| `BATTERY_NOMINAL_WH`           | 756      | Full bank energy in watt-hours                      |
| `RESERVE_WH`                   | 151.2    | Protected 20% reserve floor                         |
| `CAUTION_SOC`                  | 20       | SoC at the recommended cutoff boundary              |
| `CAUTION_VOLTAGE`              | 10.65    | Voltage at/below which only light loads are allowed |
| `UNSAFE_VOLTAGE`               | 10.6     | Voltage at/below which everything is blocked        |
| `MAX_SAFE_LOAD_W`              | 1000     | Inverter-safe combined-load limit at 100% charge    |
| `ALL_DAY_HOURS_LIMIT`          | 72       | Round-trip shown as "All day"                       |
| `BUDGET_RECOMMENDED_MAX_RATIO` | 0.10     | Budget share at/below which an electronics item is `recommended` |
| `BUDGET_CARE_MAX_RATIO`        | 0.25     | Budget share above which an electronics item is `notRecommended`; 0.10–0.25 → `care` |
| `VOLTAGE_DROP_STEP_WATTS`      | 50       | Load increment for the voltage-drop model          |
| `VOLTAGE_DROP_STEP_VOLTS`      | 0.1      | Voltage dropped per `VOLTAGE_DROP_STEP_WATTS` of load |
| `RUNTIME_CARE_MIN_HOURS`       | 0.1667   | Display only: runtime below this renders "<10 min"  |

---

## Battery Tier Classification

Given a live `BatteryStateInput`, the engine derives a tier that every verdict downstream depends on:

| Tier      | Meaning                                                              | Entry condition                                                                 |
|-----------|----------------------------------------------------------------------|----------------------------------------------------------------------------------|
| Safe      | Normal operation; all electronics can be evaluated                     | SoC ≥ 21% **and** remainingWh > 151.2 Wh **and** voltage > 10.65 V **and** no unsafe signal |
| Caution   | At the recommended cutoff boundary; light loads only                 | Any of: SoC == 20, remainingWh == 151.2, or voltage ≤ 10.65 V (and no unsafe signal) |
| Unsafe    | Critical signal present; block every electronics item                       | DoD unsafe, or SoC < 20, or remainingWh < 151.2 Wh, or voltage ≤ 10.6 V             |

Rules:

- **Voltage is the harder safety signal.** A voltage at or below `UNSAFE_VOLTAGE` overrides a healthy SoC and marks the battery Unsafe.
- **DoD is a hard guard.** `dod === "Unsafe"` forces the tier to Unsafe regardless of the other numbers.
- The **usable window** is always clamped:

```
usableWh = max(remainingWh − 151.2, 0)
```

- A classification is **blocked** when the tier is Unsafe **or** usableWh ≤ 0.

### Unsafe reasons collected

| Signal                     | Recorded reason                                                    |
|----------------------------|-------------------------------------------------------------------|
| `dod` unsafe               | "Depth of discharge is unsafe."                                   |
| SoC below cutoff           | "Battery level is X% (below the 20% cutoff)."                     |
| Energy below reserve floor | "Remaining energy is below the 151.2 Wh reserve floor."           |
| Voltage critically low     | "Voltage is critically low — the harder safety signal."           |

### Caution reason

"Battery is at the recommended cutoff boundary — light loads only."

---

## Wattage Resolution

Wattage arrives as a free-form string. The engine extracts **every number** in the string and describes the electronics item with a min/mid/max range:

| Input string | min | mid | max | Note                              |
|--------------|-----|-----|-----|-----------------------------------|
| `"50W"`      | 50  | 50  | 50  | Single value: all three are equal |
| `"35-75W"`   | 35  | 55  | 75  | mid = rounded average of (35+75)/2 |
| `"15-20"`    | 15  | 18  | 20  | mid = rounded average of (15+20)/2 |
| `"unknown"`  | —   | —   | —   | No digits → returns `null`        |

```
min = smallest number found
max = largest number found
mid = min === max ? min : round((min + max) / 2)
```

- Any string without digits, or where min < 1, max < 1, or max < min, resolves to `null`.
- `null` watt range is treated as **invalid wattage** and blocks the electronics item.

---

## Runtime Calculation

Runtime is simple energy divided by power, using only the **usable** energy above the reserve floor:

```
usable_Wh = remaining_Wh − 151.2  (the 20% reserve floor)

runtime_min = usable_Wh / max_wattage   (worst case  — safety floor)
runtime_mid = usable_Wh / mid_wattage   (primary estimate)
runtime_max = usable_Wh / min_wattage   (best case  — eco)
```

Higher wattage consumes energy faster, which is why `runtime_min` uses the **maximum** wattage.

- If `usableWh` or `watts` is not finite, or either is ≤ 0, runtime is `0`.
- When the battery classification is blocked, the UI shows `"—"` instead of a runtime.

### Display formatting

| Condition                              | Label           |
|----------------------------------------|-----------------|
| high runtime ≥ 72 h                    | `All day`       |
| high runtime < 10 min                  | `<10 min`       |
| high − low ≤ 0.05 h                    | `~X hrs` (1 dp under 10 h, else 0 dp) |
| otherwise                              | `~low – high hrs` |

---

## Budget, Wattage Cap & Voltage Headroom

Three derived numbers gate the verdict before any runtime label matters:

### Budget share (per-hour draw)

The **drain ratio** is the fraction of the *usable* energy the electronics item spends in one hour:

```
drainRatio = mid_wattage / usable_Wh
```

This is the exact inverse of the mid runtime (`drainRatio = 1 / runtimeMidHours`), so a ratio of 0.10 means ~10 hours and 0.25 means ~4 hours. It is the single budget rule:

| Ratio range      | Meaning                                          |
|------------------|--------------------------------------------------|
| ≤ 0.10           | Barely touches the budget → `recommended`        |
| 0.10 – 0.25      | Moderate share → `care`                          |
| > 0.25           | Uses too much per hour → `notRecommended`        |

### Charge-scaled wattage cap

The peak safe draw shrinks as the battery discharges:

```
wattCap = (soc / 100) × MAX_SAFE_LOAD_W
```

At 100% charge the cap is the full 1000 W inverter assumption; at 50% it is 500 W. A peak draw above the cap is flagged `notRecommended`.

### Voltage headroom projection

High draws pull the terminal voltage down, so the engine projects the voltage *under load*:

```
estimatedVoltageDrop = (max_wattage / 50) × 0.1   // 0.1 V per 50 W
projectedVoltage     = current_voltage − estimatedVoltageDrop
```

A `projectedVoltage` at or below `UNSAFE_VOLTAGE` (10.6 V) blocks the electronics item even if the SoC and budget look fine. The estimate uses the **max** wattage — the worst case when the electronics item surges.

### Helper functions

```
computeDrainRatio(watts, usableWh)  = usableWh > 0 && watts > 0 ? watts / usableWh : 0
computeWattCap(soc)                 = clamp(soc, 0, 100) / 100 × 1000
estimateVoltageDrop(watts)          = watts > 0 ? (watts / 50) × 0.1 : 0
```

---

## Verdict Mapping

Each electronics item gets one verdict driven by the battery tier, its per-hour **budget share**, the charge-scaled **wattage cap**, and the **projected voltage headroom**:

| Verdict         | Meaning                                                                 |
|-----------------|-------------------------------------------------------------------------|
| `recommended`   | Budget share ≤ 10%/hr, battery Safe, and the cap/voltage checks pass    |
| `care`          | Budget share 10–25%/hr, or the battery is in the Caution zone           |
| `notRecommended`| Blocked, invalid watts, unsafe projected voltage, over the watt cap, or budget > 25%/hr |

### Decision ladder (checked in order)

1. Battery **blocked** (Unsafe or no usable energy) → `notRecommended`
   - Unsafe → "Battery is unsafe — recharge before using electronics."
   - Reserve-only → "Reserve only — no load recommended."
2. **Invalid wattage range** → `notRecommended` → "Invalid wattage range."
3. **Projected voltage ≤ 10.6 V** → `notRecommended` → "Peak draw XW would drop voltage to unsafe levels (YV)."
4. **Peak draw > wattCap** → `notRecommended` → "Peak draw XW exceeds the YW cap at Z% battery."
5. **Budget > 25%/hr** → `notRecommended` → "Uses X% of the usable energy per hour."
6. Tier is **Caution** → `care` → "Battery is in the caution zone — light loads only."
7. **Budget > 10%/hr** (10–25%) → `care` → "Uses a moderate X% of the usable energy per hour."
8. Otherwise → `recommended` → "Safe to use."

> The order matters: the voltage, cap, and budget guards are **safety-first** and all run *before* the Caution-care rule, so a heavy draw is blocked on its own merits and a Caution battery with a long runtime still reports "light loads only," not a clean recommendation.

### Worked example (80% SoC → usableWh 453.6)

| Electronics   | Wattage     | Budget share | Projected V | Cap (800 W) | Verdict          |
|---------------|-------------|--------------|-------------|-------------|------------------|
| Wi-Fi router  | 10–25 W     | 3.9%/hr      | 12.4 V      | under       | `recommended`    |
| Laptop        | 45–55 W     | 11.0%/hr     | 12.4 V      | under       | `care`           |
| Mini fridge   | 65–85 W     | 16.5%/hr     | 12.3 V      | under       | `care`           |
| Hair dryer    | 1200–1800 W | —            | 8.8 V       | over        | `notRecommended` |

---

## Recommendation Output

`recommendElectronics` returns one flat object per electronics item:

| Field             | Meaning                                            |
|-------------------|----------------------------------------------------|
| `id`, `name`      | Electronics identity                                 |
| `area`            | Optional location label                            |
| `wattRange`       | Resolved min/mid/max range or `null`               |
| `verdict`         | `recommended`, `care`, or `notRecommended`         |
| `badgeLabel`      | Two-label grouping ("OK to use" / "Not advisable") |
| `tier`            | Battery tier for this verdict                      |
| `usableWh`        | Spendable energy above the reserve                 |
| `runtime`         | `minHours` / `midHours` / `maxHours`               |
| `displayRuntime`  | Formatted runtime label for the UI                 |
| `reason`          | Human-readable explanation                         |
| `drainRatio`      | mid watts / usable Wh (per-hour budget share)      |
| `projectedVoltage`| Current voltage minus estimated draw drop           |
| `wattCap`         | Charge-scaled peak wattage limit                   |

The `drainRatio`, `projectedVoltage`, and `wattCap` fields are new budget-model outputs, retained for future detail views.

---

## Badge Mapping (UI-facing)

The engine deliberately collapses three verdicts into two **badge label** values (`verdictToBadge`), while the UI renders each verdict with its own **visual state** and a three-segment toggle:

```
verdict === "notRecommended"  →  "Not advisable"   (red)
verdict === "care"            →  "Use with care"   (yellow)
otherwise                     →  "OK to use"       (green)
```

| Badge             | Verdict     | Color   | User-facing meaning                                  |
|-------------------|-------------|---------|------------------------------------------------------|
| **OK to use**     | recommended | green   | Fits easily within the per-hour energy budget        |
| **Use with care** | care        | yellow  | Draws a moderate budget share, or battery near cutoff |
| **Not advisable** | notRecommended | red   | Blocked, unsafe, over the cap, or oversized budget   |

"Use with care" electronics remain usable, but they get their own segment so the user can see at a glance which loads are drawing a moderate budget share or running near the cutoff.

---

## Batch Recommendation

`recommendElectronicsBatch` evaluates every electronics item against the same live battery reading and sorts the results so the most usable electronics come first:

```
sort key 1: verdict rank   recommended (0) → care (1) → notRecommended (2)
sort key 2: mid runtime    highest average runtime first (within the same verdict)
```

Each per-electronics-item recommendation in the batch carries the full new budget-model payload (`drainRatio`, `projectedVoltage`, `wattCap`).

Returned payload:

| Field           | Meaning                              |
|-----------------|--------------------------------------|
| `tier`          | Battery tier for the whole batch     |
| `usableWh`      | Spendable energy above the reserve   |
| `blocked`       | Whether the whole batch is blocked   |
| `recommendations` | Sorted per-electronics-item results |

---

## Load-Stack (Multi-Electronics) Mode

`computeLoadStack` sums combined draws for a future catalog / "running together" screen. The simplified dashboard does not surface these numbers today.

| Field           | Calculation                                    |
|-----------------|------------------------------------------------|
| `totalMinWatts` | Sum of every electronics item's min wattage    |
| `totalMidWatts` | Sum of every electronics item's mid wattage    |
| `totalMaxWatts` | Sum of every electronics item's max wattage    |
| `runtimeMidHours` | `usableWh / totalMidWatts` (0 if no valid draw) |
| `overLimit`     | `totalMidWatts > 1000 W` (inverter-safe limit)  |
| `topDrain`      | Electronics item with the highest mid wattage   |

- Electronics rows that fail wattage resolution are skipped from the totals.
- This mode is the only place the 1000 W inverter assumption is applied.

---

## Display Rules

The recommendation engine feeds two screens:

1. **AppRecCard** — the dashboard recommendation carousel.
2. **Electronics screen** — the full filtered electronics grid.

Shared rules:

- Wire the engine `verdict` into one of **three visual states**: `recommended` → green "OK to use"; `care` → yellow "Use with care"; `notRecommended` → red "Not advisable". The badge color and icon follow the card's own state, even when cards mix inside the same carousel or grid.
- Keep the toggle at **three segments** that mirror the verdicts: "Advisable" shows `recommended`, "Caution" shows `care` (yellow active state), "Not Advisable" shows `notRecommended`. The active segment uses its verdict color; the Caution segment uses dark text on the yellow fill for legibility.
- **No live monitoring row yet** → fall back to the legacy wattage-only heuristic: `maxWatts < 300` means advisable. Once a monitoring row exists, the engine verdict takes over.
- Pass the live battery into the engine as:
  - `soc` ← `monitoring.battery_level`
  - `voltage` ← `monitoring.voltage`
  - `remainingWh` ← `monitoring.watt_hours`
  - `dod` ← `monitoring.dod_status`
- Keep the reason string for future detailed views, even though the current UI only renders the badge.
- Do not show runtime when the battery is blocked — display `"—"` instead.

---

## Errors to Avoid

- Do not treat `care` as `notRecommended` — those electronics remain usable and stay grouped under "OK to use".
- Do not spend the 151.2 Wh reserve floor in a runtime estimate. Runtime must come from `usable_Wh = remaining − 151.2`.
- Do not let a healthy SoC override a critically low voltage; voltage is the harder safety signal and forces Unsafe.
- Do not resolve wattage by taking only the first number in the string; compile min/max/mid from every digit found.
- Do not display the mid runtime as an exact number; present it as a min–max range or prose label.
- Do not reorder the decision ladder; the voltage, cap, and budget guards are safety-first and must precede the Caution-care rule.
- Do not stack `drainRatio` thresholds with a separate min-runtime floor — they are the same signal inverted and would double-count.
- Do not apply the full 1000 W inverter cap regardless of charge; `wattCap` must scale with SoC (`soc / 100 × 1000`).
- Do not ignore the projected voltage drop for high-draw electronics; a large peak can push past `UNSAFE_VOLTAGE` even on a healthy SoC.
- Do not render `care` without its distinct yellow state; the UI shows three visual states and the toggle mirrors the three verdicts.
- Do not run heavy per-electronics-item Supabase queries in the engine — it must stay a pure, synchronous, network-free module.

---

## References

1. `src/services/recommendation.ts` — engine source (types, constants, classification, runtime, verdict, batch, load stack).
2. `src/components/AppRecCard.tsx` — dashboard recommendation carousel consuming `recommendElectronics`.
3. `src/app/dashboard/electronics.tsx` — electronics screen consuming `recommendElectronics` with power/area/status filters.
4. `src/services/monitoringService.ts` — live battery fields (`battery_level`, `voltage`, `watt_hours`, `dod_status`) feeding the engine.
5. `src/components/forms/electronicsCard.ts` — shared compact card sizing for the recommendation and electronics grids.
6. `implementation plan/zenova_battery.md` — the battery bank reference the recommendation constants mirror.