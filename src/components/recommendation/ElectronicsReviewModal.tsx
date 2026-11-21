import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Touch } from "@/constants/sizing";

export type ReviewItem = {
  id: string;
  name: string;
  watts: string;
  status: string;
};

type ElectronicsReviewModalProps = {
  visible: boolean;
  onClose: () => void;
  items: ReviewItem[];
  blocked: boolean;
  blockedReason?: string | null;
};

export default function ElectronicsReviewModal({
  visible,
  onClose,
  items,
  blocked,
  blockedReason,
}: ElectronicsReviewModalProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const styles = useMemo(
    () => createStyles(colors),
    [colors],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.card}
          accessibilityViewIsModal
          onPress={(event) =>
            event.stopPropagation()
          }
        >
          <View style={styles.header}>
            <AppText
              variant="heading"
              style={styles.title}
            >
              {t(
                "batteryProtection.reviewTitle",
              )}
            </AppText>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t(
                "batteryProtection.closeA11y",
              )}
              hitSlop={8}
            >
              <Ionicons
                name="close-outline"
                size={22}
                color={colors.text}
              />
            </Pressable>
          </View>

          <AppText
            variant="caption"
            style={styles.body}
          >
            {t("batteryProtection.reviewBody")}
          </AppText>

          {blocked ? (
            <AppText
              variant="caption"
              style={styles.blocked}
            >
              {blockedReason ??
                t("batteryProtection.blocked")}
            </AppText>
          ) : null}

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {items.length === 0 ? (
              <AppText
                variant="caption"
                style={styles.body}
              >
                {t(
                  "recommendationResult.reason.empty",
                )}
              </AppText>
            ) : (
              items.map((item) => (
                <View
                  key={item.id}
                  style={styles.item}
                >
                  <View style={styles.itemText}>
                    <AppText
                      variant="body"
                      style={styles.itemName}
                    >
                      {item.name}
                    </AppText>

                    <AppText
                      variant="caption"
                      style={styles.itemMeta}
                    >
                      {item.watts}
                    </AppText>
                  </View>

                  <AppText
                    variant="caption"
                    style={styles.itemStatus}
                  >
                    {item.status}
                  </AppText>
                </View>
              ))
            )}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t(
              "batteryProtection.done",
            )}
          >
            <AppText
              variant="body"
              style={styles.buttonText}
            >
              {t("batteryProtection.done")}
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: colors.overlay,
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    card: {
      backgroundColor: colors.elevated,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 12,
      maxHeight: "90%",
      padding: 18,
      width: "100%",
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      minHeight: Touch.target,
    },
    title: {
      color: colors.onSurface,
      flex: 1,
      fontSize: 18,
    },
    closeButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: Touch.target,
      minWidth: Touch.target,
    },
    body: {
      color: colors.onSurfaceMuted,
      lineHeight: 18,
    },
    blocked: {
      color: colors.warning,
      fontWeight: "600",
    },
    list: {
      flexGrow: 0,
      maxHeight: 320,
    },
    item: {
      alignItems: "center",
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    itemText: {
      flex: 1,
      gap: 2,
    },
    itemName: {
      color: colors.onSurface,
      fontWeight: "600",
    },
    itemMeta: {
      color: colors.onSurfaceMuted,
    },
    itemStatus: {
      color: colors.onSurfaceMuted,
      textAlign: "right",
    },
    button: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: "center",
      minHeight: Touch.target,
      paddingHorizontal: 18,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },
  });
