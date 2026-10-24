# AdlaWatt UI Standards — Responsive Native Feel (Phones, Portrait)

> Single source for sizing, type, and layout rules. Follows the polished-native
> baseline (Facebook / Instagram density): 4/8-point grid, 16 screen margins,
> 48 minimum touch target (exceeds Apple's 44pt). In React Native, Android `dp`
> and iOS `pt` both map to logical pixels — one numeric value works cross-platform.
> Scope: phones 320–430dp, portrait only. Tablets intentionally out of scope.
> Repo tokens live in `src/constants/sizing.ts` (`Touch/Control/Field/OptionRow/
> Bar/Card/Type`, `getScreenPadding`) and `src/constants/theme.ts`
> (`Spacing/Radius/Typography`).

## 1. Core sizing tokens

| Element | Value | Notes |
|---|---:|---|
| Screen horizontal padding | 16 | Dashboards may use 20–24 when spacious |
| Base spacing unit | 4 or 8 | Allowed values only: 4, 8, 12, 16, 20, 24, 32, 40 |
| Small gap | 8 | Icon-to-label, chips, compact rows |
| Standard gap | 16 | Card internals, form fields |
| Section gap | 24–32 | Between major dashboard sections (24 default) |
| Card padding | 16–20 | 16 is the best default |
| Card radius | 12–16 | 16 modern, 12 compact |
| Standard button height | 48 | Primary / secondary |
| Large button height | 52–56 | Full-width login, onboarding, submit |
| Small button height | 36–40 | Only if pressable area stays 48 |
| Icon button touch area | 48 × 48 | Visible icon may be 24 × 24 |
| Standard icon | 24 × 24 | Navigation, buttons, list icons |
| Small icon | 16–20 | Badges, inline status indicators |
| Hero icon | 32–40 | Empty states, feature highlights |
| Input field height | 48–56 | 52 comfortable default |
| Input radius | 8–12 | Match button radius |
| List row height | 56–64 | 56 compact, 64 rich |
| Table row height | 48–56 | 14 text, clear separators |
| Top app bar height | 56 | Plus safe-area inset above |
| Bottom tab bar height | 56–64 | Plus safe-area inset below (64 default) |
| Bottom sheet radius | 20–24 | 24 modern native feel |
| Modal max width | 90% of screen | Centered, readable |
| Standard chart height | 220–260 | 240 default, minimum 180 compact |

## 2. Typography scale

Few sizes, each with a role. Line heights included so cards never clip.

| Role | Size | Line height | Weight |
|---|---:|---:|---|
| Display / onboarding headline | 28–32 | 36–40 | 700 |
| Screen title | 24–28 | 32–34 | 700 |
| Section heading | 20–22 | 28 | 600–700 |
| Card title | 16–18 | 24 | 600 |
| Body text | 14–16 | 20–24 | 400 |
| Input text | 16 | 24 | 400 |
| Secondary / caption | 12–13 | 16–18 | 400–500 |
| Button label | 14–16 | 20 | 600 |
| Table text | 14 | 20 | 400–500 |
| Minimum readable text | 12 | 16 | 400 |

Rules for AdlaWatt monitoring screens: **16 for important live values**,
**14 for labels and table data**, **12 only for timestamps, units, metadata**.
Never below 12 — with one accepted exception: bottom-tab labels may use
**11** (industry standard for tab bars; still paired with a 24 icon and
48 × 48 target, so usability is preserved).

## 3. Buttons, cards, forms

### Buttons

- Primary: height 48, radius 12, horizontal padding 20, label 16.
- Secondary: height 48, radius 12, horizontal padding 16–20, label 16.
- Compact: height 36–40, radius 8–10, label 14.
- Icon button: visible 24 × 24, pressable 48 × 48.
- Full-width: width `100%`, height 52, margin top 16–24.
- A 40-high visual in a dense table keeps an invisible 48 × 48 wrapper.

### Cards (battery, solar, temperature, device status)

- Padding 16, radius 16, gap between cards 12–16.
- Title 16 / 600, main value 22–28 / 700, supporting label 12–14.
- Icon 20–24, internal vertical gap 8–12.

```tsx
<Card style={{ padding: 16, borderRadius: 16 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <BatteryIcon width={20} height={20} />
    <Text style={{ fontSize: 14 }}>Battery</Text>
  </View>

  <Text style={{ fontSize: 28, fontWeight: '700', marginTop: 8 }}>
    12.64 V
  </Text>

  <Text style={{ fontSize: 12, marginTop: 4 }}>
    Updated 2 minutes ago
  </Text>
</Card>
```

### Inputs and dropdowns

- Field height 52, label 14 / 500–600, input text 16, placeholder 14–16,
  helper/error 12, field gap 16, radius 10–12, inner horizontal padding 16.
- Dropdown item height 48.

## 4. Layout and alignment

Screen structure for almost every screen:

```text
Safe Area
  Top App Bar — 56 high (+ insets.top above it)
  Screen content — horizontal padding 16
    Section title
    Cards / charts / lists
  Bottom navigation — 64 high (+ insets.bottom below it)
```

- Left-align text by default; center only primary buttons, empty states,
  modal headings when appropriate; right-align numerics in tables/rows.
- Icons vertically centered with labels; 8 icon-to-text; 16 label-to-value;
  24–32 between major sections; one primary action per screen/card.
- Full-width buttons only for major actions (Save calibration, Connect device).

### Responsive rules (phones only)

Flexible layouts, never one fixed width:

```tsx
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
  <View style={{ flexGrow: 1, minWidth: 150 }}>
    {/* Battery card */}
  </View>

  <View style={{ flexGrow: 1, minWidth: 150 }}>
    {/* Solar card */}
  </View>
</View>
```

| Device width | Layout behavior |
|---:|---|
| Under 360 | Single-column cards, compact charts |
| 360–429 | Standard phone layout, 16 margins |

Battery/solar pattern: one metric card per row on small phones; two per row
on larger phones with `minWidth: 150`; charts always full width; tables scroll
horizontally instead of shrinking text.

## 5. Safe area (status-bar and gesture-bar overlap)

Most important section for a real-app feel. Never hardcode top padding
(`paddingTop: 40` overlaps some devices, wastes space on others) — device
status bars vary. `react-native-safe-area-context` is the approach (installed).

Root wrapper:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Navigation and screens */}
    </SafeAreaProvider>
  );
}
```

Custom header pattern (bar stays 56; container adds the inset above it):

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

<View style={{ paddingTop: insets.top }}>
  <View style={{ height: 56, justifyContent: 'center', paddingHorizontal: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: '600' }}>Dashboard</Text>
  </View>
</View>
```

