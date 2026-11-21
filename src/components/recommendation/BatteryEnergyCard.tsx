import React from "react";

import type { StyleProp, ViewStyle } from "react-native";

import { useTranslation } from "react-i18next";

import BatteryEnergyHighlight from "@/components/recommendation/BatteryEnergyHighlight";
import GroupedCardShell from "@/components/ui/GroupedCardShell";

import type { BatteryEnergySnapshot } from "@/services/batteryEnergy";
import type { SelectionEvaluation } from "@/services/recommendationSelection";

type BatteryEnergyCardProps = {
  snapshot: BatteryEnergySnapshot;
  evaluation?: SelectionEvaluation | null;
  style?: StyleProp<ViewStyle>;
};

export default function BatteryEnergyCard({
  snapshot,
  evaluation,
  style,
}: BatteryEnergyCardProps) {
  const { t } = useTranslation();

  return (
    <GroupedCardShell
      icon="flash-outline"
      title={t("batteryEnergy.title")}
      style={style}
    >
      <BatteryEnergyHighlight
        snapshot={snapshot}
        evaluation={evaluation}
        variant="body"
      />
    </GroupedCardShell>
  );
}
