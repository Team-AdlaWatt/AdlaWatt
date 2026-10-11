import React, { useEffect, useMemo, useState } from "react";

import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { router } from "expo-router";

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
import { Control, useScreenPadding } from "@/constants/sizing";
import { Routes } from "@/constants/routes";

import {
  getCurrentUserProfile,
  updateAccount,
} from "@/services/auth";
import PasswordInput from "@/components/ui/PasswordInput";
import {
  logAuth,
  logProfile,
  logSettings,
} from "@/services/activityLogService";

import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";

import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import type { ThemeOption } from "@/constants/colors";
import { useTypography } from "@/hooks/useTypography";
import {
  FONT_FAMILY_OPTIONS,
  type FontFamilyOption,
  type FontSizeOption,
} from "@/services/typography";
import {
  loadCachedEmailNotifications,
  loadLanguageSetting,
  loadRemindersSetting,
  loadVibrationSetting,
  saveCachedEmailNotifications,
  saveRemindersSetting,
  saveVibrationSetting,
} from "@/services/settings";
import {
  ACTIVE_LANGUAGES,
  setAppLanguage,
  type AppLanguage,
} from "@/services/i18n";
import { useTranslation } from "react-i18next";
import {
  stopAlertVibration,
  syncAlertVibration,
} from "@/services/alertVibration";
import {
  cancelAllReminders,
  ensureEveningReminder,
} from "@/services/reminderService";

