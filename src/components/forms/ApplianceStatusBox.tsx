import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  ImageSourcePropType,
  View,
} from "react-native";

import {
  useApplianceCardStyles,
} from "@/components/forms/applianceCard";
import AppText from "@/components/ui/AppText";
import { useAppColors } from "@/hooks/useAppColors";

type StatusTone =
  | "ok"
  | "care"
  | "not";

type ApplianceStatusBoxProps = {
  name: string;
  wattage: string;
  status: string;
  statusTone?: StatusTone;
  imageSource?: ImageSourcePropType;
};

const defaultImage = require("@/assets/images/adlawatt-icon.png");

export default function ApplianceStatusBox({
  name,
  wattage,
  status,
  statusTone,
  imageSource = defaultImage,
}: ApplianceStatusBoxProps) {
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

  const applianceCardStyles =
    useApplianceCardStyles();

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
          ? applianceCardStyles.box
          : applianceCardStyles.boxTight,
        { borderColor: statusColor },
      ]}
    >
      {/* Appliance Image */}
      <View
        style={[
          applianceCardStyles.imageContainer,
          { borderColor: statusColor },
        ]}
      >
        <Image
          source={imageSource}
          style={applianceCardStyles.image}
          resizeMode="contain"
        />
      </View>

      {/* Appliance Name */}
      <AppText
        variant="caption"
        style={applianceCardStyles.name}
        numberOfLines={2}
      >
        {name}
      </AppText>

      {/* Wattage */}
      <AppText
        variant="caption"
        style={applianceCardStyles.watts}
      >
        {wattage}
      </AppText>

      {/* Status (not-advisable items show no pill:
          the active toggle segment already states it,
          so the red pill is redundant) */}
      {tone !== "not" && (
        <View
          style={[
            applianceCardStyles.status,
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
            style={applianceCardStyles.statusText}
          >
            {status}
          </AppText>
        </View>
      )}
    </View>
  );
}