import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import Copyright from "@/components/ui/Copyright";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import AppText from "@/components/ui/AppText";
import {
  DropdownModal,
  RadioOptionRow,
} from "@/components/ui/DropdownModal";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Radius } from "@/constants/theme";
import {
  Control,
  useScreenPadding,
} from "@/constants/sizing";
import { Routes } from "@/constants/routes";
import type { ThemeOption } from "@/constants/colors";

import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { useScrollToTopController } from "@/hooks/useScrollToTopController";

import {
  getCurrentUserProfile,
} from "@/services/auth";
import { logSettings } from "@/services/activityLogService";
import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";
import {
  FONT_FAMILY_OPTIONS,
  type FontFamilyOption,
  type FontSizeOption,
} from "@/services/typography";
import {
  loadCachedEmailNotifications,
  loadLanguageSetting,
  loadMessagePanelSetting,
  loadRemindersSetting,
  loadVibrationSetting,
  saveCachedEmailNotifications,
  saveMessagePanelSetting,
  saveRemindersSetting,
  saveVibrationSetting,
} from "@/services/settings";
import {
  ACTIVE_LANGUAGES,
  setAppLanguage,
  type AppLanguage,
} from "@/services/i18n";
import {
  stopAlertVibration,
  syncAlertVibration,
} from "@/services/alertVibration";
import {
  cancelAllReminders,
  ensureEveningReminder,
} from "@/services/reminderService";

