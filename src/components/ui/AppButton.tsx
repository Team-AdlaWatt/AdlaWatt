import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Control } from "@/constants/sizing";
import AppText from "./AppText";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppButton({
  title,
  onPress,
  disabled = false,
  style,
}: AppButtonProps) {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <AppText variant="button">
        {title}
      </AppText>
    </Pressable>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
    minHeight: Control.button,
    marginTop: Control.buttonGapAbove,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: Control.buttonPadding,
    justifyContent: "center",
    alignItems: "center",
  },

  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    opacity: 0.7,
  },

  pressed: {
    backgroundColor: colors.primaryPressed,
    borderColor: colors.primaryPressed,
    opacity: 1,
  },
});