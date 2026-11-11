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

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Radius } from "@/constants/theme";
import { Routes } from "@/constants/routes";
import { performSignOut } from "@/services/signOut";

// ============================================================
// ADMIN ACCOUNT ACTIONS (English-only, pinned light)
//
// Blank starting shell: Log Out + Exit only. Log Out routes to
// Login immediately and runs teardown in the background via the
// shared performSignOut() (same as household). All strings
// hardcoded English so household language switches cannot
// affect admin.
// ============================================================

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
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
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
