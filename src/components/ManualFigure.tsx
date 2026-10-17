import { Ionicons } from "@expo/vector-icons";

import React, { useState } from "react";

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
import { Colors } from "@/constants/colors";

// ============================================================
// MANUAL FIGURE
//
// Screenshot figure used by the in-app User Manual. Two states:
//
// 1. Preview — a small fixed-height framed thumbnail inside the
//    section card. The card is a solid brand-green block with
//    white text (deliberately theme-independent), and the image
//    is cover-fit so it fills the frame edge to edge. The whole
//    frame is tappable and an expand icon overlays the
//    top-right corner as a visible affordance.
// 2. Full screen — reuses the shared DropdownModal shell (dim
//    overlay, centered card, title header, X close button at
//    the top right) so the enlarged image looks and behaves
//    like every other modal in the dashboard. This view uses
//    contain-fit, so the full screenshot is never cropped.
// ============================================================

/** Preview thumbnail height inside the card (small on purpose). */
const PREVIEW_HEIGHT = 170;

/** Fraction of the screen height used by the modal image. */
const MODAL_IMAGE_RATIO = 0.62;

// Fixed brand green for the preview card (frozen record, shared
// by both themes — see colors.ts). White on #00805A is 4.96:1,
// so the card intentionally ignores the theme palette's
// dark-mode fill (which would turn the green neutral and the
// text near-black). ManualOpenButton uses the same record.
const MANUAL_FIGURE_COLORS =
  Colors.light.manualFigure;

interface ManualFigureProps {
  source: ImageSourcePropType;
  /** Caption, e.g. "Figure 1 — Dashboard overview". */
  label: string;
}

export default function ManualFigure({
  source,
  label,
}: ManualFigureProps) {
  const { height: screenHeight } =
    useWindowDimensions();

  const [fullScreen, setFullScreen] =
    useState(false);

  const open = () => setFullScreen(true);
  const close = () => setFullScreen(false);

  return (
    <>
      {/* ---------- Small preview inside the card ---------- */}
      <View style={styles.frame}>
        <Pressable
          style={styles.preview}
          onPress={open}
          accessibilityRole="imagebutton"
          accessibilityLabel={`View ${label} full screen`}
        >
          {/* cover-fit: fills the frame edge to edge. The full,
              uncropped image lives in the modal below. */}
          <Image
            source={source}
            style={styles.previewImage}
            resizeMode="cover"
            accessibilityLabel={label}
          />

          {/* Expand affordance, top-right corner. */}
          <View
            style={styles.expandChip}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Ionicons
              name="expand-outline"
              size={16}
              color={MANUAL_FIGURE_COLORS.surface}
            />
          </View>
        </Pressable>

        <View style={styles.captionBlock}>
          <AppText
            variant="caption"
            style={styles.caption}
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

// Theme-independent by design: the green card and its white
// text come from the frozen manualFigure record (see
// colors.ts), so the stylesheet needs no palette.
const styles = StyleSheet.create({
  frame: {
    width: "100%",
    borderWidth: 1,
    borderColor: MANUAL_FIGURE_COLORS.surface,
    borderRadius: 12,
    marginTop: 10,
    overflow: "hidden",
    backgroundColor:
      MANUAL_FIGURE_COLORS.surface,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      MANUAL_FIGURE_COLORS.onSurface,
  },

  captionBlock: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: MANUAL_FIGURE_COLORS.divider,
  },

  caption: {
    color: MANUAL_FIGURE_COLORS.onSurface,
    textAlign: "center",
    fontWeight: "600",
  },

  captionHint: {
    color: MANUAL_FIGURE_COLORS.onSurfaceMuted,
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
