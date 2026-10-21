import { Ionicons } from "@expo/vector-icons";

import React from "react";

import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { router, type Href } from "expo-router";

import AppText from "@/components/ui/AppText";
import { Colors } from "@/constants/colors";
import { Touch } from "@/constants/sizing";

// ============================================================
// MANUAL OPEN BUTTON
//
// Live-navigation card for the in-app User Manual: every figure
// in the manual is a real dashboard screen, so the manual offers
// a button instead of a screenshot and the user lands on the
// live screen with real data.
//
// Same visual language as the manual's figure cards used to be
// (frozen brand green with white type, shared via the
// manualFigure record in colors.ts).
//
// There is no navigation stack in this app (root + dashboard
// layouts are Slots), so returning to the manual is the bottom
// tab route Menu -> User Manual; the screen header carries
// that hint once instead of repeating it per button.
// ============================================================

const MANUAL_FIGURE_COLORS =
  Colors.light.manualFigure;

interface ManualOpenButtonProps {
  /** Screen name shown on the button, e.g. "Electronics". */
  label: string;
  /** Target dashboard route (typed routes are enforced). */
  route: Href;
  /** Leading icon matching the target screen. */
  icon: keyof typeof Ionicons.glyphMap;
}

export default function ManualOpenButton({
  label,
  route,
  icon,
}: ManualOpenButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
      onPress={() => router.push(route)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label} screen`}
    >
      <View style={styles.row}>
        <Ionicons
          name={icon}
          size={22}
          color={MANUAL_FIGURE_COLORS.onSurface}
        />

        <AppText
          variant="body"
          style={styles.label}
        >
          {`Open ${label}`}
        </AppText>

        <Ionicons
          name="arrow-forward"
          size={18}
          color={MANUAL_FIGURE_COLORS.onSurfaceMuted}
        />
      </View>
    </Pressable>
  );
}

// Theme-independent by design: the frozen manualFigure record in
// colors.ts, so the stylesheet needs no palette.
const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: Touch.target,
    borderWidth: 1,
    borderColor: MANUAL_FIGURE_COLORS.surface,
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor:
      MANUAL_FIGURE_COLORS.surface,
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.85,
  },

  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  label: {
    flex: 1,
    color: MANUAL_FIGURE_COLORS.onSurface,
    fontWeight: "700",
    fontSize: 15,
  },
});
