import * as ImagePicker from "expo-image-picker";
import {
  manipulateAsync,
  SaveFormat,
  type Action,
} from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
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
import { Radius } from "@/constants/theme";
import { Control } from "@/constants/sizing";
import { useTranslation } from "react-i18next";

// ============================================================
// MEDIA PICKER MODAL (LIBRARY ONLY)
// ============================================================
//
// DropdownModal shell like the rest of the system dialogs.
// Owns the whole pick flow — permission request, square-crop
// editor, type validation, and center-crop normalization to
// a 1:1 360px JPEG (web ignores the editor aspect, so
// non-square picks are cropped here) — and hands the caller
// a local uri. Uploading stays with the caller (it owns the
// row the photo belongs to).
//
// No camera path by design: library-only keeps permissions to
// photo access and skips device-camera testing entirely.
// ============================================================

const PHOTO_MAX_EDGE = 360;

export type PickedPhoto = {
  uri: string;
  mimeType?: string;
};

type MediaPickerModalProps = {
  visible: boolean;
  // Shows Remove when an uploaded photo already exists.
  hasPhoto: boolean;
  onSelect: (photo: PickedPhoto) => void;
  onRemove: () => void;
  onClose: () => void;
};

export default function MediaPickerModal({
  visible,
  hasPhoto,
  onSelect,
  onRemove,
  onClose,
}: MediaPickerModalProps) {
  const { t } = useTranslation();
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Fresh state on every open: a denied-permission error
  // from last time must not greet the next attempt.
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset transient dialog state on open
      setBusy(false);
      setError("");
    }
  }, [visible]);

  const handleLibrary = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError(t("media.permissionDenied"));
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          // SDK57: MediaTypeOptions deprecated — string array.
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        setError(t("media.unreadable"));
        return;
      }

      const width = asset.width ?? 0;
      const height = asset.height ?? 0;

      if (width <= 0 || height <= 0) {
        setError(t("media.unreadable"));
        return;
      }

      // Normalize every pick to a square 360px JPEG. The
      // editor already crops on native; web ignores the
      // aspect, so non-1:1 assets are center-cropped here.
      const side = Math.min(width, height);
      const target = Math.min(side, PHOTO_MAX_EDGE);

      const actions: Action[] = [];

      if (width !== height) {
        actions.push({
          crop: {
            originX: Math.floor((width - side) / 2),
            originY: Math.floor((height - side) / 2),
            width: side,
            height: side,
          },
        });
      }

      actions.push({
        resize: {
          width: target,
          height: target,
        },
      });

      const normalized = await manipulateAsync(
        asset.uri,
        actions,
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
        },
      );

      if (!normalized?.uri) {
        setError(t("media.processFailed"));
        return;
      }

      onSelect({
        uri: normalized.uri,
        mimeType: "image/jpeg",
      });
    } catch {
      setError(t("media.libraryFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownModal
      visible={visible}
      title={t("media.title")}
      onClose={onClose}
    >
      <Pressable
        onPress={handleLibrary}
        disabled={busy}
        style={({ pressed }) => [
          styles.optionButton,
          pressed && !busy && styles.pressed,
          busy && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("media.chooseA11y")}
        accessibilityHint={t("media.chooseHint")}
      >
        {busy ? (
          <ActivityIndicator
            size="small"
            color={colors.accentContent}
          />
        ) : (
          <Ionicons
            name="images-outline"
            size={22}
            color={colors.accentContent}
          />
        )}

        <AppText
          variant="caption"
          style={styles.optionText}
        >
          {busy ? t("media.opening") : t("media.chooseFromLibrary")}
        </AppText>
      </Pressable>

      {hasPhoto ? (
        <Pressable
          onPress={onRemove}
          disabled={busy}
          style={({ pressed }) => [
            styles.optionButton,
            styles.removeButton,
            pressed && !busy && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("media.removeA11y")}
          accessibilityHint={t("media.removeHint")}
        >
          <Ionicons
            name="trash-outline"
            size={22}
            color={colors.error}
          />

          <AppText
            variant="caption"
            style={styles.removeText}
          >
            {t("media.removePhoto")}
          </AppText>
        </Pressable>
      ) : null}

      {error ? (
        <AppText
          variant="caption"
          style={styles.error}
        >
          {error}
        </AppText>
      ) : null}

      <View style={styles.cancelRow}>
        <Pressable
          onPress={onClose}
          disabled={busy}
          style={({ pressed }) => [
            styles.optionButton,
            pressed && !busy && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("media.cancelChoiceA11y")}
        >
          <AppText
            variant="caption"
            style={styles.cancelText}
          >
            {t("shared.cancel")}
          </AppText>
        </Pressable>
      </View>
    </DropdownModal>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    optionButton: {
      width: "100%",
      minHeight: Control.button,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: Radius.md,
      marginBottom: 8,
    },

    removeButton: {
      borderColor: colors.error,
    },

    optionText: {
      color: colors.text,
      fontWeight: "700",
    },

    removeText: {
      color: colors.error,
      fontWeight: "700",
    },

    pressed: {
      opacity: 0.7,
    },

    disabled: {
      opacity: 0.6,
    },

    error: {
      color: colors.error,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 2,
    },

    cancelRow: {
      width: "100%",
      marginTop: 2,
    },

    cancelText: {
      color: colors.textSecondary,
      fontWeight: "700",
    },
  });
