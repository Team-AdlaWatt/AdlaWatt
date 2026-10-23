import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

// ============================================================
// ONBOARDING SLIDE DATA
//
// One entry per full-screen panel. Keys point into the
// onboarding.* section of src/locales (en/ceb/fil keep parity).
// Slides either show the app logo (welcome) or an icon
// medallion, plus a paragraph subtitle and/or bullet rows.
// ============================================================

export type IoniconName =
  ComponentProps<typeof Ionicons>["name"];

export interface OnboardingBullet {
  icon: IoniconName;
  labelKey: string;
}

export interface OnboardingSlide {
  key: string;
  kind: "logo" | "icon";
  icon?: IoniconName;
  titleKey: string;
  subtitleKey?: string;
  bullets?: OnboardingBullet[];
  /** Welcome slide only: "Swipe to continue" hint. */
  showSwipeHint?: boolean;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: "welcome",
    kind: "logo",
    titleKey: "onboarding.welcome.title",
    subtitleKey: "onboarding.welcome.subtitle",
    showSwipeHint: true,
  },
  {
    key: "about",
    kind: "icon",
    icon: "sunny",
    titleKey: "onboarding.about.title",
    subtitleKey: "onboarding.about.subtitle",
  },
  {
    key: "features",
    kind: "icon",
    icon: "speedometer",
    titleKey: "onboarding.features.title",
    bullets: [
      {
        icon: "speedometer",
        labelKey: "onboarding.features.bulletDashboard",
      },
      {
        icon: "notifications",
        labelKey: "onboarding.features.bulletAlerts",
      },
      {
        icon: "options",
        labelKey: "onboarding.features.bulletPlanner",
      },
      {
        icon: "time",
        labelKey: "onboarding.features.bulletLog",
      },
    ],
  },
  {
    key: "goals",
    kind: "icon",
    icon: "shield-checkmark",
    titleKey: "onboarding.goals.title",
    bullets: [
      {
        icon: "battery-charging",
        labelKey: "onboarding.goals.bulletReliable",
      },
      {
        icon: "heart",
        labelKey: "onboarding.goals.bulletBattery",
      },
      {
        icon: "leaf",
        labelKey: "onboarding.goals.bulletWise",
      },
      {
        icon: "language",
        labelKey: "onboarding.goals.bulletLanguages",
      },
    ],
  },
  {
    key: "finish",
    kind: "icon",
    icon: "checkmark-circle",
    titleKey: "onboarding.finish.title",
    subtitleKey: "onboarding.finish.subtitle",
  },
];
