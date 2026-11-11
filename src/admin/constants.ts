// ============================================================
// ADMIN CONSTANTS (UI-first)
//
// Three read-only admin tabs: Overview, Users, Reports. Static
// mock data only for now; no backend/RPC wiring. Pinned
// light mode + English-only are enforced by app/admin/_layout.
// ============================================================

import { Ionicons } from "@expo/vector-icons";

export type AdminTab = "overview" | "users" | "reports";

export const ADMIN_TABS: readonly {
  value: AdminTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
}[] = [
  {
    value: "overview",
    label: "Overview",
    icon: "home",
    accessibilityLabel: "Admin overview",
  },
  {
    value: "users",
    label: "Users",
    icon: "people",
    accessibilityLabel: "Admin users",
  },
  {
    value: "reports",
    label: "Reports",
    icon: "bar-chart",
    accessibilityLabel: "Admin reports",
  },
] as const;
