import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import AppButton from "@/components/ui/AppButton";
import AppText from "@/components/ui/AppText";
import { useScreenPadding } from "@/constants/sizing";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

// ============================================================
// ACCOUNT NOT FOUND OVERLAY
// ============================================================
//
// Full-screen takeover shown when the signed-in account was
// deleted while the app was open. The session is already dead
// on the server, so this is a dead end the user must leave:
// the message says so and the only way out is the login
// screen.
//
// Mounted globally (root layout) and rendered as a Modal so it
// covers every route — dashboard, admin, auth — without
// touching the navigation stack.
//
// Fixed cream: the root layout sits above the ThemeProvider,
// so useAppColors resolves the light palette here, same as the
// onboarding panels.
// ============================================================

interface AccountNotFoundOverlayProps {
  /** Whether the takeover is on screen. */
  visible: boolean;
  /** Leaves for the login screen right away. */
  onBackToSignIn: () => void;
}

export default function AccountNotFoundOverlay({
  visible,
  onBackToSignIn,
}: AccountNotFoundOverlayProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const screenPadding = useScreenPadding();

  const styles = useMemo(
    () => getStyles(colors, screenPadding),
    [colors, screenPadding],
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      // Android back must not dismiss the takeover: the
      // account is gone, the only way forward is the login.
      onRequestClose={() => {}}
    >
      <View
        style={styles.container}
        accessibilityViewIsModal
        accessibilityLiveRegion="assertive"
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name="person-remove-outline"
            size={44}
            color={colors.onBackground}
          />
        </View>

        <AppText
          variant="title"
          style={styles.title}
          accessibilityRole="header"
        >
          {t("auth.session.notFoundTitle")}
        </AppText>

        <AppText
          variant="body"
          style={styles.body}
        >
          {t("auth.session.notFoundBody")}
        </AppText>

        <AppButton
          title={t("auth.session.backToSignIn")}
          onPress={onBackToSignIn}
          style={styles.button}
        />
      </View>
    </Modal>
  );
}

const getStyles = (
  colors: AppColors,
  screenPadding: number,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: screenPadding + 8,
      backgroundColor: colors.background,
    },

    iconWrap: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },

    title: {
      textAlign: "center",
      color: colors.onBackground,
    },

    body: {
      marginTop: 10,
      textAlign: "center",
      color: colors.onSurfaceMuted,
    },

    button: {
      marginTop: 28,
      minWidth: 220,
    },
  });
