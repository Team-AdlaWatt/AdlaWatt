// src/constants/colors.ts

// ============================================================
// ADLAWATT PALETTE — light (default) + dark themes.
//
// 60-30-10 rule:
//   Light: cream background / green primary / yellow secondary.
//   Dark:  soft-black background / grey surfaces / white type.
//
// Every literal below is referenced by at least one
// component. Register new colors here instead of hardcoding
// them in components.
//
// Frozen records (areas, severity, weather) are classification
// color-coding: they render identically in both themes and are
// shared by reference, not duplicated.
// ============================================================

// ——— classification data colors (frozen, both themes) ———
const areaColors = {
  living: "#00A86B",
  bedroom: "#9B59B6",
  kitchen: "#FFBF00",
  study: "#4A90E2",
  bathroom: "#16A085",
  porch: "#E67E22",
} as const;

// ——— temperature severity badges (frozen scale) ———
const severityColors = {
  nominal: {
    bg: "#E4EAD9",
    border: "#14532D",
    text: "#14532D",
  },
  elevated: {
    bg: "#EBE8CD",
    border: "#713F12",
    text: "#713F12",
  },
  high: {
    bg: "#EFE2CC",
    border: "#7C2D12",
    text: "#7C2D12",
  },
  critical: {
    bg: "#EFE0DC",
    border: "#7F1D1D",
    text: "#7F1D1D",
  },
} as const;

// ——— weather badges (frozen PAGASA-style scale) ———
const weatherColors = {
  clear: {
    bg: "#DCFCE7",
    border: "#86EFAC",
    text: "#166534",
  },
  partlyCloudy: {
    bg: "#FEF3C7",
    border: "#FCD34D",
    text: "#92400E",
  },
  overcast: {
    bg: "#F1F5F9",
    border: "#CBD5E1",
    text: "#475569",
  },
  fog: {
    bg: "#E2E8F0",
    border: "#94A3B8",
    text: "#475569",
  },
  yellow: {
    bg: "#FEF3C7",
    border: "#FACC15",
    text: "#854D0E",
  },
  orange: {
    bg: "#FFEDD5",
    border: "#F97316",
    text: "#9A3412",
  },
  red: {
    bg: "#FEE2E2",
    border: "#EF4444",
    text: "#991B1B",
  },
} as const;

