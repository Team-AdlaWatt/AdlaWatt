// ============================================================
// ADMIN CONSTANTS
//
// Three read-only admin tabs: Overview, Users, Reports, fed
// by the get_admin_fleet_health RPC (see
// src/services/adminService.ts). Pinned light mode +
// English-only are enforced by app/admin/_layout.
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
