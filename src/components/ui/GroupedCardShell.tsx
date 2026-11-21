import { Ionicons } from "@expo/vector-icons";

import React, {
  useMemo,
  type ReactNode,
} from "react";

import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

type GroupedCardShellProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function GroupedCardShell({
  icon,
  title,
  children,
  style,
}: GroupedCardShellProps) {
  const colors = useAppColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={icon}
            size={30}
            color={colors.headerContent}
          />

          <AppText
            variant="heading"
            style={styles.title}
          >
            {title}
          </AppText>
        </View>
      </View>

      {children}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      width: "100%",
      minHeight: 108,
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      flexDirection: "column",
      alignItems: "stretch",
      paddingHorizontal: 0,
      paddingVertical: 0,
      marginBottom: 2,
      overflow: "hidden",
    },
    header: {
      width: "100%",
      backgroundColor: colors.headerBackground,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    headerLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    },
    title: {
      color: colors.headerContent,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
      flexShrink: 1,
    },
  });
