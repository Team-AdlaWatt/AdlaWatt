import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  View,
} from "react-native";

import {
  Image,
  type ImageSource,
} from "expo-image";

import {
  useElectronicsCardStyles,
} from "@/components/forms/electronicsCard";
import AppText from "@/components/ui/AppText";
import { useAppColors } from "@/hooks/useAppColors";

type StatusTone =
  | "ok"
  | "care"
  | "not";

type ElectronicsStatusBoxProps = {
  name: string;
  wattage: string;
  status: string;
  statusTone?: StatusTone;
  imageSource?: ImageSource | number;
};

const defaultImage = require("@/assets/images/adlawatt-icon.png");

export default function ElectronicsStatusBox({
  name,
  wattage,
  status,
  statusTone,
  imageSource = defaultImage,
}: ElectronicsStatusBoxProps) {
  const colors = useAppColors();
  const tone: StatusTone =
    statusTone ?? (
      status === "OK to use"
        ? "ok"
        : "not"
    );

  const statusColor =
    tone === "care"
      ? colors.warning
      : tone === "not"
        ? colors.error
        : colors.primary;

  const electronicsCardStyles =
    useElectronicsCardStyles();

  const iconName =
    tone === "ok"
      ? "checkmark"
      : tone === "care"
        ? "warning"
        : "close";

  return (
    <View
      style={[
        tone !== "not"
          ? electronicsCardStyles.box
          : electronicsCardStyles.boxTight,
        { borderColor: statusColor },
      ]}
    >
      {/* Appliance Image */}
      <View
        style={[
          electronicsCardStyles.imageContainer,
          { borderColor: statusColor },
        ]}
      >
        <Image
          source={imageSource}
          style={electronicsCardStyles.image}
          contentFit="contain"
          // Disk-backed cache keeps custom photos warm
          // across launches (see ElectronicsBox).
          cachePolicy="memory-disk"
        />
      </View>

      {/* Appliance Name */}
      <AppText
        variant="caption"
        style={electronicsCardStyles.name}
        numberOfLines={2}
      >
        {name}
      </AppText>

      {/* Wattage */}
      <AppText
        variant="caption"
        style={electronicsCardStyles.watts}
      >
        {wattage}
      </AppText>

      {/* Status (not-advisable items show no pill:
          the active toggle segment already states it,
          so the red pill is redundant) */}
      {tone !== "not" && (
        <View
          style={[
            electronicsCardStyles.status,
            {
              backgroundColor:
                statusColor,
            },
          ]}
        >
          <Ionicons
            name={iconName}
            size={13}
            // Frozen pairing: white on the frozen status fill,
            // identical in both themes.
            color={colors.onPrimary}
          />

          <AppText
            variant="caption"
            style={electronicsCardStyles.statusText}
          >
            {status}
          </AppText>
        </View>
      )}
    </View>
  );
}