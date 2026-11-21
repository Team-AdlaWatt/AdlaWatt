import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { router } from "expo-router";

import Copyright from "@/components/ui/Copyright";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import AppText from "@/components/ui/AppText";
import { DropdownModal } from "@/components/ui/DropdownModal";

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
import PinInput from "@/components/ui/PinInput";
import PinInfoModal from "@/components/ui/PinInfoModal";
import PinChangeWarningModal from "@/components/ui/PinChangeWarningModal";
import { logProfile } from "@/services/activityLogService";
import {
  validatePin,
  validatePinPair,
} from "@/lib/pinValidation";
import { supabase } from "@/lib/supabase";

import { useAuth } from "@/context/AuthContext";
import { useTypography } from "@/hooks/useTypography";
import { useTranslation } from "react-i18next";
import { performSignOut } from "@/services/signOut";

import { Ionicons } from "@expo/vector-icons";

type PasswordPurpose =
  | "account"
  | "revealPin"
  | "updatePin";

export default function SettingsScreen() {
  // ============================================
  // DROPDOWN STATES
  // ============================================

  const [accountExpanded, setAccountExpanded] =
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

  const [passwordPurpose, setPasswordPurpose] =
    useState<PasswordPurpose>("account");

  const [pinValue, setPinValue] = useState("");
  const [pinVisible, setPinVisible] = useState(false);
  const [pinRevealRemaining, setPinRevealRemaining] =
    useState(0);
  const [pinWarning, setPinWarning] = useState("");
  const [pinInfoVisible, setPinInfoVisible] =
    useState(false);
  const [pinChangeWarningVisible, setPinChangeWarningVisible] =
    useState(false);
  const [pinUpdateVisible, setPinUpdateVisible] =
    useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] =
    useState("");
  const [confirmingPinPassword, setConfirmingPinPassword] =
    useState(false);

  const pinHideTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pinTickTimer = useRef<
    ReturnType<typeof setInterval> | null
  >(null);

  const { t: tMenu } = useTranslation();

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

  const passwordBusy =
    confirmingAccountUpdate || confirmingPinPassword;

  const clearPinTimers = useCallback(() => {
    if (pinHideTimer.current) {
      clearTimeout(pinHideTimer.current);
      pinHideTimer.current = null;
    }

    if (pinTickTimer.current) {
      clearInterval(pinTickTimer.current);
      pinTickTimer.current = null;
    }
  }, []);

  const hidePin = useCallback(() => {
    clearPinTimers();
    setPinVisible(false);
    setPinRevealRemaining(0);
  }, [clearPinTimers]);

  const revealPinTemporarily = useCallback(() => {
    clearPinTimers();
    setPinVisible(true);
    setPinRevealRemaining(5);

    pinTickTimer.current = setInterval(() => {
      setPinRevealRemaining((value) =>
        Math.max(0, value - 1),
      );
    }, 1000);

    pinHideTimer.current = setTimeout(() => {
      hidePin();
    }, 5000);
  }, [clearPinTimers, hidePin]);

  useEffect(() => clearPinTimers, [clearPinTimers]);

  // ============================================
  // LOAD ACCOUNT PROFILE
  // ============================================

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

      setUsername(loadedUsername);
      setEmail(loadedEmail);

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
    hidePin();
    setPasswordPurpose("account");
    setPinUpdateVisible(false);
    setPinChangeWarningVisible(false);
    setPinWarning("");

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
    if (passwordBusy) {
      return;
    }

    handleCancelUpdate();
    hidePin();
    setPasswordPurpose("account");
    setPinWarning("");
    setPinUpdateVisible(false);
    setPinChangeWarningVisible(false);
    setPinInfoVisible(false);
    setAccountExpanded(false);
  };

  // ============================================
  // SUBMIT ACCOUNT UPDATE
  // ============================================

  const handleSubmitAccountUpdate = () => {
    if (passwordBusy) {
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
    setPasswordPurpose("account");
    setConfirmationVisible(true);
  };

  // ============================================
  // TFT PIN ACTIONS
  // ============================================

  const openPinPasswordConfirmation = (
    purpose: "revealPin" | "updatePin",
  ) => {
    if (passwordBusy) {
      return;
    }

    hidePin();
    setPinWarning("");
    setCurrentPassword("");
    setConfirmationWarning("");
    setPasswordPurpose(purpose);
    setConfirmationVisible(true);
  };

  const handleRevealPinPress = () => {
    if (pinVisible) {
      hidePin();
      return;
    }

    openPinPasswordConfirmation("revealPin");
  };

  const handleUpdatePinPress = () => {
    setPinWarning("");
    setPinChangeWarningVisible(true);
  };

  const handleContinuePinChange = () => {
    setPinChangeWarningVisible(false);
    openPinPasswordConfirmation("updatePin");
  };

  const handleCancelPinUpdate = () => {
    setNewPin("");
    setConfirmNewPin("");
    setPinWarning("");
    setPinUpdateVisible(false);
  };

  const handleSubmitPinUpdate = () => {
    const pinResult = validatePin(newPin);

    if (!pinResult.valid) {
      setPinWarning(
        tMenu(`validation.${pinResult.error}`),
      );
      return;
    }

    const pairResult = validatePinPair(
      newPin,
      confirmNewPin,
    );

    if (!pairResult.valid) {
      setPinWarning(
        tMenu(`validation.${pairResult.error}`),
      );
      return;
    }

    hidePin();
    setPinValue(newPin);
    setNewPin("");
    setConfirmNewPin("");
    setPinWarning("");
    setPinUpdateVisible(false);

    Alert.alert(
      tMenu("pin.updatedTitle"),
      tMenu("pin.updatedMessage"),
    );
  };

  const handleConfirmPinPassword = async () => {
    if (confirmingPinPassword) {
      return;
    }

    setConfirmationWarning("");

    const password = currentPassword;

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

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setConfirmationWarning(
        tMenu("menu.updateFailed"),
      );
      return;
    }

    try {
      setConfirmingPinPassword(true);

      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        setConfirmationWarning(
          tMenu("pin.passwordInvalid"),
        );
        return;
      }

      setCurrentPassword("");
      setConfirmationWarning("");
      setConfirmationVisible(false);

      if (passwordPurpose === "revealPin") {
        revealPinTemporarily();
      } else if (passwordPurpose === "updatePin") {
        setPinUpdateVisible(true);
      }
    } catch {
      setConfirmationWarning(
        tMenu("menu.updateFailedNow"),
      );
    } finally {
      setConfirmingPinPassword(false);
    }
  };

  // ============================================
  // CONFIRM ACCOUNT UPDATE
  // ============================================

  const handleConfirmChanges = async () => {
    if (passwordBusy) {
      return;
    }

    if (passwordPurpose !== "account") {
      await handleConfirmPinPassword();
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
  // LOG OUT
  // ============================================

  const { height: windowHeight } = useWindowDimensions();

  const handleLogout = () => {
    const logout = () => {
      // Immediate UI exit: teardown runs in the background.
      performSignOut();
      router.replace(Routes.LOGIN);
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
              router.push(Routes.ADD_DEVICE)
            }
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.openAddDevice")}
            style={({ pressed }) => [
              styles.menuBox,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="bluetooth"
              size={60}
              color={colors.accentContent}
            />

            <AppText
              variant="body"
              style={styles.menuBoxText}
            >
              {tMenu("menu.addDevice")}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(Routes.PREFERENCES)
            }
            accessibilityRole="button"
            accessibilityLabel={tMenu("menu.openPreferences")}
            style={({ pressed }) => [
              styles.menuBox,
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

                  {/* TFT PIN */}
                  <View style={styles.infoRow}>
                    <View style={styles.pinLabelRow}>
                      <AppText
                        variant="caption"
                        style={styles.infoLabel}
                      >
                        {tMenu("pin.label")}
                      </AppText>

                      <Pressable
                        onPress={() =>
                          setPinInfoVisible(true)
                        }
                        style={styles.pinInfoButton}
                        accessibilityRole="button"
                        accessibilityLabel={tMenu(
                          "pin.infoA11y",
                        )}
                        hitSlop={8}
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={18}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    </View>

                    <AppText
                      variant="body"
                      style={styles.pinValue}
                      accessibilityLiveRegion="polite"
                      accessibilityLabel={
                        pinVisible
                          ? tMenu("pin.revealedLive", {
                              seconds:
                                pinRevealRemaining,
                            })
                          : undefined
                      }
                    >
                      {pinVisible
                        ? pinValue ||
                          tMenu("pin.notAvailable")
                        : tMenu("pin.masked")}
                    </AppText>

                    {!pinValue && !pinVisible ? (
                      <AppText
                        variant="caption"
                        style={styles.pinGeneratedNotice}
                      >
                        {tMenu("pin.generatedNotice")}
                      </AppText>
                    ) : null}

                    {pinVisible ? (
                      <AppText
                        variant="caption"
                        style={styles.pinCountdown}
                      >
                        {tMenu("pin.revealedHint")}
                      </AppText>
                    ) : null}

                    <View style={styles.pinActionRow}>
                      <Pressable
                        onPress={handleRevealPinPress}
                        style={({ pressed }) => [
                          styles.pinActionButton,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          pinVisible
                            ? tMenu("pin.displayHideA11y")
                            : tMenu(
                                "pin.displayRevealA11y",
                              )
                        }
                        accessibilityHint={
                          pinVisible
                            ? tMenu("pin.displayHideHint")
                            : undefined
                        }
                      >
                        <AppText
                          variant="caption"
                          style={
                            styles.pinActionButtonText
                          }
                        >
                          {pinVisible
                            ? tMenu("pin.hide")
                            : tMenu("pin.reveal")}
                        </AppText>
                      </Pressable>

                      <Pressable
                        onPress={handleUpdatePinPress}
                        style={({ pressed }) => [
                          styles.pinActionButton,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={tMenu(
                          "pin.updateA11y",
                        )}
                      >
                        <AppText
                          variant="caption"
                          style={
                            styles.pinActionButtonText
                          }
                        >
                          {tMenu("pin.update")}
                        </AppText>
                      </Pressable>
                    </View>
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

        <DropdownModal
          visible={pinUpdateVisible}
          title={tMenu("pin.update")}
          onClose={handleCancelPinUpdate}
        >
          <ScrollView
            style={[
              styles.modalScroll,
              {
                maxHeight:
                  windowHeight * 0.55,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <PinInput
              label={tMenu("pin.labelNew")}
              value={newPin}
              onChangeText={(text) => {
                setNewPin(text);
                setPinWarning("");
              }}
              onInvalidInput={() =>
                setPinWarning(
                  tMenu("validation.pinNumbersOnly"),
                )
              }
              placeholder={tMenu("pin.placeholder")}
              helper={tMenu("pin.hint")}
              infoAccessibilityLabel={tMenu(
                "pin.infoA11y",
              )}
              onInfoPress={() =>
                setPinInfoVisible(true)
              }
            />

            <PinInput
              label={tMenu("pin.labelConfirmNew")}
              value={confirmNewPin}
              onChangeText={(text) => {
                setConfirmNewPin(text);
                setPinWarning("");
              }}
              onInvalidInput={() =>
                setPinWarning(
                  tMenu("validation.pinNumbersOnly"),
                )
              }
              placeholder={tMenu("pin.placeholder")}
            />

            {pinWarning ? (
              <View style={styles.warningContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.error}
                />

                <AppText style={styles.warningText}>
                  {pinWarning}
                </AppText>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              onPress={handleCancelPinUpdate}
              accessibilityRole="button"
              accessibilityLabel={tMenu("menu.cancel")}
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
              onPress={handleSubmitPinUpdate}
              accessibilityRole="button"
              accessibilityLabel={tMenu("menu.confirm")}
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
                {tMenu("menu.confirm")}
              </AppText>
            </Pressable>
          </View>
        </DropdownModal>

        <PinInfoModal
          visible={pinInfoVisible}
          onClose={() =>
            setPinInfoVisible(false)
          }
        />

        <PinChangeWarningModal
          visible={pinChangeWarningVisible}
          onCancel={() =>
            setPinChangeWarningVisible(false)
          }
          onContinue={handleContinuePinChange}
        />

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
          if (!passwordBusy) {
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
              {passwordPurpose === "revealPin"
                ? tMenu("pin.confirmRevealTitle")
                : passwordPurpose === "updatePin"
                  ? tMenu("pin.confirmUpdateTitle")
                  : tMenu("menu.confirmChanges")}
            </AppText>

            <AppText
              variant="caption"
              style={styles.modalDescription}
            >
              {passwordPurpose === "account"
                ? tMenu("menu.confirmChangesBody")
                : tMenu("pin.passwordBody")}
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
                  if (passwordBusy) {
                    return;
                  }

                  setCurrentPassword("");
                  setConfirmationWarning("");
                  setConfirmationVisible(false);
                }}
                disabled={passwordBusy}
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
                onPress={handleConfirmChanges}
                disabled={passwordBusy}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  style={styles.primaryButtonText}
                >
                  {passwordBusy
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

  pinLabelRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pinInfoButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -6,
  },

  pinValue: {
    color: colors.text,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 2,
  },

  pinGeneratedNotice: {
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },

  pinCountdown: {
    color: colors.textSecondary,
    marginTop: 6,
  },

  pinActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  pinActionButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    backgroundColor: colors.surface,
  },

  pinActionButtonText: {
    color: colors.text,
    fontWeight: "600",
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

  /* ================= MODAL SHEETS ================= */

  modalScroll: {
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