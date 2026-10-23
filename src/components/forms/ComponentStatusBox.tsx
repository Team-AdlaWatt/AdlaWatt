import React from "react";
import {
  Image,
  ImageSourcePropType,
  View,
} from "react-native";

import {
  useElectronicsCardStyles,
} from "@/components/forms/electronicsCard";
import AppText from "@/components/ui/AppText";
import { useAppColors } from "@/hooks/useAppColors";

type ComponentStatus =
  | "Active"
  | "Inactive"
  | "Connected"
  | "Not Connected";

type ComponentStatusBoxProps = {
  name: string;
  status: ComponentStatus;
  imageSource?: ImageSourcePropType;
};

const defaultImage = require("@/assets/images/components/toph.jpg");

export default function ComponentStatusBox({
  name,
  status,
  imageSource = defaultImage,
}: ComponentStatusBoxProps) {
  const colors = useAppColors();
  const isActive =
    status === "Active" || status === "Connected";

  const statusColor = isActive
    ? colors.primary
    : colors.error;

  const electronicsCardStyles =
    useElectronicsCardStyles();

  return (
    <View
      style={[
        electronicsCardStyles.boxSlim,
        {
          borderColor: statusColor,
        },
      ]}
    >
      {/* Component Image */}
      <View
        style={[
          electronicsCardStyles.imageContainer,
          {
            borderColor: statusColor,
          },
        ]}
      >
        <Image
          source={imageSource}
          style={electronicsCardStyles.image}
          resizeMode="cover"
        />
      </View>

      {/* Component Name */}
      <AppText
        variant="caption"
        style={electronicsCardStyles.name}
        numberOfLines={2}
      >
        {name}
      </AppText>
    </View>
  );
}