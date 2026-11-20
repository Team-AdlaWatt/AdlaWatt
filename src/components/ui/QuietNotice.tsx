import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useTranslation } from "react-i18next";

interface QuietNoticeProps {
  message?: string;
  style?: ViewStyle;
}

export default function QuietNotice({
  message,
  style,
}: QuietNoticeProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const { connected } = useConnectivity();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const offline = connected === false;

  const title = offline
    ? t("shared.quietOfflineTitle")
    : t("shared.quietUnavailableTitle");

  const description =
    message ??
    (offline
      ? t("shared.quietOfflineMessage")
      : t("shared.quietUnavailableMessage"));

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name="cloud-offline-outline"
        size={22}
        color={colors.severity.elevated.text}
      />

      <View style={styles.textWrap}>
        <AppText
          variant="caption"
          style={styles.title}
        >
          {title}
        </AppText>

        <AppText
          variant="caption"
          style={styles.message}
        >
          {description}
        </AppText>
      </View>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      width: "100%",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor:
        colors.severity.elevated.bg,
      borderWidth: 2,
      borderColor:
        colors.severity.elevated.border,
      borderRadius: 12,
      padding: 12,
    },

    textWrap: {
      flex: 1,
    },

    title: {
      color: colors.severity.elevated.text,
      fontWeight: "700",
    },

    message: {
      color: colors.severity.elevated.text,
      marginTop: 2,
      lineHeight: 18,
    },
  });
