import { Ionicons } from "@expo/vector-icons";

export type AdminTab = "overview" | "history";

export type AdminHistoryRange = 24 | 168 | 720;

export type AdminHistoryMetric =
  | "battery"
  | "solar"
  | "load";

export const ADMIN_HISTORY_RANGES: readonly {
  value: AdminHistoryRange;
  label: string;
  accessibilityLabel: string;
}[] = [
  {
    value: 24,
    label: "24h",
    accessibilityLabel: "Last 24 hours",
  },
  {
    value: 168,
    label: "7d",
    accessibilityLabel: "Last 7 days",
  },
  {
    value: 720,
    label: "30d",
    accessibilityLabel: "Last 30 days",
  },
] as const;

export const ADMIN_HISTORY_METRICS: readonly {
  value: AdminHistoryMetric;
  label: string;
  accessibilityLabel: string;
}[] = [
  {
    value: "battery",
    label: "Battery",
    accessibilityLabel: "Battery level history",
  },
  {
    value: "solar",
    label: "Solar",
    accessibilityLabel: "Solar energy history",
  },
  {
    value: "load",
    label: "Load",
    accessibilityLabel: "Load consumption history",
  },
] as const;

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
    value: "history",
    label: "History",
    icon: "time",
    accessibilityLabel: "Admin history",
  },
] as const;
