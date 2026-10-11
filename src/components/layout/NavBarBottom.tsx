import { Ionicons } from "@expo/vector-icons";

import { router, usePathname } from "expo-router";

import React, { useMemo } from "react";

import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "@/components/ui/AppText";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Bar } from "@/constants/sizing";
import { Routes } from "@/constants/routes";

// ============================================================
// TABS (left -> right)
// ============================================================

const TABS = [
  {
    icon: "home" as const,
    label: "Dashboard",
    href: Routes.DASHBOARD,
  },
  {
    icon: "grid" as const,
    label: "Appliances",
    href: Routes.APPLIANCES,
  },
  {
    icon: "analytics" as const,
    label: "Analytics",
    href: Routes.ANALYTICS,
  },
  {
    icon: "menu" as const,
    label: "Menu",
    href: Routes.MENU,
  },
];

// ============================================================
// NAVBAR BOTTOM
// ============================================================

export default function NavBarBottom() {
  const pathname = usePathname();
  const colors = useAppColors();

  // Gesture-bar inset: bar stays 64 high, the wrapper absorbs
  // the device inset below it (never a fixed paddingBottom).
  const insets = useSafeAreaInsets();

  const navBarBottomStyles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <View
      style={[
        navBarBottomStyles.wrapper,
        { paddingBottom: insets.bottom },
      ]}
    >
      {/* ======================================================
          SECONDARY ACCENT LINE (on top, mirrors Navbar's
          accent flipped to the bottom edge)
          ====================================================== */}

      <View style={navBarBottomStyles.accentLine} />

      <View style={navBarBottomStyles.container}>
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Pressable
              key={tab.href}
              onPress={() =>
                router.navigate(tab.href)
              }
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              style={({ pressed }) => [
                navBarBottomStyles.tab,
                pressed &&
                  navBarBottomStyles.pressed,
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={navBarBottomDimensions.iconSize}
                color={
                  isActive
                    ? colors.bar.text
                    : colors.bar.muted
                }
              />

              <AppText
                variant="caption"
                style={[
                  navBarBottomStyles.label,
                  isActive &&
                    navBarBottomStyles.activeLabel,
                ]}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const navBarBottomDimensions = {
  height: Bar.bottomNav,
  iconSize: Bar.bottomNavIcon,
};

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    wrapper: {
      width: "100%",
    },

    accentLine: {
      width: "100%",
      height: 3,
      backgroundColor: colors.bar.accent,
    },

    container: {
      height: navBarBottomDimensions.height,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-evenly",
      backgroundColor: colors.bar.background,
    },

  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  label: {
    color: colors.bar.muted,
    // 11sp tab-label exception to the 12 minimum (UI-STANDARDS.md):
    // industry standard for tab bars, paired with 24 icon + 48 target.
    fontSize: 11,
    fontWeight: "600",
  },

  activeLabel: {
    color: colors.bar.text,
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.7,
  },
});