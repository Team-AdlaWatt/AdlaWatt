import React, { useMemo } from "react";

import { Ionicons } from "@expo/vector-icons";

import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  DropdownModal,
} from "@/components/ui/DropdownModal";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  BATTERY_MAX_ELECTRONICS_W,
} from "@/constants/battery";
import {
  Radius,
} from "@/constants/theme";
import { Control, Field } from "@/constants/sizing";
import { useTypography } from "@/hooks/useTypography";

// ============================================================
// CUSTOM ELECTRONICS MODAL (ADD + EDIT)
//
// Shared DropdownModal shell (same overlay, centered card,
// and header as CalendarModal) for both flows. Add flow is
// driven by ElectronicsModal; edit flow reuses this exact
// layout prefilled with the custom electronics values, so
// both dialogs look identical apart from title + confirm.
// ============================================================

type CustomElectronicsModalProps = {

  visible: boolean;
  mode?: "add" | "edit";
  name: string;
  watts: string;
  error: string;
  onNameChange: (text: string) => void;
  onWattsChange: (text: string) => void;
  onCancel: () => void;
  onAdd: () => void;
  onSave?: () => void;
  // Live interval validity from the parent (same rules as
  // submit): the confirm button can't move forward on
  // incomplete or reversed intervals.
  wattsValid: boolean;
  // Photo preview to display: a freshly picked local uri or
  // the stored uploaded url. Null renders the bundled
  // adlawatt icon — the default for every custom electronics.
  photoPreview: string | null;
  // True while a photo upload is in flight: the confirm
  // button dims into a Saving state.
  photoBusy: boolean;
  onPhotoPress: () => void;
};

const defaultPhoto = require(
  "@/assets/images/adlawatt-icon.png",
);

// Twin wattage inputs share the parent's single "min-max"
// string: split for display, rejoin on edit. The parent's
// validation, prefill, and resets work unchanged.
// Strict per-side rule: digits, one dot, max 2 decimals,
// max 3 integer digits, integer value at most
// BATTERY_MAX_ELECTRONICS_W. Empty
// is always fine (deletion never blocked). Rejected
// keystrokes keep the previous text with no error flash.
const splitWatts = (watts: string): [string, string] => {
  const dash = watts.indexOf("-");

  if (dash < 0) {
    return [watts, ""];
  }

  return [watts.slice(0, dash), watts.slice(dash + 1)];
};

const sanitizeWattSide = (
  text: string,
): string | null => {
  const clean = text.replace(/-/g, "");

  if (clean === "") {
    return "";
  }

  if (!/^\d{0,3}(\.\d{0,2})?$/.test(clean)) {
    return null;
  }

  const intPart = clean.split(".")[0] ?? "";

  if (intPart !== "" && Number(intPart) > BATTERY_MAX_ELECTRONICS_W) {
    return null;
  }

  return clean;
};

const joinWatts = (min: string, max: string): string => {
  if (!min && !max) {
    return "";
  }

  return `${min}-${max}`;
};

const isValidElectronicsName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return /^[a-zA-Z0-9\s\-\(\)\.]+$/.test(trimmed);
};

