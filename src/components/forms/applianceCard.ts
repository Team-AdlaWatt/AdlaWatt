import { useMemo } from "react";

import {
  StyleSheet,
  type ViewStyle,
} from "react-native";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Radius } from "@/constants/theme";

/*
 * Compact appliance card shared by:
 * - AppRecCard (dashboard recommendation carousel)
 * - ApplianceStatusBox (appliances screen)
 * - ApplianceBox (ApplianceModal selection)
 * - ComponentStatusBox (components screen)
 *
 * Keeping the sizing in one module stops the four boxes from drifting
 * apart over time. Colors resolve per theme via useApplianceCardStyles
 * so dark mode follows without duplicating the layout.
 */
/*
 * Shared card shell. `box` reserves room for the status badge used by
 * AppRecCard and ApplianceStatusBox; `boxTight` is the pill-less twin
 * (202, exact content sum) for not-advisable boxes whose badge was
 * removed; `boxCompact` is the modal version
 * used inside ApplianceModal for catalog and custom boxes alike (one
 * height keeps grid rows level; customs hold the 3-dot row in their
 * extra space, catalogs carry it as breathing room);
 * `boxSlim` fits just the image and name for ComponentStatusBox
 * (110 image + 8 + 40 name + 24 padding = 182, no slack).
 */
const applianceCardBox: ViewStyle = {
  width: "46%",
  maxWidth: 150,
  // Filled per theme by each variant below.
  backgroundColor: "transparent",
  borderWidth: 2,
  borderRadius: Radius.md,
  padding: 12,
  alignItems: "center",
  justifyContent: "flex-start",
  overflow: "hidden",
};

export function useApplianceCardStyles() {
  const colors = useAppColors();

  return useMemo(
    () => getApplianceCardStyles(colors),
    [colors],
  );
}

export const getApplianceCardStyles = (
  colors: AppColors,
) =>
  StyleSheet.create({
    box: {
      ...applianceCardBox,
      height: 240,
      backgroundColor: colors.surface,
    },

    boxTight: {
      ...applianceCardBox,
      // 24 padding + 110 image + 8 + 40 name + 2 + 18 watts
      // = 202, no slack. For not-advisable boxes whose
      // status pill was removed (both render sites filter
      // to one status per view, so rows stay level).
      height: 202,
      backgroundColor: colors.surface,
    },

    boxCompact: {
      ...applianceCardBox,
      // 202 base content + 4 gap + 28 dots row (customs render
      // the row; catalogs keep the space empty).
      height: 234,
      backgroundColor: colors.surface,
    },

    boxSlim: {
      ...applianceCardBox,
      height: 182,
      backgroundColor: colors.surface,
    },

    imageContainer: {
      width: 110,
      height: 110,
      flexShrink: 0,
      backgroundColor: colors.placeholder,
      borderWidth: 2,
      borderRadius: Radius.md,
      overflow: "hidden",
    },

    image: {
      width: "100%",
      height: "100%",
    },

    name: {
      width: "100%",
      minHeight: 40,
      flexShrink: 0,
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 20,
      textAlign: "center",
      marginTop: 8,
    },

    watts: {
      width: "100%",
      minHeight: 18,
      flexShrink: 0,
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
      marginTop: 2,
    },

    status: {
      maxWidth: "100%",
      minHeight: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderRadius: Radius.md,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginTop: 10,
      flexShrink: 0,
    },

    statusText: {
      color: colors.onPrimary,
      fontSize: 12,
      fontWeight: "700",
      flexShrink: 1,
    },
  });

/*
 * Centered wrap grid used by the appliances screen and the modal so the
 * compact cards stay grouped the same way AppRecCard centers its row.
 */
export const applianceCardGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 12,
};