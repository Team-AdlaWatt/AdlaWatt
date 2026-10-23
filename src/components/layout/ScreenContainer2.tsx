import React, { ReactNode, useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import NavBarBottom from "@/components/layout/NavBarBottom";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import { useScreenPadding } from "@/constants/sizing";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import type { ScrollToTopController } from "@/hooks/useScrollToTopController";

interface ScreenContainer2Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollToTop?: ScrollToTopController;
}

// Dashboard container. Consumes the dashboard-level
// SettingsProvider from app/dashboard/_layout (no nested
// provider so Save in Menu propagates to all dashboard
// screens via the shared instance). Content centers in a
// wide column on tablets; phones use full width.

export default function ScreenContainer2({
  children,
  style,
  scrollToTop,
}: ScreenContainer2Props) {
  const colors = useAppColors();
  const screenPadding = useScreenPadding();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.content, style]}>
        {children}

        {scrollToTop ? (
          <ScrollToTopButton
            enabled={scrollToTop.enabled}
            onPress={scrollToTop.scrollToTop}
            rightOffset={screenPadding}
            bottomOffset={16}
          />
        ) : null}
      </View>

      {/* Bottom nav sits in normal flow so it never overlaps
          the scrollable content above it. */}
      <NavBarBottom />
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      flex: 1,
      width: "100%",
      maxWidth: 768,
      alignSelf: "center",
    },
  });