import { Ionicons } from "@expo/vector-icons";

import React, {
  useMemo,
  useState,
} from "react";

import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { DropdownModal } from "@/components/ui/DropdownModal";
import AppText from "@/components/ui/AppText";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

// ============================================================
// MANUAL FIGURE
//
// Screenshot figure used by the in-app User Manual. Two states:
//
// 1. Preview — a small (fixed-height, contain-fit) framed
//    thumbnail inside the section card. The whole frame is
//    tappable and an expand icon overlays the top-right corner
//    as a visible affordance.
// 2. Full screen — reuses the shared DropdownModal shell (dim
//    overlay, centered card, title header, X close button at
//    the top right) so the enlarged image looks and behaves
//    like every other modal in the dashboard.
// ============================================================

/** Preview thumbnail height inside the card (small on purpose). */
const PREVIEW_HEIGHT = 170;

/** Fraction of the screen height used by the modal image. */
const MODAL_IMAGE_RATIO = 0.62;

interface ManualFigureProps {
  source: ImageSourcePropType;
  /** Caption, e.g. "Figure 1 — Dashboard overview". */
  label: string;
}

export default function ManualFigure({
  source,
  label,
}: ManualFigureProps) {
  const colors = useAppColors();
  const { height: screenHeight } =
    useWindowDimensions();

  const [fullScreen, setFullScreen] =
    useState(false);

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const open = () => setFullScreen(true);
  const close = () => setFullScreen(false);

  return (
    <>
      {/* ---------- Small preview inside the card ---------- */}
      <View
        style={[
          styles.frame,
          { borderColor: colors.border },
        ]}
      >
        <Pressable
          style={styles.preview}
          onPress={open}
          accessibilityRole="imagebutton"
          accessibilityLabel={`View ${label} full screen`}
        >
          <Image
            source={source}
            style={styles.previewImage}
            resizeMode="contain"
            accessibilityLabel={label}
          />

          {/* Expand affordance, top-right corner. */}
          <View
            style={[
              styles.expandChip,
              {
                backgroundColor:
                  colors.elevated,
                borderColor: colors.border,
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Ionicons
              name="expand-outline"
              size={16}
              color={colors.text}
            />
          </View>
        </Pressable>

        <View style={styles.captionBlock}>
          <AppText
            variant="caption"
            style={[
              styles.caption,
              { color: colors.text },
            ]}
          >
            {label}
          </AppText>

          <AppText
            variant="caption"
            style={styles.captionHint}
          >
            Tap to view full screen
          </AppText>
        </View>
      </View>

      {/* ---------- Full-screen modal (dropdown style) ---------- */}
      <DropdownModal
        visible={fullScreen}
        title={label}
        onClose={close}
      >
        <View style={styles.modalImageWrap}>
          <Image
            source={source}
            style={[
              styles.modalImage,
              {
                height: Math.round(
                  screenHeight *
                    MODAL_IMAGE_RATIO,
                ),
              },
            ]}
            resizeMode="contain"
            accessibilityLabel={label}
          />
        </View>
      </DropdownModal>
    </>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    frame: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 12,
      marginTop: 10,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },

    preview: {
      width: "100%",
      height: PREVIEW_HEIGHT,
      justifyContent: "center",
    },

    previewImage: {
      width: "100%",
      height: "100%",
    },

    expandChip: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    captionBlock: {
      width: "100%",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    caption: {
      textAlign: "center",
      fontWeight: "600",
    },

    captionHint: {
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
    },

    modalImageWrap: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },

    modalImage: {
      width: "100%",
    },
  });