export default function CustomElectronicsModal({
  visible,
  mode = "add",
  name,
  watts,
  error,
  onNameChange,
  onWattsChange,
  onCancel,
  onAdd,
  onSave,
  wattsValid,
  photoPreview,
  photoBusy,
  onPhotoPress,
}: CustomElectronicsModalProps) {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const { scaledSize, family, weight } =
    useTypography();

  const inputFontStyle = {
    fontSize: scaledSize(14),
    fontFamily: family,
    fontWeight: weight,
  };

  const isEdit = mode === "edit";
  const title = isEdit
    ? "Edit Custom Electronics"
    : "Add Custom Electronics";
  const confirmLabel = isEdit ? "Save" : "Add";
  const handleConfirm = isEdit
    ? (onSave ?? onAdd)
    : onAdd;

  const [wattMin, wattMax] = splitWatts(watts);
  const nameValid = isValidElectronicsName(name);
  const showNameError = name.trim().length > 0 && !nameValid;

  const handleWattMinChange = (text: string) => {
    const clean = sanitizeWattSide(text);

    if (clean === null) {
      return;
    }

    onWattsChange(joinWatts(clean, wattMax));
  };

  const handleWattMaxChange = (text: string) => {
    const clean = sanitizeWattSide(text);

    if (clean === null) {
      return;
    }

    onWattsChange(joinWatts(wattMin, clean));
  };

  return (
    <DropdownModal
      visible={visible}
      title={title}
      onClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <AppText
            variant="caption"
            style={styles.infoNote}
          >
            Check the electronics wattage first, for
            example, soldering wire may use 15-25W.
          </AppText>

          {/* Photo display on top, picker button below it,
              with a section break before the fields. */}
          <View style={styles.photoDisplay}>
            <Image
              source={
                photoPreview
                  ? { uri: photoPreview }
                  : defaultPhoto
              }
              style={styles.photoDisplayImage}
              resizeMode="contain"
              accessibilityLabel={
                photoPreview
                  ? "Custom electronics photo"
                  : "Default electronics icon"
              }
            />
          </View>

          <Pressable
            onPress={onPhotoPress}
            disabled={photoBusy}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && !photoBusy && styles.pressed,
              photoBusy && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              photoPreview
                ? "Change electronics photo"
                : "Add electronics photo"
            }
            accessibilityHint="Opens the photo picker"
          >
            <Ionicons
              name="camera"
              size={20}
              color={colors.onPrimary}
            />

            <AppText
              variant="caption"
              style={styles.photoButtonText}
            >
              {photoPreview
                ? "Change Photo"
                : "Add Photo"}
            </AppText>
          </Pressable>

          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Enter valid electronics name"
            placeholderTextColor={
              colors.textSecondary
            }
            allowFontScaling={false}
            style={[styles.input, inputFontStyle]}
            accessibilityLabel={
              isEdit
                ? "Edit custom electronics name"
                : "Add custom electronics name"
            }
          />

          {showNameError ? (
            <AppText
              variant="caption"
              style={styles.nameError}
            >
              Must be valid electronics name
            </AppText>
          ) : null}

          <View style={styles.wattsRow}>
            <TextInput
              value={wattMin}
              onChangeText={handleWattMinChange}
              placeholder="Min (W)"
              placeholderTextColor={
                colors.textSecondary
              }
              allowFontScaling={false}
              style={[
                styles.input,
                styles.wattsInput,
                inputFontStyle,
              ]}
              keyboardType="numeric"
              accessibilityLabel={
                isEdit
                  ? "Edit minimum wattage"
                  : "Add minimum wattage"
              }
            />

            <AppText style={styles.wattsDash}>
              –
            </AppText>

            <TextInput
              value={wattMax}
              onChangeText={handleWattMaxChange}
              placeholder="Max (W)"
              placeholderTextColor={
                colors.textSecondary
              }
              allowFontScaling={false}
              style={[
                styles.input,
                styles.wattsInput,
                inputFontStyle,
              ]}
              keyboardType="numeric"
              accessibilityLabel={
                isEdit
                  ? "Edit maximum wattage"
                  : "Add maximum wattage"
              }
            />
          </View>

          {error ? (
            <AppText
              variant="caption"
              style={styles.customError}
            >
              {error}
            </AppText>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.customActions}>
            <Pressable
              onPress={onCancel}
              disabled={photoBusy}
              style={({ pressed }) => [
                styles.customAction,
                styles.cancelAction,
                pressed && !photoBusy && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isEdit
                  ? "Cancel edit custom electronics"
                  : "Cancel add custom electronics"
              }
            >
              <AppText
                variant="caption"
                style={styles.cancelText}
              >
                Cancel
              </AppText>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={
                !nameValid || !wattsValid || photoBusy
              }
              style={({ pressed }) => [
                styles.customAction,
                styles.addAction,
                pressed && nameValid && wattsValid && !photoBusy && styles.pressed,
                photoBusy && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isEdit
                  ? "Save custom electronics"
                  : "Add custom electronics"
              }
            >
              <AppText
                variant="caption"
                style={styles.addText}
              >
                {photoBusy ? "Saving…" : confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </DropdownModal>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    keyboardAvoid: {
      width: "100%",
    },

    scrollView: {
      width: "100%",
      maxHeight: 420,
    },

    scrollContent: {
      width: "100%",
      paddingBottom: 4,
    },

    infoNote: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 10,
    },

    photoDisplay: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: Radius.md,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },

    photoDisplayImage: {
      width: "100%",
      height: "100%",
    },

    photoButton: {
      width: "100%",
      minHeight: Control.button,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: Radius.md,
      marginBottom: 16,
    },

    photoButtonText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    input: {
      minHeight: Field.minHeight,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 14,
      marginBottom: 8,
    },

    wattsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },

    wattsInput: {
      flex: 1,
      marginBottom: 0,
    },

    wattsDash: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: "700",
    },

    nameError: {
      color: colors.error,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 8,
      marginTop: -2,
    },

    customError: {
      color: colors.error,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 2,
    },

    footer: {
      width: "100%",
      paddingTop: 4,
    },

    customActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
    },

    customAction: {
      flex: 1,
      minHeight: Control.button,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderRadius: Radius.md,
    },

    cancelAction: {
      borderColor: colors.error,
    },

    addAction: {
      borderColor: colors.primary,
    },

    cancelText: {
      color: colors.error,
      fontWeight: "700",
    },

    addText: {
      color: colors.accentContent,
      fontWeight: "700",
    },

    pressed: {
      opacity: 0.7,
    },
  });