Total top area = status-bar inset + 56. Bottom tab bar: height 64 plus
`insets.bottom` below it, 24 icons, 11–12 labels, 48 × 48 per-tab targets,
stronger color/weight for active, muted for inactive.

## 6. AdlaWatt baseline (apply everywhere)

| Component | Value |
|---|---:|
| Screen padding | 16 |
| Card padding | 16 |
| Card radius | 16 |
| Card gap | 12–16 |
| Section gap | 24 |
| Metric value | 24–28 |
| Metric label | 14 |
| Timestamp | 12 |
| Chart height | 240 |
| Button height | 48 |
| Input height | 52 |
| List row | 60 |
| Top bar | 56 + safe-area top |
| Bottom bar | 64 + safe-area bottom |
| Standard icon | 24 |
| Touch target | 48 |

## 7. Implementation checklist

- [ ] 4/8 spacing values only: 4, 8, 12, 16, 20, 24, 32, 40.
- [ ] 16 screen margins default (via `useScreenPadding()`).
- [ ] 48 minimum touch target (audit sub-48 hits).
- [ ] 16 body/input text, 14 secondary/table, 12 captions only (11 tab-label exception).
- [ ] 56 top bar + `insets.top`, 64 bottom nav + `insets.bottom`.
- [ ] Safe-area via provider/insets, never fixed padding.
- [ ] Chart height 240, full width, tables scroll horizontally.
- [ ] Test on a small Android phone (320dp), a standard phone (360–430dp),
      and Big-font preference; notch/gesture-bar overlap check.
