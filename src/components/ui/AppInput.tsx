import React, { useMemo, type Ref } from "react";
import {
  StyleSheet,
  TextInput,
  type TextInputInstance,
  TextInputProps,
  View,
} from "react-native";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import AppText from "@/components/ui/AppText";
import { Field } from "@/constants/sizing";
import { useTypography } from "@/hooks/useTypography";

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  inputRef?: Ref<TextInputInstance>;
  bottomGap?: number;
}

export default function AppInput({
  label,
  error,
  style,
  inputRef,
  bottomGap,
  ...props
}: AppInputProps) {
  const { scaledSize, family, weight } =
    useTypography();

  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors, bottomGap),
    [colors, bottomGap],
  );

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
      )}

      <TextInput
        {...props}
        ref={inputRef}
        allowFontScaling={false}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            fontSize: scaledSize(16),
            fontFamily: family,
            fontWeight: weight,
          },
          error ? styles.inputError : null,
          style,
        ]}
      />

      {error && (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      )}
    </View>
  );
}

const getStyles = (colors: AppColors, bottomGap?: number) =>
  StyleSheet.create({
  container: {
    marginBottom: bottomGap ?? Field.fieldGap,
  },

  label: {
    marginBottom: Field.labelGap,
    fontSize: 14,
    fontWeight: "600",
  },

input: {
  backgroundColor: colors.surface,
  color: colors.textSecondary,

  borderWidth: 1,
  borderColor: colors.border,

  borderRadius: 12,

  minHeight: Field.height,
  paddingHorizontal: Field.padding,
  paddingVertical: 14,

  fontSize: Field.textSize,
},

  inputError: {
    borderColor: colors.error,
  },

  error: {
    marginTop: 6,
    color: colors.error,
  },
});