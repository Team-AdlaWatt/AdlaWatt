import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Field, Touch } from "@/constants/sizing";
import { useTypography } from "@/hooks/useTypography";
import { useTranslation } from "react-i18next";

interface PasswordInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  autoComplete?: TextInputProps["autoComplete"];
  inputRef?: Ref<TextInput>;
  bottomGap?: number;
  editable?: boolean;
}

// ============================================================
// PASSWORD INPUT
//
// Mirrors AppInput visuals (label, field, error) but owns its
// TextInput so the eye toggle can center on the field itself.
// The old fixed `top: 42` anchored the icon to the whole
// container (label + input), so label height or font scaling
// pushed it off-center. The toggle now stretches the field
// height (`top: 0, bottom: 0`) with centered content.
// ============================================================

export default function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  returnKeyType,
  onSubmitEditing,
  autoComplete,
  inputRef,
  bottomGap,
  editable = true,
}: PasswordInputProps) {
  const { t } = useTranslation();

  const resolvedLabel =
    label ?? t("passwordInput.labelPassword");
  const resolvedPlaceholder =
    placeholder ?? t("passwordInput.placeholderPassword");

  const [showPassword, setShowPassword] = useState(false);
  // 5s visibility window: `remaining` drives screen-reader
  // announcements (1s steps); the green bar itself slides
  // continuously via `progress` so it never steps frame-by-frame.
  const [remaining, setRemaining] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stable progress value without render-phase ref access
  // (react-hooks/refs). Lazy useState preserves identity.
  const [progress] = useState(
    () => new Animated.Value(0),
  );
  const barAnim =
    useRef<Animated.CompositeAnimation | null>(null);

  const stopBar = () => {
    barAnim.current?.stop();
    barAnim.current = null;
  };

  const clearTimers = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
    barAnim.current?.stop();
    barAnim.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const startBar = () => {
    stopBar();
    progress.setValue(1);
    barAnim.current = Animated.timing(progress, {
      toValue: 0,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    barAnim.current.start();
  };

  const handleToggle = () => {
    if (showPassword) {
      clearTimers();
      setShowPassword(false);
      setRemaining(0);
      return;
    }

    setShowPassword(true);
    setRemaining(5);
    clearTimers();
    startBar();

    tickTimer.current = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    hideTimer.current = setTimeout(() => {
      clearTimers();
      setShowPassword(false);
      setRemaining(0);
    }, 5000);
  };

  const { scaledSize, family, weight } =
    useTypography();

  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors, bottomGap),
    [colors, bottomGap],
  );

  return (
    <View style={styles.container}>
      <AppText variant="body" style={styles.label}>
        {resolvedLabel}
      </AppText>

      <View style={styles.field}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={resolvedPlaceholder}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          allowFontScaling={false}
          editable={editable}
          placeholderTextColor={colors.textSecondary}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={[
            styles.input,
            {
              fontSize: scaledSize(16),
              fontFamily: family,
              fontWeight: weight,
            },
            error ? styles.inputError : null,
          ]}
        />

        <Pressable
          style={styles.toggle}
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={
            showPassword
              ? t("passwordInput.hideA11y", {
                  seconds: remaining,
                })
              : t("passwordInput.showA11y")
          }
          accessibilityHint={
            showPassword
              ? t("passwordInput.hideHint")
              : t("passwordInput.showHint")
          }
          hitSlop={8}
        >
          <Ionicons
            name={
              showPassword
                ? "eye-off-outline"
                : "eye-outline"
            }
            size={22}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Fixed timer slot: always occupies the same space so
          content below (e.g. "forgot password?") never shifts.
          The countdown text is intentionally not rendered;
          screen readers still get it via accessibilityLabel. */}
      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          showPassword
            ? t("passwordInput.visibleLive", {
                seconds: remaining,
              })
            : undefined
        }
      >
        <View
          style={[
            styles.timerTrack,
            !showPassword && styles.timerHidden,
          ]}
          aria-hidden={!showPassword}
        >
          {showPassword ? (
            <Animated.View
              style={[
                styles.timerFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          ) : null}
        </View>
      </View>

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

    field: {
      position: "relative",
      justifyContent: "center",
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
      paddingRight: 52,

      fontSize: Field.textSize,
    },

    inputError: {
      borderColor: colors.error,
    },

    toggle: {
      position: "absolute",
      right: 4,
      top: 0,
      bottom: 0,
      width: Touch.target,
      alignItems: "center",
      justifyContent: "center",
    },

    error: {
      marginTop: 6,
      color: colors.error,
    },

    hint: {
      marginTop: 6,
      color: colors.textSecondary,
    },

    timerTrack: {
      marginTop: 6,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
      overflow: "hidden",
    },

    timerHidden: {
      opacity: 0,
    },

    timerFill: {
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
  });
