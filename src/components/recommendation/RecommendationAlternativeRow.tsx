import React, { useMemo } from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";

import AppText from "@/components/ui/AppText";
import { CATALOG_IMAGES } from "@/constants/electronicsCatalog";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import type { SelectionAlternative } from "@/services/recommendationSelection";

import RecommendationBadge from "./RecommendationBadge";

const DEFAULT_IMAGE = require(
  "@/assets/images/adlawatt-icon.png",
);

type RecommendationAlternativeRowProps = {
  alternative: SelectionAlternative;
};

export default function RecommendationAlternativeRow({
  alternative,
}: RecommendationAlternativeRowProps) {
  const colors = useAppColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  const imageSource: ImageSourcePropType =
    alternative.imageUrl
      ? { uri: alternative.imageUrl }
      : CATALOG_IMAGES[
          alternative.imageKey ?? ""
        ] ?? DEFAULT_IMAGE;

  return (
    <View style={styles.row}>
      <Image
        source={imageSource}
        style={styles.thumbnail}
        resizeMode="contain"
      />

      <View style={styles.content}>
        <AppText
          variant="body"
          numberOfLines={2}
          style={styles.name}
        >
          {alternative.name}
        </AppText>

        <AppText
          variant="caption"
          style={styles.meta}
        >
          {alternative.area
            ? `${alternative.area} · `
            : ""}
          {alternative.watts}
        </AppText>

        <RecommendationBadge
          verdict={alternative.verdict}
          compact
        />
      </View>

      <AppText
        variant="caption"
        style={styles.runtime}
      >
        {alternative.displayRuntime}
      </AppText>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      gap: 12,
      minHeight: 64,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    thumbnail: {
      height: 44,
      width: 44,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    name: {
      color: colors.onSurface,
      fontSize: 14,
      fontWeight: "600",
    },
    meta: {
      color: colors.onSurfaceMuted,
    },
    runtime: {
      alignSelf: "flex-start",
      color: colors.onSurface,
      fontWeight: "600",
    },
  });
