import { Platform } from "react-native";

// NOTE: The legacy Colors palette was removed. Single source of
// truth is src/constants/colors.ts consumed via useAppColors().
// This module keeps sizing-adjacent tokens (Fonts, Spacing,
// Radius, Typography) only. It is intentionally pure (no CSS
// side-effect imports) so native OTA bundles and Jest never pull
// web CSS transitively. Canonical web CSS entry lives in
// src/app/_layout.tsx, guarded by Platform.OS === "web".
/*
|--------------------------------------------------------------------------
| FontStacks — single source of truth for font families
|--------------------------------------------------------------------------
|
| Values below are mirrored verbatim as :root --font-* vars in
| src/global.css (web-only). Edit here first, then sync the CSS
| mirror. Native (ios/android/default) consumes these via
| expo-font (see src/hooks/useAppFonts.ts); web consumes the
| CSS vars via Fonts.web below.
|
*/

export const FontStacks = {
  display:
    "Spline Sans, Inter, ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
  rounded:
    "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
} as const;

/*
|--------------------------------------------------------------------------
| Fonts
|--------------------------------------------------------------------------
|
| web branch is dormant during mobile-OTA phase (never selected on
| ios/android) but preserved for future web return. It reads the
| CSS vars mirrored from FontStacks above.
*/

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },

  android: {
    sans: "sans-serif",
    serif: "serif",
    rounded: "sans-serif",
    mono: "monospace",
  },

  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },

  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

/*
|--------------------------------------------------------------------------
| Spacing
|--------------------------------------------------------------------------
*/

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/*
|--------------------------------------------------------------------------
| Border Radius
|--------------------------------------------------------------------------
*/

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  round: 999,
} as const;

/*
|--------------------------------------------------------------------------
| Typography
|--------------------------------------------------------------------------
*/

export const Typography = {
  display: 36,
  title: 30,
  heading: 24,
  subheading: 20,
  body: 16,
  caption: 14,
  small: 12,
} as const;

/*
|--------------------------------------------------------------------------
| Shadows
|--------------------------------------------------------------------------
*/

export const Shadows = {
  sm: {
    boxShadow: "0px 2px 3px rgba(0,0,0,0.08)",
    elevation: 2,
  },

  md: {
    boxShadow: "0px 3px 6px rgba(0,0,0,0.12)",
    elevation: 4,
  },

  lg: {
    boxShadow: "0px 6px 10px rgba(0,0,0,0.16)",
    elevation: 8,
  },
} as const;