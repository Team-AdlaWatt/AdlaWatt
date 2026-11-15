import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import MessagePanel from "@/components/ui/MessagePanel";
import { Routes } from "@/constants/routes";
import { useVibrationGuidance } from "@/hooks/useVibrationGuidance";

export default function VibrationGuidancePanel() {
  const { t } = useTranslation();
  const { visible, close, disableForever } =
    useVibrationGuidance();

  return (
    <MessagePanel
      visible={visible}
      title={t("guidance.vibration.title")}
      body={t("guidance.vibration.body")}
      hint={t("guidance.vibration.hint")}
      actionLabel={t(
        "guidance.vibration.openPreferences",
      )}
      checkboxLabel={t(
        "guidance.vibration.dontShowAgain",
      )}
      closeAccessibilityLabel={t(
        "guidance.vibration.closeA11y",
      )}
      onClose={close}
      onDontShowAgain={disableForever}
      onAction={() => {
        close();
        router.push({
          pathname: Routes.PREFERENCES,
          params: { focus: "vibration" },
        });
      }}
    />
  );
}
