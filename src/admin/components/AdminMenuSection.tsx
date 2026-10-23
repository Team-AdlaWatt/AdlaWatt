import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AnalyticsChartCard from "@/components/AnalyticsChartCard";
import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Radius, Spacing } from "@/constants/theme";
import { Routes } from "@/constants/routes";
import { performSignOut } from "@/services/signOut";

// ============================================================
// ADMIN MENU SECTION (English-only, pinned light)
//
// Mirrors the household Menu boxes (2x2 grid, 60px icons)
// plus Log Out + Exit row below. Temporary boxes are
// presentational no-ops marked TEMP. Log Out routes to Login
// immediately and runs teardown in the background via the
// shared performSignOut() (same as household). All strings
// hardcoded English so household language switches cannot
// affect admin.
// ============================================================

const TEMP_BOXES: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
}[] = [
  {
    key: "users",
    icon: "people-outline",
    title: "Users",
    subtitle: "Manage admin and household accounts. (TEMP)",
    accessibilityLabel: "Open Users",
  },
  {
    key: "devices",
    icon: "hardware-chip-outline",
    title: "Devices",
    subtitle: "Review registered ESP32 devices. (TEMP)",
    accessibilityLabel: "Open Devices",
  },
  {
    key: "reports",
    icon: "document-text-outline",
    title: "Reports",
    subtitle: "Export fleet summaries. (TEMP)",
    accessibilityLabel: "Open Reports",
  },
  {
    key: "settings",
    icon: "settings-outline",
    title: "Settings",
    subtitle: "Admin preferences (upcoming). (TEMP)",
    accessibilityLabel: "Open Settings",
  },
];

export default function AdminMenuSection() {
  const colors = useAppColors();
  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const handleLogout = () => {
    const logout = () => {
      // Immediate UI exit: teardown runs in the background.
      performSignOut();
      router.replace(Routes.LOGIN);
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to sign out?",
      );

      if (confirmed) {
        logout();
      }

      return;
    }

    Alert.alert(
      "Log Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: logout,
        },
      ],
    );
  };

  const handleExit = () => {
    const exitApp = () => {
      if (Platform.OS === "android") {
        BackHandler.exitApp();
        return;
      }

      if (Platform.OS === "web") {
        window.close();

        Alert.alert(
          "Exit",
          "Please close this tab manually to exit AdlaWatt.",
        );
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to exit AdlaWatt?",
      );

      if (confirmed) {
        exitApp();
      }

      return;
    }

    Alert.alert(
      "Exit App",
      "AdlaWatt will close. Are you sure?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: exitApp,
        },
      ],
    );
  };

  return (
    <>
      <AnalyticsChartCard
        title="Menu"
        subtitle="Browse and manage admin functions."
        icon="grid-outline"
      >
        <View style={styles.grid}>
          {TEMP_BOXES.map((box) => (
            <Pressable
              key={box.key}
              accessibilityRole="button"
              accessibilityLabel={box.accessibilityLabel}
              accessibilityHint="Temporary admin section"
              style={({ pressed }) => [
                styles.box,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={box.icon}
                size={60}
                color={colors.accentContent}
              />

              <AppText
                variant="body"
                style={styles.boxTitle}
              >
                {box.title}
              </AppText>

              <AppText
                variant="caption"
                style={styles.boxSubtitle}
              >
                {box.subtitle}
              </AppText>
            </Pressable>
          ))}
        </View>
      </AnalyticsChartCard>

      <View style={styles.authActionRow}>
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed }) => [
            styles.authActionButton,
            styles.logOutButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={colors.error}
          />

          <AppText
            variant="body"
            style={styles.logOutButtonText}
          >
            Log Out
          </AppText>
        </Pressable>

        {Platform.OS !== "ios" && (
          <Pressable
            onPress={handleExit}
            accessibilityRole="button"
            accessibilityLabel="Exit app"
            style={({ pressed }) => [
              styles.authActionButton,
              styles.exitButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="exit-outline"
              size={22}
              color={colors.text}
            />

            <AppText
              variant="body"
              style={styles.exitButtonText}
            >
              Exit
            </AppText>
          </Pressable>
        )}
      </View>
    </>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
      padding: Spacing.md,
    },

    box: {
      width: "46%",
      maxWidth: 150,
      minHeight: 150,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      borderRadius: Radius.md,
      padding: 12,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    boxTitle: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 16,
      textAlign: "center",
    },

    boxSubtitle: {
      color: colors.textSecondary,
      textAlign: "center",
    },

    pressed: {
      opacity: 0.7,
    },

    authActionRow: {
      flexDirection: "row",
      gap: 10,
    },

    authActionButton: {
      flex: 1,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 2,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
    },

    logOutButton: {
      borderColor: colors.error,
    },

    logOutButtonText: {
      color: colors.error,
      fontWeight: "700",
    },

    exitButton: {
      borderColor: colors.text,
    },

    exitButtonText: {
      color: colors.text,
      fontWeight: "700",
    },
  });
