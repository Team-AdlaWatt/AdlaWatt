import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import {
  AccessibilityInfo,
  StyleSheet,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";

import AppButton from "@/components/ui/AppButton";
import AppText from "@/components/ui/AppText";
import { DropdownModal } from "@/components/ui/DropdownModal";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Control } from "@/constants/sizing";
import { Radius } from "@/constants/theme";

interface PinInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PinInfoModal({
  visible,
  onClose,
}: PinInfoModalProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const title = t("pin.infoTitle");

  useEffect(() => {
    if (!visible) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(title);
  }, [visible, title]);

  const rules = [
    t("pin.infoRule1"),
    t("pin.infoRule2"),
    t("pin.infoRule3"),
    t("pin.infoRule4"),
    t("pin.infoRule5"),
    t("pin.infoRule6"),
  ];

  return (
    <DropdownModal
      visible={visible}
      title={title}
      onClose={onClose}
    >
      <View
        style={styles.body}
        accessibilityViewIsModal
      >
        <AppText
          variant="caption"
          style={styles.intro}
        >
          {t("pin.infoIntro")}
        </AppText>

        {rules.map((rule) => (
          <View style={styles.ruleRow} key={rule}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={colors.primary}
              style={styles.ruleIcon}
            />

            <AppText
              variant="caption"
              style={styles.ruleText}
            >
              {rule}
            </AppText>
          </View>
        ))}

        <AppButton
          title={t("pin.gotIt")}
          onPress={onClose}
          style={styles.action}
        />
      </View>
    </DropdownModal>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    body: {
      width: "100%",
    },

    intro: {
      color: colors.textSecondary,
      lineHeight: 20,
    },

    ruleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginTop: 12,
    },

    ruleIcon: {
      marginTop: 1,
    },

    ruleText: {
      flex: 1,
      color: colors.text,
      lineHeight: 20,
    },

    action: {
      marginTop: Control.buttonGap,
      borderRadius: Radius.md,
    },
  });