export default function PreferencesScreen() {
  const { t, i18n } = useTranslation();
  const colors = useAppColors();
  const screenPadding = useScreenPadding();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const scrollRef = useRef<ScrollView | null>(
    null,
  );
  const scrollToTop =
    useScrollToTopController(scrollRef);

  // ============================================
  // APPEARANCE DRAFTS
  //
  // Typography + theme edits apply on Save; Cancel
  // discards back to the saved values.
  // ============================================

  const {
    prefs: savedTypography,
    setPreferences: commitTypography,
  } = useSettings();

  const {
    theme: savedTheme,
    resolvedTheme: savedResolvedTheme,
    setTheme: commitTheme,
  } = useTheme();

  const [themeDraft, setThemeDraft] =
    useState<ThemeOption>("system");

  const [fontSize, setFontSize] =
    useState<FontSizeOption>("Medium");

  const [fontFamily, setFontFamily] =
    useState<FontFamilyOption>("Inter");

  const [fontFamilyOpen, setFontFamilyOpen] =
    useState(false);

  // ============================================
  // LANGUAGE
  // ============================================

  const [languageCode, setLanguageCode] =
    useState<AppLanguage>("en");

  const [languageOpen, setLanguageOpen] =
    useState(false);

  useEffect(() => {
    let active = true;

    loadLanguageSetting().then((loaded) => {
      if (active) {
        setLanguageCode(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const current = i18n.language;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local code with i18n language
    setLanguageCode(
      current === "fil" || current === "ceb"
        ? current
        : "en",
    );
  }, [i18n.language]);

  const languageLabel =
    ACTIVE_LANGUAGES.find(
      (item) => item.code === languageCode,
    )?.label ?? t("menu.englishName");

  const handleLanguageSelect = (
    code: AppLanguage,
  ) => {
    setLanguageOpen(false);
    void setAppLanguage(code);
  };

  // ============================================
  // IMMEDIATE DEVICE TOGGLES
  // ============================================

  const [vibration, setVibration] =
    useState(true);

  useEffect(() => {
    let active = true;

    loadVibrationSetting().then((loaded) => {
      if (active) {
        setVibration(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleVibrationToggle = (
    next: boolean,
  ) => {
    setVibration(next);
    void saveVibrationSetting(next);

    if (next) {
      void syncAlertVibration();
    } else {
      stopAlertVibration();
    }
  };

  const [reminders, setReminders] =
    useState(true);

  useEffect(() => {
    let active = true;

    loadRemindersSetting().then((loaded) => {
      if (active) {
        setReminders(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleRemindersToggle = (
    next: boolean,
  ) => {
    setReminders(next);
    void saveRemindersSetting(next);

    if (next) {
      void ensureEveningReminder();
    } else {
      void cancelAllReminders();
    }
  };

  const [messagePanel, setMessagePanel] =
    useState(true);

  useEffect(() => {
    let active = true;

    loadMessagePanelSetting().then((loaded) => {
      if (active) {
        setMessagePanel(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleMessagePanelToggle = (
    next: boolean,
  ) => {
    setMessagePanel(next);
    void saveMessagePanelSetting(next);
  };

  // ============================================
  // EMAIL (STAGED, SERVER-BACKED)
  // ============================================

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [savedEmailNotifications, setSavedEmailNotifications] =
    useState(true);

  // Paint the last confirmed value from cache before the
  // server load settles, so an offline open never flashes ON.
  useEffect(() => {
    const hydrateEmailSwitch = async () => {
      const user = await getAuthenticatedUserSafe();

      const cached = await loadCachedEmailNotifications(
        user?.id ?? null,
      );

      if (cached !== null) {
        setEmailNotifications(cached);
        setSavedEmailNotifications(cached);
      }
    };

    hydrateEmailSwitch();
  }, []);

  useEffect(() => {
    const loadEmailPreference = async () => {
      const result = await getCurrentUserProfile();

      if (!result.success) {
        return;
      }

      const value =
        result.emailNotifications ?? true;

      setEmailNotifications(value);
      setSavedEmailNotifications(value);

      await saveCachedEmailNotifications(
        value,
        result.userId,
      );
    };

    loadEmailPreference();
  }, []);

  useEffect(() => {
    // Re-hydrate drafts whenever the committed values land.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync drafts with saved values
    setFontSize(savedTypography.fontSize);
    setFontFamily(savedTypography.fontFamily);
    setThemeDraft(savedTheme);
    setEmailNotifications(savedEmailNotifications);
  }, [
    savedTypography,
    savedTheme,
    savedEmailNotifications,
  ]);

  // ============================================
  // GUIDANCE DEEP-LINK
  //
  // /dashboard/preferences?focus=vibration scrolls to the
  // Vibration row once its real position is measured.
  // ============================================

  const params = useLocalSearchParams<{
    focus?: string | string[];
  }>();

  const focusParam = Array.isArray(params.focus)
    ? params.focus[0]
    : params.focus;

  const alertsCardYRef = useRef(0);
  const vibrationRowYRef = useRef(0);
  const focusScrolledRef = useRef(false);
  const highlightTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const [highlightVibration, setHighlightVibration] =
    useState(false);

  const maybeScrollToVibration = () => {
    if (
      focusParam !== "vibration" ||
      focusScrolledRef.current ||
      alertsCardYRef.current <= 0 ||
      vibrationRowYRef.current <= 0
    ) {
      return;
    }

    focusScrolledRef.current = true;

    scrollRef.current?.scrollTo({
      y: Math.max(
        alertsCardYRef.current +
          vibrationRowYRef.current -
          12,
        0,
      ),
      animated: true,
    });

    setHighlightVibration(true);

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = setTimeout(() => {
      setHighlightVibration(false);
      highlightTimerRef.current = null;
    }, 1800);
  };

  useEffect(
    () => () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    },
    [],
  );

  // ============================================
  // SAVE / CANCEL
  // ============================================

  const [isSavingPreferences, setIsSavingPreferences] =
    useState(false);

  const THEME_OPTIONS: readonly ThemeOption[] = [
    "system",
    "light",
    "dark",
  ];

  const themeLabel = (
    option: ThemeOption,
  ): string =>
    option === "system"
      ? `System (${savedResolvedTheme === "dark" ? "Dark" : "Light"})`
      : option === "dark"
        ? "Dark"
        : "Light";

  const handleCancelPreferences = () => {
    if (isSavingPreferences) {
      return;
    }

    setFontSize(savedTypography.fontSize);
    setFontFamily(savedTypography.fontFamily);
    setThemeDraft(savedTheme);
    setEmailNotifications(savedEmailNotifications);
    setFontFamilyOpen(false);
    setLanguageOpen(false);

    router.replace(Routes.MENU);
  };

  const handleSavePreferences = async () => {
    if (isSavingPreferences) {
      return;
    }

    try {
      setIsSavingPreferences(true);

      await commitTypography({
        fontSize,
        fontFamily,
      });

      // Email switch: global per-user column; revert the
      // draft on failure so the UI never lies about it.
      const emailProfile =
        await getCurrentUserProfile();

      if (
        emailProfile.success &&
        emailProfile.userId
      ) {
        const { error: emailError } =
          await supabase
            .from("users")
            .update({
              email_notifications:
                emailNotifications,
            })
            .eq("id", emailProfile.userId);

        if (emailError) {
          console.error(
            "Email preference save error:",
            emailError.message,
          );
          setEmailNotifications(
            savedEmailNotifications,
          );
          return;
        }

        setSavedEmailNotifications(
          emailNotifications,
        );

        await saveCachedEmailNotifications(
          emailNotifications,
          emailProfile.userId,
        );
      }

      // Theme last: the flip re-renders screens, so it
      // lands as the screen closes instead of mid-save.
      await commitTheme(themeDraft);

      logSettings.preferencesSaved(
        `Font ${fontSize} ${fontFamily}, ${themeLabel(themeDraft)} mode, email ${emailNotifications ? "on" : "off"}.`,
      );

      setFontFamilyOpen(false);
      setLanguageOpen(false);

      router.replace(Routes.MENU);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const renderToggle = (
    value: boolean,
    onValueChange: (value: boolean) => void,
    label: string,
  ) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={label}
      trackColor={{
        false: colors.border,
        true: colors.primary,
      }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.border}
    />
  );

  return (
    <ScreenContainer2 scrollToTop={scrollToTop}>
      <NavBar />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollToTop.reportScroll}
        scrollEventThrottle={16}
        onContentSizeChange={
          maybeScrollToVibration
        }
      >
        <View style={styles.headerCard}>
          <AppText
            variant="heading"
            style={styles.headerTitle}
          >
            {t("dashboard.preferences.title")}
          </AppText>

          <AppText
            variant="caption"
            style={styles.headerSubtitle}
          >
            {t("dashboard.preferences.subtitle")}
          </AppText>
        </View>

        {/* ================= APPEARANCE ================= */}

        <View style={styles.card}>
          <View
            style={styles.preferenceBlock}
            accessibilityRole="radiogroup"
            accessibilityLabel={t("menu.themesA11y")}
          >
            <AppText
              variant="caption"
              style={styles.groupLabel}
            >
              {t("menu.themes")}
            </AppText>

            <View style={styles.optionRow}>
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() =>
                    setThemeDraft(option)
                  }
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected:
                      themeDraft === option,
                  }}
                  accessibilityLabel={t(
                    "menu.themeOptionA11y",
                    { option: themeLabel(option) },
                  )}
                  style={[
                    styles.optionButton,
                    themeDraft === option &&
                      styles.selectedOption,
                  ]}
                >
                  <AppText
                    style={[
                      styles.optionText,
                      themeDraft === option &&
                        styles.selectedOptionText,
                    ]}
                  >
                    {option === "system"
                      ? t("menu.themeSystem")
                      : option === "dark"
                        ? t("menu.themeDark")
                        : t("menu.themeLight")}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.preferenceBlock}>
            <AppText
              variant="caption"
              style={styles.groupLabel}
            >
              {t("menu.fontSize")}
            </AppText>

            <View style={styles.optionRow}>
              {(
                [
                  "Small",
                  "Medium",
                  "Big",
                ] as const
              ).map((option) => (
                <Pressable
                  key={option}
                  onPress={() =>
                    setFontSize(option)
                  }
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected:
                      fontSize === option,
                  }}
                  accessibilityLabel={t(
                    "menu.fontSizeOptionA11y",
                    { option },
                  )}
                  style={[
                    styles.optionButton,
                    fontSize === option &&
                      styles.selectedOption,
                  ]}
                >
                  <AppText
                    style={[
                      styles.optionText,
                      fontSize === option &&
                        styles.selectedOptionText,
                    ]}
                  >
                    {option === "Small"
                      ? t("menu.fontSmall")
                      : option === "Medium"
                        ? t("menu.fontMedium")
                        : t("menu.fontBig")}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.preferenceBlockLast}>
            <AppText
              variant="caption"
              style={styles.groupLabel}
            >
              {t("menu.fontFamily")}
            </AppText>

            <Pressable
              onPress={() => {
                setFontFamilyOpen(true);
                setLanguageOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={t(
                "menu.chooseFontFamily",
              )}
              accessibilityHint={t(
                "menu.currentFont",
                { font: fontFamily },
              )}
              style={styles.dropdownInput}
            >
              <AppText
                style={styles.dropdownInputText}
              >
                {fontFamily}
              </AppText>

              <Ionicons
                name="chevron-down-outline"
                size={22}
                color={colors.text}
              />
            </Pressable>
          </View>
        </View>

        {/* ================= LANGUAGE ================= */}

        <View style={styles.card}>
          <View style={styles.preferenceBlockLast}>
            <AppText
              variant="caption"
              style={styles.groupLabel}
            >
              {t("menu.language.title")}
            </AppText>

            <Pressable
              onPress={() => {
                setLanguageOpen(true);
                setFontFamilyOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={t(
                "menu.language.chooseLanguage",
              )}
              accessibilityHint={t(
                "menu.language.current",
                { language: languageLabel },
              )}
              style={styles.dropdownInput}
            >
              <AppText
                style={styles.dropdownInputText}
              >
                {languageLabel}
              </AppText>

              <Ionicons
                name="chevron-down-outline"
                size={22}
                color={colors.text}
              />
            </Pressable>
          </View>
        </View>

        {/* ================= ALERTS ================= */}

        <View
          style={styles.card}
          onLayout={(event) => {
            alertsCardYRef.current =
              event.nativeEvent.layout.y;
            maybeScrollToVibration();
          }}
        >
          <View
            onLayout={(event) => {
              vibrationRowYRef.current =
                event.nativeEvent.layout.y;
              maybeScrollToVibration();
            }}
            style={[
              styles.preferenceRow,
              highlightVibration &&
                styles.preferenceRowHighlight,
            ]}
          >
            <View style={styles.preferenceText}>
              <AppText
                variant="body"
                style={styles.preferenceTitle}
              >
                {t("menu.vibration")}
              </AppText>

              <AppText
                variant="caption"
                style={
                  styles.preferenceDescription
                }
              >
                {t("menu.vibrationHint")}
              </AppText>
            </View>

            {renderToggle(
              vibration,
              handleVibrationToggle,
              t("menu.vibration"),
            )}
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <AppText
                variant="body"
                style={styles.preferenceTitle}
              >
                {t("menu.messagePanel")}
              </AppText>

              <AppText
                variant="caption"
                style={
                  styles.preferenceDescription
                }
              >
                {t("menu.messagePanelHint")}
              </AppText>
            </View>

            {renderToggle(
              messagePanel,
              handleMessagePanelToggle,
              t("menu.messagePanel"),
            )}
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <AppText
                variant="body"
                style={styles.preferenceTitle}
              >
                {t("menu.reminders")}
              </AppText>

              <AppText
                variant="caption"
                style={
                  styles.preferenceDescription
                }
              >
                {t("menu.remindersHint")}
              </AppText>
            </View>

            {renderToggle(
              reminders,
              handleRemindersToggle,
              t("menu.reminders"),
            )}
          </View>

          <View style={styles.preferenceRowLast}>
            <View style={styles.preferenceText}>
              <AppText
                variant="body"
                style={styles.preferenceTitle}
              >
                {t("menu.emailNotifications")}
              </AppText>

              <AppText
                variant="caption"
                style={
                  styles.preferenceDescription
                }
              >
                {t(
                  "menu.emailNotificationsHint",
                )}
              </AppText>
            </View>

            {renderToggle(
              emailNotifications,
              setEmailNotifications,
              t("menu.emailNotifications"),
            )}
          </View>
        </View>

        {/* ================= SAVE / CANCEL ================= */}

        <View style={styles.actionCard}>
          <Pressable
            onPress={handleCancelPreferences}
            disabled={isSavingPreferences}
            accessibilityRole="button"
            accessibilityLabel={t(
              "menu.cancelPreferences",
            )}
            style={({ pressed }) => [
              styles.actionButton,
              styles.cancelButton,
              pressed && styles.pressed,
              isSavingPreferences &&
                styles.disabled,
            ]}
          >
            <AppText
              variant="body"
              style={styles.cancelButtonText}
            >
              {t("menu.cancel")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={handleSavePreferences}
            disabled={isSavingPreferences}
            accessibilityRole="button"
            accessibilityLabel={t(
              "menu.savePreferences",
            )}
            style={({ pressed }) => [
              styles.actionButton,
              styles.saveButton,
              pressed && styles.pressed,
              isSavingPreferences &&
                styles.disabled,
            ]}
          >
            <AppText
              variant="body"
              style={styles.saveButtonText}
            >
              {isSavingPreferences
                ? t("menu.saving")
                : t("menu.save")}
            </AppText>
          </Pressable>
        </View>

        <Copyright />
      </ScrollView>

      {/* ================= FONT FAMILY PICKER ================= */}

      <DropdownModal
        visible={fontFamilyOpen}
        title={t("menu.fontFamily")}
        onClose={() => setFontFamilyOpen(false)}
      >
        {FONT_FAMILY_OPTIONS.map((font) => (
          <RadioOptionRow
            key={font}
            label={font}
            selected={fontFamily === font}
            onPress={() => {
              setFontFamily(font);
              setFontFamilyOpen(false);
            }}
          />
        ))}
      </DropdownModal>

      {/* ================= LANGUAGE PICKER ================= */}

      <DropdownModal
        visible={languageOpen}
        title={t("menu.language.title")}
        onClose={() => setLanguageOpen(false)}
      >
        {ACTIVE_LANGUAGES.map((item) => (
          <RadioOptionRow
            key={item.code}
            label={item.label}
            selected={languageCode === item.code}
            onPress={() => {
              handleLanguageSelect(item.code);
            }}
          />
        ))}
      </DropdownModal>
    </ScreenContainer2>
  );
}

const preferenceDimensions = {
  borderWidth: 3,
  borderRadius: 16,
  sectionGap: 16,
};

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingTop: preferenceDimensions.sectionGap,
      paddingBottom: 30,
    },

    headerCard: {
      backgroundColor: colors.glass.white,
      borderWidth: preferenceDimensions.borderWidth,
      borderColor: colors.cardBorder,
      borderRadius: preferenceDimensions.borderRadius,
      padding: 18,
      marginBottom: preferenceDimensions.sectionGap,
    },

    headerTitle: {
      color: colors.text,
      fontWeight: "700",
    },

    headerSubtitle: {
      color: colors.textSecondary,
      marginTop: 6,
      lineHeight: 20,
    },

    card: {
      backgroundColor: colors.glass.white,
      borderWidth: preferenceDimensions.borderWidth,
      borderColor: colors.cardBorder,
      borderRadius: preferenceDimensions.borderRadius,
      padding: 18,
      marginBottom: preferenceDimensions.sectionGap,
    },

    preferenceBlock: {
      width: "100%",
      paddingVertical: 6,
      marginBottom: 12,
    },

    preferenceBlockLast: {
      width: "100%",
      paddingVertical: 6,
    },

    groupLabel: {
      color: colors.text,
      fontWeight: "600",
      marginBottom: 8,
    },

    optionRow: {
      flexDirection: "row",
      gap: 10,
    },

    optionButton: {
      flex: 1,
      minHeight: 48,
      backgroundColor: colors.glass.white,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
    },

    selectedOption: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    optionText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 14,
    },

    selectedOptionText: {
      color: colors.onPrimary,
    },

    dropdownInput: {
      minHeight: 48,
      backgroundColor: colors.glass.white,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    dropdownInputText: {
      color: colors.text,
      fontWeight: "500",
    },

    preferenceRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
      marginBottom: 12,
    },

    preferenceRowLast: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
    },

    preferenceRowHighlight: {
      backgroundColor: colors.selectedWash,
      borderRadius: 10,
      paddingHorizontal: 10,
      marginHorizontal: -10,
    },

    preferenceText: {
      flex: 1,
      paddingRight: 12,
    },

    preferenceTitle: {
      color: colors.text,
      fontWeight: "600",
    },

    preferenceDescription: {
      color: colors.textSecondary,
      marginTop: 3,
      lineHeight: 18,
    },

    actionCard: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.glass.white,
      borderWidth: preferenceDimensions.borderWidth,
      borderColor: colors.cardBorder,
      borderRadius: preferenceDimensions.borderRadius,
      padding: 18,
      marginBottom: preferenceDimensions.sectionGap,
    },

    actionButton: {
      flex: 1,
      minHeight: Control.button,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderRadius: Radius.md,
    },

    cancelButton: {
      backgroundColor: colors.surface,
      borderColor: colors.error,
    },

    cancelButtonText: {
      color: colors.error,
      fontWeight: "700",
    },

    saveButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    saveButtonText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    pressed: {
      opacity: 0.7,
    },

    disabled: {
      opacity: 0.6,
    },
  });