export const Colors = {
  light: {
    // ——— 60 · dominant surfaces ———
    background: "#F0EAD6",
    surface: "#FFFFFF",
    // Elevated layer for modals, sheets, selected containers.
    // Light keeps white (elevation via shadow); dark steps up
    // to #2A2A2A for tonal separation from surface #1E1E1E.
    elevated: "#FFFFFF",
    onElevated: "#1C1B1F",
    onBackground: "#1C1B1F",
    onSurface: "#1C1B1F",
    onSurfaceMuted: "#747775",

    // ——— 30 · primary brand ———
    // White on `primary` is 4.96:1 (WCAG 1.4.3 AA) — the
    // lightest shade of the brand green that passes for
    // button labels and navbar text.
    primary: "#00805A",
    // Focus ring for keyboard focus outlines (WCAG 2.4.11).
    focusRing: "#00663F",
    // Text-on-cream accessible green (5.87:1 on background).
    // Body/large brand fills stay `primary`; running text
    // and links on cream must use this to meet WCAG 1.4.3.
    primaryText: "#00663F",
    onPrimary: "#FFFFFF",
    onPrimaryMuted: "rgba(255, 255, 255, 0.6)",
    onPrimarySoft: "rgba(255, 255, 255, 0.9)",
    primarySoft: "#99DCC4",
    primaryPressed: "#33B98A",
    // Card header bars: green in light, elevated tone in
    // dark. Header content (titles, icons) rides on top.
    headerBackground: "#00805A",
    headerContent: "#FFFFFF",
    // Card shells: green borders in light, navbar-icon white
    // (#E3E3E3, same value as bar.text) in dark. Controls,
    // inputs, toggles, and appliance/component boxes keep
    // their green; only card containers use this.
    cardBorder: "#00805A",

    // ——— 10 · accents (use sparingly) ———
    secondary: "#FFBF00",
    iconAccent: "#FACC15",

    // ——— type + hairlines (aliases of the on-surface system) ———
    text: "#1C1B1F",
    textSecondary: "#747775",
    border: "#D8D2C2",

    // ——— status (all in active use) ———
    error: "#EF4444",
    errorDark: "#D32F2F",
    errorDeep: "#991B1B",
    warning: "#F59E0B",

    // ——— monochrome accents (dark-only; light keeps green) ———
    // Icons, accent text, chevrons, radios, spinners: green
    // in light, navbar-icon white in dark.
    accentContent: "#00805A",
    // Links: accessible green on cream in light, white in
    // dark (underline carries the affordance in dark mode).
    linkText: "#00663F",
    // Selection fills: green tint in light, neutral white
    // tint in dark.
    selectedWash: "rgba(0, 128, 90, 0.08)",

    // ——— washes + overlays ———
    primaryWash: "rgba(0, 128, 90, 0.08)",
    washFaint: "rgba(0, 128, 90, 0.06)",
    scrimFaint: "rgba(0, 0, 0, 0.04)",
    overlay: "rgba(0, 0, 0, 0.40)",
    overlayStrong: "rgba(0, 0, 0, 0.50)",

    // ——— neutrals ———
    placeholder: "#dfdfdf",
    color1: "#edeb44",

    // ——— data colors (frozen, shared with dark) ———
    areas: areaColors,
    severity: severityColors,
    weather: weatherColors,

    // ——— chart data colors (series frozen, neutrals theme) ———
    chart: {
      orange: "#F97316",
      grid: "rgba(46, 46, 46, 0.10)",
      axisLabel: "#8E8E93",
    },

    // ——— navbar chrome (brand in light, monochrome in dark) ———
    bar: {
      background: "#00805A",
      text: "#FFFFFF",
      muted: "rgba(255, 255, 255, 0.6)",
      accent: "#FFBF00",
      capsule: "#F0EAD6",
      online: "#00805A",
    },
  },

  dark: {
    // ——— 60 · dominant surfaces (soft black) ———
    background: "#121212",
    surface: "#1E1E1E",
    // Tonal layer above surface for modals, bottom sheets,
    // dialogs, and selected containers. Shadows alone are
    // too subtle on dark, so depth is carried by tone.
    elevated: "#2A2A2A",
    onElevated: "#E3E3E3",
    onBackground: "#E3E3E3",
    onSurface: "#E3E3E3",
    onSurfaceMuted: "#A0A0A0",

    // ——— 30 · primary brand (desaturated for dark mode) ———
    primary: "#33C191",
    // Text-on-black accessible green (8.19:1 on background).
    // Running text and links on dark surfaces must use this
    // to meet WCAG 1.4.3.
    primaryText: "#33C191",
    // Focus ring: high-contrast outline for keyboard focus
    // (WCAG 2.4.11). Light uses deep green on cream; dark
    // uses near-white so it reads on green fills too.
    focusRing: "#E3E3E3",
    onPrimary: "#121212",
    onPrimaryMuted: "rgba(18, 18, 18, 0.6)",
    onPrimarySoft: "rgba(18, 18, 18, 0.9)",
    primarySoft: "#1B3B30",
    primaryPressed: "#20A578",
    // Card header bars: green in light, elevated tone in
    // dark (never pure black — #000000 halos against the
    // #121212 page on OLED at night). Content on top uses
    // the agreed near-white (#E3E3E3, ~14.6:1 on elevated)
    // since dark onPrimary is near-black.
    headerBackground: "#2A2A2A",
    headerContent: "#E3E3E3",
    // Card shells: navbar-icon white in dark (green in
    // light). Same value as bar.text so borders match the
    // navbar icons by construction.
    cardBorder: "#E3E3E3",

    // ——— 10 · accents (tamed for dark mode) ———
    secondary: "#FCD34D",
    iconAccent: "#FBBF24",

    // ——— type + hairlines (aliases of the on-surface system) ———
    text: "#E3E3E3",
    textSecondary: "#A0A0A0",
    // #6A6A6A clears 3:1 on surface #1E1E1E so input and
    // control borders stay distinguishable in dim light.
    // (Uxcel's #3A3A3A reads as a hairline only.)
    border: "#6A6A6A",

    // ——— status (rebuilt for dark surfaces) ———
    // error is softened to #F87171: small error text
    // reaches 6.0:1 on surface (vs 4.4:1 for #EF4444) and
    // near-black ink on the fill stays 6.8:1, so badges,
    // pills, and alert fills keep passing both directions.
    error: "#F87171",
    errorDark: "#FF8A80",
    errorDeep: "#FF6B60",
    warning: "#F59E0B",

    // ——— monochrome accents (dark-only; light keeps green) ———
    // Same values as bar.text so accents match the navbar
    // icons by construction. Link underline (on AuthFooter)
    // carries the affordance once color goes monochrome.
    accentContent: "#E3E3E3",
    linkText: "#E3E3E3",
    selectedWash: "rgba(255, 255, 255, 0.12)",

    // ——— washes + overlays (re-weighted for black) ———
    primaryWash: "rgba(0, 168, 107, 0.16)",
    washFaint: "rgba(0, 168, 107, 0.10)",
    scrimFaint: "rgba(255, 255, 255, 0.06)",
    overlay: "rgba(0, 0, 0, 0.60)",
    overlayStrong: "rgba(0, 0, 0, 0.75)",

    // ——— neutrals ———
    placeholder: "#333333",
    color1: "#edeb44",

    // ——— data colors (frozen, shared with light) ———
    areas: areaColors,
    severity: severityColors,
    weather: weatherColors,

    // ——— chart neutrals themed, series frozen ———
    chart: {
      orange: "#F97316",
      grid: "rgba(255, 255, 255, 0.15)",
      axisLabel: "#A1A1AA",
    },

    // ——— navbar chrome (brand in light, monochrome in dark) ———
    // Dark values reuse the existing neutrals: surface, dark text,
    // muted, border, background. No new hexes introduced.
    bar: {
      background: "#1E1E1E",
      text: "#E3E3E3",
      muted: "#A0A0A0",
      accent: "#3A3A3A",
      capsule: "#121212",
      online: "#E3E3E3",
    },
  },

  glass: {
    white: "rgba(255, 255, 255, 0.50)",
    whiteStrong: "rgba(255, 255, 255, 0.78)",
    disabled: "rgba(255, 255, 255, 0.35)",
    disabledText: "rgba(255, 255, 255, 0.75)",
    unread: "rgba(245, 245, 245, 0.85)",
  },

  glassDark: {
    white: "rgba(255, 255, 255, 0.08)",
    whiteStrong: "rgba(255, 255, 255, 0.16)",
    disabled: "rgba(255, 255, 255, 0.12)",
    disabledText: "rgba(255, 255, 255, 0.40)",
    unread: "rgba(38, 38, 38, 0.90)",
  },
} as const;

export type ThemeOption = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";