import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  // ============================================
  // DROPDOWN STATES
  // ============================================

  const [accountExpanded, setAccountExpanded] =
    useState(false);

  const [preferencesExpanded, setPreferencesExpanded] =
    useState(false);

  // ============================================
  // ACCOUNT STATES
  // ============================================

  const [isEditingAccount, setIsEditingAccount] =
    useState(false);

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [editUsername, setEditUsername] =
    useState("");

  const [editEmail, setEditEmail] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [confirmationVisible, setConfirmationVisible] =
    useState(false);

  const [warning, setWarning] =
    useState("");

  const [confirmationWarning, setConfirmationWarning] =
    useState("");

  const [loadingAccount, setLoadingAccount] =
    useState(false);

  const [confirmingAccountUpdate, setConfirmingAccountUpdate] =
    useState(false);

  // ============================================
  // PREFERENCES
  // ============================================

  const [themeDraft, setThemeDraft] =
    useState<ThemeOption>("system");

  const [fontSize, setFontSize] =
    useState<FontSizeOption>("Medium");

  const [fontFamily, setFontFamily] =
    useState<FontFamilyOption>("Inter");

  const [languageCode, setLanguageCode] =
    useState<AppLanguage>("en");

  // Functional language switch: persists, applies app-wide
  // instantly via i18next, and survives restarts.
  const { t: tMenu, i18n: menuI18n } = useTranslation();

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
    const current = menuI18n.language;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local code with i18n language
    setLanguageCode(
      current === "fil" || current === "ceb"
        ? current
        : "en",
    );
  }, [menuI18n.language]);

  const handleLanguageSelect = (code: AppLanguage) => {
    setLanguageOpen(false);
    void setAppLanguage(code);
  };

  const languageLabel =
    ACTIVE_LANGUAGES.find(
      (item) => item.code === languageCode,
    )?.label ?? tMenu("menu.englishName");

  const [vibration, setVibration] =
    useState(true);

  // Persisted device preference (default ON). Turning it
  // OFF silences an active buzz at once; turning it back ON
  // re-syncs so waiting unread alerts buzz again.
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

  const handleVibrationToggle = (next: boolean) => {
    setVibration(next);
    void saveVibrationSetting(next);

    if (next) {
      void syncAlertVibration();
    } else {
      stopAlertVibration();
    }
  };

  // Device-local reminders switch (default ON, immediate
  // like vibration — not part of the Save/Cancel draft).
  // ON re-ensures tonight's schedule; OFF cancels everything.
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

  const handleRemindersToggle = (next: boolean) => {
    setReminders(next);
    void saveRemindersSetting(next);

    if (next) {
      void ensureEveningReminder();
    } else {
      void cancelAllReminders();
    }
  };

  // Global per-user alert-email switch (server column,
  // default ON). Drafted like typography: flips instantly,
  // commits on Save, discards on Cancel.
  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [savedEmailNotifications, setSavedEmailNotifications] =
    useState(true);

  // ============================================
  // PREFERENCE DROPDOWNS
  // ============================================

  const [fontFamilyOpen, setFontFamilyOpen] =
    useState(false);

  const [languageOpen, setLanguageOpen] =
    useState(false);

  // ============================================
  // PREFERENCES DRAFT (system preferences)
  //
  // Typography + theme edits apply on Save; Cancel / X
  // discards back to the saved values. Color blind mode
  // stays local-only and is intentionally excluded.
  // ============================================

  const {
    prefs: savedTypography,
    setPreferences: commitTypography,
  } = useSettings();

  // Theme is staged like typography: choosing only
  // updates local draft state, Save commits the theme.
  // "system" (default) follows the OS color scheme.
  const {
    theme: savedTheme,
    resolvedTheme: savedResolvedTheme,
    setTheme: commitTheme,
  } = useTheme();

  const {
    scaledSize: scaledInputSize,
    family: inputFontFamily,
    weight: inputFontWeight,
  } = useTypography();

  const colors = useAppColors();
  // Responsive gutter: 16/20/24 by phone width (UI-STANDARDS.md).
  const screenPadding = useScreenPadding();
  // Pushes renames into the AuthContext session cache so
  // the Navbar username updates without any navigation.
  const { refreshProfile } = useAuth();
  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const inputFontStyle = {
    fontSize: scaledInputSize(15),
    fontFamily: inputFontFamily,
    fontWeight: inputFontWeight,
  };

  const [isSavingPreferences, setIsSavingPreferences] =
    useState(false);

  useEffect(() => {
    if (preferencesExpanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate drafts when section opens
      setFontSize(savedTypography.fontSize);
      setFontFamily(savedTypography.fontFamily);
      setThemeDraft(savedTheme);
      setEmailNotifications(savedEmailNotifications);
      setFontFamilyOpen(false);
      setLanguageOpen(false);
    }
  }, [
    preferencesExpanded,
    savedTypography,
    savedTheme,
    savedEmailNotifications,
  ]);

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

  // Staged only: Save commits the theme together with
  // typography. Choosing previews nothing by itself.

  const handleClosePreferences = () => {
    if (isSavingPreferences) {
      return;
    }

    setFontSize(savedTypography.fontSize);
    setFontFamily(savedTypography.fontFamily);
    setThemeDraft(savedTheme);
    setEmailNotifications(savedEmailNotifications);
    setFontFamilyOpen(false);
    setLanguageOpen(false);
    setPreferencesExpanded(false);
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
      const emailProfile = await getCurrentUserProfile();

      if (emailProfile.success && emailProfile.userId) {
        const { error: emailError } = await supabase
          .from("users")
          .update({
            email_notifications: emailNotifications,
          })
          .eq("id", emailProfile.userId);

        if (emailError) {
          console.error(
            "Email preference save error:",
            emailError.message,
          );
          setEmailNotifications(savedEmailNotifications);
          return;
        }

        setSavedEmailNotifications(emailNotifications);

        await saveCachedEmailNotifications(
          emailNotifications,
          emailProfile.userId,
        );
      }

      // Theme last: the flip re-renders screens, so it
      // lands as the modal closes instead of mid-save.
      await commitTheme(themeDraft);

      logSettings.preferencesSaved(
        `Font ${fontSize} ${fontFamily}, ${themeLabel(themeDraft)} mode, email ${emailNotifications ? "on" : "off"}.`,
      );

      setFontFamilyOpen(false);
      setLanguageOpen(false);
      setPreferencesExpanded(false);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // ============================================
  // LOAD ACCOUNT PROFILE
  // ============================================

  // Strong switch: paint the last confirmed email value
  // from cache instantly, so an offline open never flashes
  // the ON default. The server load below overwrites this
  // on success and refreshes the cache.
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
    const loadAccount = async () => {
      setLoadingAccount(true);

      const result =
        await getCurrentUserProfile();

      if (!result.success) {
        setWarning(result.error ?? "");
        setLoadingAccount(false);
        return;
      }

      const loadedUsername =
        result.username ?? "";

      const loadedEmail =
        result.email ?? "";

      const loadedEmailNotifications =
        result.emailNotifications ?? true;

      setUsername(loadedUsername);
      setEmail(loadedEmail);
      setEmailNotifications(loadedEmailNotifications);
      setSavedEmailNotifications(loadedEmailNotifications);

      await saveCachedEmailNotifications(
        loadedEmailNotifications,
        result.userId,
      );

      setEditUsername(loadedUsername);
      setEditEmail(loadedEmail);

      setLoadingAccount(false);
    };

    loadAccount();
  }, []);

  // ============================================
  // OPEN ACCOUNT EDITING
  // ============================================

  const handleUpdatePress = () => {
    setEditUsername(username);
    setEditEmail(email);

    setNewPassword("");
    setConfirmNewPassword("");
    setCurrentPassword("");

    setWarning("");
    setConfirmationWarning("");

    setIsEditingAccount(true);
  };

  // ============================================
  // CANCEL ACCOUNT UPDATE
  // ============================================

  const handleCancelUpdate = () => {
    setEditUsername(username);
    setEditEmail(email);

    setNewPassword("");
    setConfirmNewPassword("");
    setCurrentPassword("");

    setWarning("");
    setConfirmationWarning("");

    setConfirmationVisible(false);
    setIsEditingAccount(false);
  };

  // ============================================
  // CLOSE ACCOUNT MODAL
  //
  // X / backdrop / back button: discard any inputted
  // data and restore normal view state, then hide modal.
  // Distinct from handleCancelUpdate (footer Cancel),
  // which exits edit mode but keeps the modal open.
  // ============================================

  const handleCloseAccountModal = () => {
    if (confirmingAccountUpdate) {
      return;
    }

    handleCancelUpdate();
    setAccountExpanded(false);
  };

  // ============================================
  // SUBMIT ACCOUNT UPDATE
  // ============================================

  const handleSubmitAccountUpdate = () => {
    if (confirmingAccountUpdate) {
      return;
    }

    setWarning("");

    const cleanUsername =
      editUsername.trim().toLowerCase();

    const cleanEmail =
      editEmail.trim().toLowerCase();

    // --------------------------------------------
    // USERNAME VALIDATION
    // --------------------------------------------

    if (!cleanUsername) {
      setWarning(tMenu("validation.usernameRequired"));
      return;
    }

    if (cleanUsername.length < 3) {
      setWarning(
        tMenu("validation.usernameShort"),
      );
      return;
    }

    if (cleanUsername.length > 30) {
      setWarning(
        tMenu("validation.usernameLong"),
      );
      return;
    }

    if (
      !/^[a-zA-Z0-9_]+$/.test(
        cleanUsername,
      )
    ) {
      setWarning(
        tMenu("validation.usernameChars"),
      );
      return;
    }

    // --------------------------------------------
    // EMAIL VALIDATION
    // --------------------------------------------

    if (!cleanEmail) {
      setWarning(
        tMenu("validation.emailRequired"),
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail,
      )
    ) {
      setWarning(
        tMenu("validation.emailInvalid"),
      );
      return;
    }

    // --------------------------------------------
    // PASSWORD VALIDATION
    // --------------------------------------------

    if (
      newPassword ||
      confirmNewPassword
    ) {
      if (newPassword.length < 8) {
        setWarning(
          tMenu("validation.passwordShort"),
        );
        return;
      }

      if (newPassword.length > 72) {
        setWarning(
          tMenu("validation.passwordLong"),
        );
        return;
      }

      if (
        newPassword !==
        confirmNewPassword
      ) {
        setWarning(
          tMenu("validation.passwordsMismatch"),
        );
        return;
      }
    }

    // --------------------------------------------
    // CHECK IF ANYTHING CHANGED
    // --------------------------------------------

    const usernameChanged =
      cleanUsername !== username;

    const emailChanged =
      cleanEmail !== email;

    const passwordChanged =
      newPassword.length > 0;

    if (
      !usernameChanged &&
      !emailChanged &&
      !passwordChanged
    ) {
      setWarning(
        tMenu("menu.noChanges"),
      );
      return;
    }

    // --------------------------------------------
    // OPEN PASSWORD CONFIRMATION
    // --------------------------------------------

    setEditUsername(cleanUsername);
    setEditEmail(cleanEmail);

    setCurrentPassword("");
    setConfirmationWarning("");
    setConfirmationVisible(true);
  };

  // ============================================
  // CONFIRM ACCOUNT UPDATE
  // ============================================

  const handleConfirmChanges = async () => {
    if (confirmingAccountUpdate) {
      return;
    }

    setConfirmationWarning("");

    const password =
      currentPassword;

    if (!password) {
      setConfirmationWarning(
        tMenu("menu.currentPasswordRequired"),
      );
      return;
    }

    if (password.length < 8) {
      setConfirmationWarning(
        tMenu("menu.currentPasswordShort"),
      );
      return;
    }

    try {
      setConfirmingAccountUpdate(true);

      const result =
        await updateAccount(
          editUsername,
          editEmail,
          password,
          newPassword || undefined,
        );

      if (!result.success) {
        setConfirmationWarning(
          result.error ??
            tMenu("menu.updateFailed"),
        );
        return;
      }

      const updatedUsername =
        result.username ??
        editUsername.trim().toLowerCase();

      const updatedEmail =
        result.email ??
        editEmail.trim().toLowerCase();

      if (updatedUsername !== username) {
        logProfile.usernameUpdated(
          updatedUsername,
        );
      }

      if (result.emailChangePending) {
        logProfile.emailPending();
      } else if (updatedEmail !== email) {
        logProfile.emailUpdated();
      }

      setUsername(updatedUsername);
      setEmail(updatedEmail);

      // Fire-and-forget: the Navbar reads the session
      // cache, so push the rename there without blocking
      // the confirmation alert on a slow fetch.
      void refreshProfile().catch(() => {});

      setEditUsername(updatedUsername);
      setEditEmail(updatedEmail);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      setWarning("");
      setConfirmationWarning("");

      setConfirmationVisible(false);
      setIsEditingAccount(false);

      if (result.emailChangePending) {
        Alert.alert(
          tMenu("menu.accountUpdated"),
          result.message ??
            tMenu("menu.accountUpdatedEmailPending"),
        );
      } else {
        Alert.alert(
          tMenu("menu.changesSaved"),
          tMenu("menu.changesSavedMessage"),
        );
      }
    } catch (error) {
      console.error(
        "Account update error:",
        error,
      );

      setConfirmationWarning(
        tMenu("menu.updateFailedNow"),
      );
    } finally {
      setConfirmingAccountUpdate(false);
    }
  };

  // ============================================
  // TOGGLE
  // ============================================

  const renderToggle = (
    value: boolean,
    onValueChange: (
      value: boolean,
    ) => void,
    // When true the Switch is purely visual and its row
    // handles taps (avoids double-toggle from nested press).
    decorative: boolean = false,
  ) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      style={{
        pointerEvents: decorative
          ? "none"
          : "auto",
      }}
      trackColor={{
        false: colors.border,
        true: colors.primary,
      }}
      thumbColor={colors.surface}
      ios_backgroundColor={
        colors.border
      }
    />
  );

  // ============================================
  // LOG OUT
  // ============================================

  const { height: windowHeight } = useWindowDimensions();

  const handleLogout = () => {
    const logout = async () => {
      // Logged before sign-out: after sign-out there is no
      // session left to satisfy RLS on insert.
      logAuth.loggedOut();

      // Scheduled reminders belong to the signed-in phone:
      // cancel so a signed-out device stays silent.
      await cancelAllReminders();

      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn(
          "Sign out failed:",
          error instanceof Error
            ? error.message
            : error,
        );
      } finally {
        router.replace(Routes.LOGIN);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        tMenu("menu.logoutMessage"),
      );

      if (confirmed) {
        logout();
      }

      return;
    }

    Alert.alert(
      tMenu("menu.logoutTitle"),
      tMenu("menu.logoutMessage"),
      [
        {
          text: tMenu("menu.logoutNo"),
          style: "cancel",
        },
        {
          text: tMenu("menu.logoutYes"),
          style: "destructive",
          onPress: logout,
        },
      ],
    );
  };

  // ============================================
  // EXIT APP
  //
  // iOS forbids programmatic quit, so the Exit button is
  // hidden there (see render). Web tabs usually cannot be
  // closed by script, so a manual-close note is shown.
  // ============================================

  const handleExit = () => {
    const exitApp = () => {
      if (Platform.OS === "android") {
        BackHandler.exitApp();
        return;
      }

      if (Platform.OS === "web") {
        window.close();

        Alert.alert(
          tMenu("menu.exitTitle"),
          tMenu("menu.exitMessage"),
        );
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        tMenu("menu.exitWebMessage"),
      );

      if (confirmed) {
        exitApp();
      }

      return;
    }

    Alert.alert(
      tMenu("menu.exitAppTitle"),
      tMenu("menu.exitAppMessage"),
      [
        {
          text: tMenu("menu.exitNo"),
          style: "cancel",
        },
        {
          text: tMenu("menu.exitYes"),
          style: "destructive",
          onPress: exitApp,
        },
      ],
    );
  };

  return (
    <ScreenContainer2>
      <NavBar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Settings Header */}
        <View style={styles.headerCard}>
          <AppText
            variant="heading"
            style={styles.headerTitle}
          >
            {tMenu("menu.title")}
          </AppText>

          <AppText
            variant="caption"
            style={styles.headerSubtitle}
          >
            {tMenu("menu.subtitle")}
          </AppText>
        </View>

        {/* ================= MENU BOXES ================= */}

        <View style={styles.menuGrid}>
          <Pressable
            onPress={() =>
              setAccountExpanded(true)
            }
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.openAccountProfile")}
            style={({ pressed }) => [
              styles.menuBox,
              accountExpanded &&
                styles.menuBoxActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="person"
              size={60}
              color={colors.accentContent}
            />

            <AppText
              variant="body"
              style={styles.menuBoxText}
            >
              {tMenu("menu.accountProfile")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() =>
              setPreferencesExpanded(true)
            }
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.openPreferences")}
            style={({ pressed }) => [
              styles.menuBox,
              preferencesExpanded &&
                styles.menuBoxActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="settings"
              size={60}
              color={colors.accentContent}
            />

            <AppText
              variant="body"
              style={styles.menuBoxText}
            >
              {tMenu("menu.preferences")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(
                Routes.USER_MANUAL,
              )
            }
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.openUserManual")}
            style={({ pressed }) => [
              styles.menuBox,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="book-outline"
              size={60}
              color={colors.accentContent}
            />

            <AppText
              variant="body"
              style={styles.menuBoxText}
            >
              {tMenu("menu.userManual")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(
                Routes.COMPONENTS,
              )
            }
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.openComponents")}
            style={({ pressed }) => [
              styles.menuBox,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="hardware-chip"
              size={60}
              color={colors.accentContent}
            />

            <AppText
              variant="body"
              style={styles.menuBoxText}
            >
              {tMenu("menu.components")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(
                Routes.ACTIVITY_LOGS,
              )
            }
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.openActivityLogs")}
            style={({ pressed }) => [
              styles.menuBox,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="list"
              size={60}
              color={colors.accentContent}
            />

            <AppText
              variant="body"
              style={styles.menuBoxText}
            >
              {tMenu("menu.activityLogs")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(
                Routes.ABOUT_US,
              )
            }
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.openAboutUs")}
            style={({ pressed }) => [
              styles.menuBox,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="information-circle"
              size={60}
              color={colors.accentContent}
            />

            <AppText
              variant="body"
              style={styles.menuBoxText}
            >
              {tMenu("menu.aboutUs")}
            </AppText>
          </Pressable>
        </View>

        {/* ================= ACCOUNT PROFILE MODAL ================= */}

        <DropdownModal
          visible={accountExpanded}
          title={tMenu("menu.accountProfile")}
          onClose={handleCloseAccountModal}
        >
          <ScrollView
            style={[
              styles.modalScroll,
              {
                maxHeight:
                  windowHeight * 0.55,
              },
            ]}
            showsVerticalScrollIndicator={
              false
            }
          >
              {loadingAccount ? (
                <AppText
                  variant="caption"
                  style={styles.infoValue}
                >
                    {tMenu("menu.loadingAccount")}
                </AppText>
              ) : !isEditingAccount ? (
                <>
                  {/* Username */}
                  <View style={styles.infoRow}>
                    <AppText
                      variant="caption"
                      style={styles.infoLabel}
                    >
                      {tMenu("menu.username")}
                    </AppText>

                    <AppText
                      variant="body"
                      style={styles.infoValue}
                    >
                      {username}
                    </AppText>
                  </View>

                  {/* Email */}
                  <View style={styles.infoRow}>
                    <AppText
                      variant="caption"
                      style={styles.infoLabel}
                    >
                      {tMenu("menu.email")}
                    </AppText>

                    <AppText
                      variant="body"
                      style={styles.infoValue}
                    >
                      {email}
                    </AppText>
                  </View>

                  <Pressable
                    onPress={handleUpdatePress}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <AppText
                      style={
                        styles.primaryButtonText
                      }
                    >
                      {tMenu("menu.update")}
                    </AppText>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Username */}
                  <View style={styles.inputGroup}>
                    <AppText
                      variant="caption"
                      style={styles.inputLabel}
                    >
                      {tMenu("menu.username")}
                    </AppText>

                    <TextInput
                      value={editUsername}
                      onChangeText={(text) => {
                        setEditUsername(text);
                        setWarning("");
                      }}
                      allowFontScaling={false}
                      style={[
                        styles.input,
                        inputFontStyle,
                      ]}
                      placeholder={tMenu("menu.enterUsername")}
                      placeholderTextColor={
                        colors.textSecondary
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <AppText
                      variant="caption"
                      style={styles.inputLabel}
                    >
                      {tMenu("menu.email")}
                    </AppText>

                    <TextInput
                      value={editEmail}
                      onChangeText={(text) => {
                        setEditEmail(text);
                        setWarning("");
                      }}
                      allowFontScaling={false}
                      style={[
                        styles.input,
                        inputFontStyle,
                      ]}
                      placeholder={tMenu("menu.enterEmail")}
                      placeholderTextColor={
                        colors.textSecondary
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* New Password */}
                  <PasswordInput
                    label={tMenu("passwordInput.labelNewPassword")}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setWarning("");
                    }}
                    placeholder={tMenu("menu.keepCurrentPassword")}
                    autoComplete="password-new"
                  />

                  {/* Confirm New Password */}
                  <PasswordInput
                    label={tMenu("passwordInput.labelConfirmNewPassword")}
                    value={confirmNewPassword}
                    onChangeText={(text) => {
                      setConfirmNewPassword(text);
                      setWarning("");
                    }}
                    placeholder={tMenu("menu.confirmNewPasswordPlaceholder")}
                    autoComplete="password-new"
                  />

                  {/* Warning */}
                  {warning ? (
                    <View
                      style={
                        styles.warningContainer
                      }
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color={colors.error}
                      />

                      <AppText
                        style={
                          styles.warningText
                        }
                      >
                        {warning}
                      </AppText>
                    </View>
                  ) : null}

                </>
              )}
          </ScrollView>

          {isEditingAccount &&
          !loadingAccount ? (
            <View style={styles.modalFooter}>
              <Pressable
                onPress={handleCancelUpdate}
                disabled={
                  confirmingAccountUpdate
                }
                accessibilityRole="button"
                accessibilityLabel={tMenu("menu.cancelAccountChanges")}
                style={({ pressed }) => [
                  styles.modalFooterButton,
                  styles.modalCancelButton,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="body"
                  style={
                    styles.modalCancelButtonText
                  }
                >
                  {tMenu("menu.cancel")}
                </AppText>
              </Pressable>

              <Pressable
                onPress={
                  handleSubmitAccountUpdate
                }
                disabled={
                  confirmingAccountUpdate
                }
                accessibilityRole="button"
                accessibilityLabel={tMenu("menu.submitAccountChanges")}
                style={({ pressed }) => [
                  styles.modalFooterButton,
                  styles.modalSubmitButton,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="body"
                  style={
                    styles.modalSubmitButtonText
                  }
                >
                  {tMenu("menu.submit")}
                </AppText>
              </Pressable>
            </View>
          ) : null}
        </DropdownModal>

        {/* ================= PREFERENCES MODAL ================= */}

        <DropdownModal
          visible={preferencesExpanded}
          title={tMenu("menu.preferences")}
          onClose={handleClosePreferences}
        >
          <View style={styles.modalBody}>
              {/* Themes: staged System / Light / Dark.
                  Save commits; Cancel / X discards to saved. */}
              <View
                style={styles.preferenceBlock}
                accessibilityRole="radiogroup"
                accessibilityLabel={tMenu("menu.themesA11y")}
              >
                <AppText
                  variant="caption"
                  style={styles.groupLabel}
                >
                  {tMenu("menu.themes")}
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
                      accessibilityLabel={tMenu("menu.themeOptionA11y", { option: themeLabel(option) })}
                      style={[
                        styles.optionButton,
                        themeDraft === option &&
                          styles.selectedOption,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.optionText,
                          themeDraft ===
                            option &&
                            styles.selectedOptionText,
                        ]}
                      >
                        {option === "system"
                          ? tMenu("menu.themeSystem")
                          : option === "dark"
                            ? tMenu("menu.themeDark")
                            : tMenu("menu.themeLight")}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Font Size */}
              <View
                style={styles.preferenceBlock}
              >
                <AppText
                  variant="caption"
                  style={styles.groupLabel}
                >
                  {tMenu("menu.fontSize")}
                </AppText>

                <View style={styles.optionRow}>
                  {[
                    "Small",
                    "Medium",
                    "Big",
                  ].map((option) => (
                    <Pressable
                      key={option}
                      onPress={() =>
                        setFontSize(
                          option as
                            | "Small"
                            | "Medium"
                            | "Big",
                        )
                      }
                      accessibilityRole="radio"
                      accessibilityState={{
                        selected:
                          fontSize === option,
                      }}
                      accessibilityLabel={tMenu("menu.fontSizeOptionA11y", { option })}
                      style={[
                        styles.optionButton,
                        fontSize === option &&
                          styles.selectedOption,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.optionText,
                          fontSize ===
                            option &&
                            styles.selectedOptionText,
                        ]}
                      >
                        {option === "Small"
                          ? tMenu("menu.fontSmall")
                          : option === "Medium"
                            ? tMenu("menu.fontMedium")
                            : tMenu("menu.fontBig")}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Font Family */}
              <View
                style={styles.preferenceBlock}
              >
                <AppText
                  variant="caption"
                  style={styles.groupLabel}
                >
                  {tMenu("menu.fontFamily")}
                </AppText>

                <Pressable
                  onPress={() => {
                    setFontFamilyOpen(true);
                    setLanguageOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={tMenu("menu.chooseFontFamily")}
                  accessibilityHint={tMenu("menu.currentFont", { font: fontFamily })}
                  style={
                    styles.dropdownInput
                  }
                >
                  <AppText
                    style={
                      styles.dropdownInputText
                    }
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

              <View
                style={styles.preferenceBlock}
              >
                <Pressable
                  onPress={() => {
                    setLanguageOpen(true);
                    setFontFamilyOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={tMenu(
                    "menu.language.chooseLanguage",
                  )}
                  accessibilityHint={tMenu(
                    "menu.language.current",
                    { language: languageLabel },
                  )}
                  style={
                    styles.dropdownInput
                  }
                >
                  <AppText
                    style={
                      styles.dropdownInputText
                    }
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

              <View style={styles.preferenceRow}>
                <View
                  style={styles.preferenceText}
                >
                  <AppText
                    variant="body"
                    style={
                      styles.preferenceTitle
                    }
                  >
                    {tMenu("menu.vibration")}
                  </AppText>

                  <AppText
                    variant="caption"
                    style={
                      styles.preferenceDescription
                    }
                  >
                    {tMenu("menu.vibrationHint")}
                  </AppText>
                </View>

                {renderToggle(
                  vibration,
                  handleVibrationToggle,
                )}
              </View>

              <View style={styles.preferenceRow}>
                <View
                  style={styles.preferenceText}
                >
                  <AppText
                    variant="body"
                    style={
                      styles.preferenceTitle
                    }
                  >
                    {tMenu("menu.reminders")}
                  </AppText>

                  <AppText
                    variant="caption"
                    style={
                      styles.preferenceDescription
                    }
                  >
                    {tMenu("menu.remindersHint")}
                  </AppText>
                </View>

                {renderToggle(
                  reminders,
                  handleRemindersToggle,
                )}
              </View>

              <View style={styles.preferenceRow}>
                <View
                  style={styles.preferenceText}
                >
                  <AppText
                    variant="body"
                    style={
                      styles.preferenceTitle
                    }
                  >
                    {tMenu("menu.emailNotifications")}
                  </AppText>

                  <AppText
                    variant="caption"
                    style={
                      styles.preferenceDescription
                    }
                  >
                    {tMenu("menu.emailNotificationsHint")}
                  </AppText>
                </View>

                {renderToggle(
                  emailNotifications,
                  setEmailNotifications,
                )}
              </View>
          </View>

          <View style={styles.modalFooter}>
            <Pressable
              onPress={handleClosePreferences}
              disabled={isSavingPreferences}
              accessibilityRole="button"
              accessibilityLabel={tMenu("menu.cancelPreferences")}
              style={({ pressed }) => [
                styles.modalFooterButton,
                styles.modalCancelButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="body"
                style={
                  styles.modalCancelButtonText
                }
              >
                {tMenu("menu.cancel")}
              </AppText>
            </Pressable>

            <Pressable
              onPress={handleSavePreferences}
              disabled={isSavingPreferences}
              accessibilityRole="button"
              accessibilityLabel={tMenu("menu.savePreferences")}
              style={({ pressed }) => [
                styles.modalFooterButton,
                styles.modalSubmitButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="body"
                style={
                  styles.modalSubmitButtonText
                }
              >
                {isSavingPreferences
                  ? tMenu("menu.saving")
                  : tMenu("menu.save")}
              </AppText>
            </Pressable>
          </View>
        </DropdownModal>

        {/* ================= FONT FAMILY PICKER ================= */}

        <DropdownModal
          visible={fontFamilyOpen}
          title={tMenu("menu.fontFamily")}
          onClose={() =>
            setFontFamilyOpen(false)
          }
        >
          {FONT_FAMILY_OPTIONS.map(
            (font) => (
              <RadioOptionRow
                key={font}
                label={font}
                selected={fontFamily === font}
                onPress={() => {
                  setFontFamily(font);
                  setFontFamilyOpen(false);
                }}
              />
            ),
          )}
        </DropdownModal>

        {/* ================= LANGUAGE PICKER ================= */}

        <DropdownModal
          visible={languageOpen}
          title={tMenu("menu.language.title")}
          onClose={() =>
            setLanguageOpen(false)
          }
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

        <View
          style={styles.versionSection}
        >
          <View style={styles.versionCard}>
            <AppText
              variant="body"
              style={styles.versionTitle}
            >
              AdlaWatt
            </AppText>

            <AppText
              variant="caption"
              style={styles.versionNumber}
            >
              v1.0.0
            </AppText>
          </View>
        </View>

        <View style={styles.authActionRow}>
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.logoutA11y")}
            style={({ pressed }) => [
              styles.authActionButton,
              styles.logOutButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={colors.error}
            />

            <AppText
              variant="body"
              style={styles.logOutButtonText}
            >
              {tMenu("menu.logoutTitle")}
            </AppText>
          </Pressable>

          {Platform.OS !== "ios" && (
            <Pressable
              onPress={handleExit}
              accessibilityRole="button"
              accessibilityLabel={tMenu("menu.exitAppA11y")}
              style={({ pressed }) => [
                styles.authActionButton,
                styles.exitButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="exit-outline"
                size={22}
                color={colors.text}
              />

              <AppText
                variant="body"
                style={styles.exitButtonText}
              >
                {tMenu("menu.exitTitle")}
              </AppText>
            </Pressable>
          )}
        </View>

        <Copyright />
      </ScrollView>

      {/* Password Confirmation Modal */}
      <Modal
        visible={confirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (
            !confirmingAccountUpdate
          ) {
            setConfirmationVisible(false);
            setConfirmationWarning("");
            setCurrentPassword("");
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText
              variant="heading"
              style={styles.modalTitle}
            >
              {tMenu("menu.confirmChanges")}
            </AppText>

            <AppText
              variant="caption"
              style={styles.modalDescription}
            >
              {tMenu("menu.confirmChangesBody")}
            </AppText>

            {confirmationWarning ? (
              <View
                style={
                  styles.warningContainer
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.error}
                />

                <AppText
                  style={
                    styles.warningText
                  }
                >
                  {confirmationWarning}
                </AppText>
              </View>
            ) : null}

            <PasswordInput
              label={tMenu("menu.currentPassword")}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setConfirmationWarning("");
              }}
              placeholder={tMenu("menu.enterCurrentPassword")}
              autoComplete="current-password"
              editable={!confirmingAccountUpdate}
            />

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => {
                  if (
                    confirmingAccountUpdate
                  ) {
                    return;
                  }

                  setCurrentPassword("");
                  setConfirmationWarning("");
                  setConfirmationVisible(false);
                }}
                disabled={
                  confirmingAccountUpdate
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <AppText
                  style={
                    styles.secondaryButtonText
                  }
                >
                  {tMenu("menu.cancel")}
                </AppText>
              </Pressable>

              <Pressable
                onPress={
                  handleConfirmChanges
                }
                disabled={
                  confirmingAccountUpdate
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.actionButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <AppText
                  style={
                    styles.primaryButtonText
                  }
                >
                  {confirmingAccountUpdate
                    ? tMenu("menu.saving")
                    : tMenu("menu.confirm")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer2>
  );
}

const settingsDimensions = {
  horizontalPadding: 16,
  sectionSpacing: 16,
  borderWidth: 3,
  borderRadius: 16,
  innerRadius: 12,
};

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },

  content: {
    paddingHorizontal:
      settingsDimensions.horizontalPadding,
    paddingTop: settingsDimensions.sectionSpacing,
    paddingBottom: 30,
  },

  /* ================= HEADER ================= */

  headerCard: {
    backgroundColor: colors.glass.white,
    borderWidth: settingsDimensions.borderWidth,
    borderColor: colors.cardBorder,
    borderRadius: settingsDimensions.borderRadius,
    padding: 18,
    marginBottom: settingsDimensions.sectionSpacing,
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

  /* ================= MENU BOXES ================= */

  menuGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom:
      settingsDimensions.sectionSpacing,
  },

  menuBox: {
    width: "46%",
    maxWidth: 150,
    minHeight: 150,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  menuBoxActive: {
    backgroundColor:
      colors.selectedWash,
  },

  menuBoxText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },

  /* ================= ACCOUNT ================= */

  infoRow: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  infoLabel: {
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
  },

  infoValue: {
    color: colors.text,
    fontWeight: "500",
  },

  primaryButton: {
    minHeight: Control.button,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    alignSelf: "flex-end",
    marginTop: 6,
  },

  primaryButtonText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },

  secondaryButton: {
    minHeight: Control.button,
    backgroundColor: colors.glass.white,
    borderWidth: 3,
    borderColor: colors.secondary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  secondaryButtonText: {
    color: colors.secondary,
    fontWeight: "700",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },

  actionButton: {
    alignSelf: "auto",
    marginTop: 0,
  },

  pressed: {
    opacity: 0.7,
  },

  /* ================= INPUTS ================= */

  inputGroup: {
    marginBottom: 14,
  },

  inputLabel: {
    color: colors.text,
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
    minHeight: 48,
    backgroundColor: colors.glass.white,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },

  /* ================= PREFERENCES ================= */

  preferenceRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginBottom: 12,
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

  preferenceBlock: {
    width: "100%",
    paddingVertical: 6,
    marginBottom: 12,
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

  /* ================= MODAL SHEETS ================= */

  modalScroll: {
    width: "100%",
  },

  // Preferences body sizes to its content (no scrolling).
  modalBody: {
    width: "100%",
  },

  modalFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  modalFooterButton: {
    flex: 1,
    minHeight: Control.button,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: Radius.md,
  },

  modalCancelButton: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
  },

  modalCancelButtonText: {
    color: colors.error,
    fontWeight: "700",
  },

  modalSubmitButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  modalSubmitButtonText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },

  modalCloseButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  modalCloseButtonText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },

  /* ================= VERSION ================= */

  versionSection: {
    marginBottom: 18,
  },

  versionCard: {
    backgroundColor: colors.glass.white,
    borderWidth: settingsDimensions.borderWidth,
    borderColor: colors.cardBorder,
    borderRadius: settingsDimensions.borderRadius,
    padding: 18,
  },

  versionTitle: {
    color: colors.text,
    fontWeight: "700",
  },

  versionNumber: {
    color: colors.textSecondary,
    marginTop: 4,
  },

  /* ================= LOG OUT + EXIT ================= */

  authActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  authActionButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderRadius: Radius.md,
    backgroundColor: colors.surface,
  },

  logOutButton: {
    borderColor: colors.error,
  },

  logOutButtonText: {
    color: colors.error,
    fontWeight: "700",
  },

  exitButton: {
    borderColor: colors.text,
  },

  exitButtonText: {
    color: colors.text,
    fontWeight: "700",
  },

  /* ================= MODAL ================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayStrong,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 20,
    elevation: 10,
  },

  modalTitle: {
    color: colors.text,
    fontWeight: "700",
  },

  modalDescription: {
    color: colors.textSecondary,
    marginTop: 7,
    marginBottom: 18,
    lineHeight: 20,
  },

  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  warningText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
});