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
  type TextInputInstance,
  type TextInputProps,
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
import { PIN_LENGTH, sanitizePinInput } from "@/lib/pinValidation";

interface PinInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  inputRef?: Ref<TextInputInstance>;
  bottomGap?: number;
  editable?: boolean;
  infoAccessibilityLabel?: string;
  onInfoPress?: () => void;
  onInvalidInput?: () => void;
}

export default function PinInput({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  bottomGap,
  editable = true,
  infoAccessibilityLabel,
  onInfoPress,
  onInvalidInput,
}: PinInputProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const { scaledSize, family, weight } = useTypography();

  const resolvedLabel = label ?? t("pin.label");
  const resolvedPlaceholder =
    placeholder ?? t("pin.placeholder");

  const [showPin, setShowPin] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [progress] = useState(
    () => new Animated.Value(0),
  );

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const barAnim = useRef<Animated.CompositeAnimation | null>(null);

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

  const styles = useMemo(
    () => getStyles(colors, bottomGap),
    [colors, bottomGap],
  );

  const stopBar = () => {
    barAnim.current?.stop();
    barAnim.current = null;
  };

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

  const hidePin = () => {
    clearTimers();
    setShowPin(false);
    setRemaining(0);
  };

  const handleToggle = () => {
    if (showPin) {
      hidePin();
      return;
    }

    clearTimers();
    setShowPin(true);
    setRemaining(5);
    startBar();

    tickTimer.current = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    hideTimer.current = setTimeout(() => {
      hidePin();
    }, 5000);
  };

  const handleChange = (raw: string) => {
    const clean = sanitizePinInput(raw);
    onChangeText(clean);

    if (/[^0-9]/.test(raw)) {
      onInvalidInput?.();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <AppText variant="body" style={styles.label}>
          {resolvedLabel}
        </AppText>

        {onInfoPress ? (
          <Pressable
            onPress={onInfoPress}
            style={styles.infoButton}
            accessibilityRole="button"
            accessibilityLabel={
              infoAccessibilityLabel ?? t("pin.infoA11y")
            }
            hitSlop={8}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.field}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={!showPin}
          keyboardType="number-pad"
          maxLength={PIN_LENGTH}
          autoCapitalize="none"
          autoCorrect={false}
          allowFontScaling={false}
          editable={editable}
          importantForAutofill="no"
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
            showPin
              ? t("pin.hideA11y", { seconds: remaining })
              : t("pin.showA11y")
          }
          accessibilityHint={
            showPin
              ? t("pin.hideHint")
              : t("pin.showHint")
          }
          hitSlop={8}
        >
          <Ionicons
            name={showPin ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          showPin
            ? t("pin.visibleLive", { seconds: remaining })
            : undefined
        }
      >
        <View
          style={[
            styles.timerTrack,
            !showPin && styles.timerHidden,
          ]}
          aria-hidden={!showPin}
        >
          {showPin ? (
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

      {helper && !error ? (
        <AppText variant="caption" style={styles.helper}>
          {helper}
        </AppText>
      ) : null}

      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const getStyles = (colors: AppColors, bottomGap?: number) =>
  StyleSheet.create({
    container: {
      marginBottom: bottomGap ?? Field.fieldGap,
    },

    labelRow: {
      minHeight: Touch.target,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Field.labelGap - 4,
    },

    label: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: "600",
    },

    infoButton: {
      width: Touch.target,
      height: Touch.target,
      alignItems: "center",
      justifyContent: "center",
      marginRight: -12,
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

    helper: {
      marginTop: 6,
      color: colors.textSecondary,
    },

    error: {
      marginTop: 6,
      color: colors.error,
    },
  });
