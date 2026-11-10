import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Bar } from "@/constants/sizing";
import { Radius } from "@/constants/theme";
import { Routes } from "@/constants/routes";
import { performSignOut } from "@/services/signOut";
import { useAuth } from "@/context/AuthContext";

// ============================================================
// ADMIN NAV BAR TOP (English-only, pinned light)
//
// Green header + yellow accent shell. Admin name centered;
// a hamburger button on the right opens an account menu with
// Log Out and Exit (Exit hidden on iOS). All strings hardcoded
// English so household language switches cannot affect admin.
// ============================================================

export default function AdminNavBarTop() {
  const colors = useAppColors();

  const { profileUsername, user: authUser } =
    useAuth();

  const fallbackName =
    authUser?.email?.split("@")[0] || null;

  const adminName = profileUsername || fallbackName;

  const { width: screenWidth } =
    useWindowDimensions();

  const [menuVisible, setMenuVisible] = useState(false);

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const closeMenu = () => setMenuVisible(false);

  const handleLogout = () => {
    closeMenu();

    const logout = () => {
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
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: logout,
        },
      ],
    );
  };

  const handleExit = () => {
    closeMenu();

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
        { text: "No", style: "cancel" },
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
      <View
        style={[
          styles.wrapper,
          {
            width: screenWidth,
            alignSelf: "center",
          },
        ]}
      >
        <View style={styles.container}>
          <View style={styles.sideSlot} />

          {adminName ? (
            <View
              style={styles.nameSlot}
              accessibilityRole="header"
              accessibilityLabel={`Admin signed in as ${adminName}`}
            >
              <AppText
                variant="body"
                style={styles.nameText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {adminName}
              </AppText>
            </View>
          ) : (
            <View style={styles.nameSlot} />
          )}

          <Pressable
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Account menu"
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="menu-outline"
              size={24}
              color={colors.bar.text}
            />
          </Pressable>
        </View>

        <View style={styles.accentLine} />
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable
          style={styles.overlay}
          onPress={closeMenu}
        >
          <View style={styles.menuCard}>
            <AppText variant="body" style={styles.menuTitle}>
              Account
            </AppText>

            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              style={({ pressed }) => [
                styles.menuRow,
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
                style={styles.logoutText}
              >
                Log Out
              </AppText>
            </Pressable>

            {Platform.OS !== "ios" ? (
              <Pressable
                onPress={handleExit}
                accessibilityRole="button"
                accessibilityLabel="Exit app"
                style={({ pressed }) => [
                  styles.menuRow,
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
                  style={styles.exitText}
                >
                  Exit
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    wrapper: {
      width: "100%",
      zIndex: 100,
      elevation: 8,
      boxShadow: "0px 2px 4px rgba(0,0,0,0.12)",
    },

    container: {
      height: Bar.appBar,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      backgroundColor: colors.bar.background,
    },

    sideSlot: {
      width: 48,
    },

    nameSlot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      minWidth: 0,
    },

    nameText: {
      color: colors.bar.text,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },

    menuButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Radius.md,
    },

    accentLine: {
      width: "100%",
      height: 3,
      backgroundColor: colors.bar.accent,
    },

    pressed: {
      opacity: 0.7,
    },

    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-start",
      alignItems: "flex-end",
      paddingTop: 60,
      paddingRight: 16,
    },

    menuCard: {
      width: 220,
      backgroundColor: colors.glass.white,
      borderRadius: Radius.lg,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      paddingVertical: 8,
      boxShadow: "0px 4px 12px rgba(0,0,0,0.18)",
    },

    menuTitle: {
      color: colors.textSecondary,
      fontWeight: "700",
      paddingHorizontal: 16,
      paddingVertical: 8,
    },

    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 48,
      paddingHorizontal: 16,
    },

    logoutText: {
      color: colors.error,
      fontWeight: "700",
    },

    exitText: {
      color: colors.text,
      fontWeight: "700",
    },
  });
