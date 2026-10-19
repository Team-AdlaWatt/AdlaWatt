import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import AppInput from "@/components/ui/AppInput";
import PasswordInput from "@/components/ui/PasswordInput";
import GoogleGIcon from "@/components/ui/GoogleGIcon";
import TermsModal from "@/components/forms/TermsModal";
import AuthFooter from "@/components/layout/AuthFooter";
import AuthHeader from "@/components/layout/AuthHeader";
import AuthLogo from "@/components/layout/AuthLogo";
import AuthWarning from "@/components/layout/AuthWarning";
import ScreenContainer from "@/components/layout/ScreenContainer";
import AppButton from "@/components/ui/AppButton";
import AppText from "@/components/ui/AppText";
import { DropdownModal } from "@/components/ui/DropdownModal";
import { Ionicons } from "@expo/vector-icons";
import { useAppColors } from "@/hooks/useAppColors";
import { Routes } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { Control } from "@/constants/sizing";
import Copyright from "@/components/ui/Copyright";

import {
  EMAIL_PATTERN,
  getCurrentUserProfile,
  registerUser,
  resendConfirmation,
  resolvePostLoginRoute,
  signInWithGoogle,
} from "@/services/auth";
import { useTranslation } from "react-i18next";

// Completes the pending auth session on Android when the
// in-app browser redirects back to adlawatt://auth/callback.
WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [termsModalVisible, setTermsModalVisible] =
    useState(false);

  const [termsAgreed, setTermsAgreed] =
    useState(false);

  const [warning, setWarning] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [confirmationPending, setConfirmationPending] =
    useState(false);

  const [confirmationEmail, setConfirmationEmail] =
    useState("");

  const [resending, setResending] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef =
    useRef<TextInput>(null);

  const colors = useAppColors();

  const showWarning = (message: string) => {
    setWarning(message);
  };

  const validateForm = () => {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
      showWarning(t("validation.usernameRequired"));
      return false;
    }

    if (cleanUsername.length < 3) {
      showWarning(
        t("validation.usernameShort"),
      );
      return false;
    }

    if (cleanUsername.length > 30) {
      showWarning(
        t("validation.usernameLong"),
      );
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      showWarning(
        t("validation.usernameChars"),
      );
      return false;
    }

    if (!cleanEmail) {
      showWarning(t("validation.emailRequired"));
      return false;
    }

    if (
      !EMAIL_PATTERN.test(
        cleanEmail
      )
    ) {
      showWarning(
        t("validation.emailInvalid"),
      );
      return false;
    }

    if (!password || password.trim().length < 8) {
      showWarning(
        t("validation.passwordShort"),
      );
      return false;
    }

    if (password.length > 72) {
      showWarning(
        t("validation.passwordLong"),
      );
      return false;
    }

    if (password !== confirmPassword) {
      showWarning(
        t("validation.passwordsMismatch"),
      );
      return false;
    }

    if (!termsAgreed) {
      showWarning(
        t("validation.termsRequiredLong"),
      );
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    setWarning("");

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const result = await registerUser(
        username,
        email,
        password,
        termsAgreed
      );

      if (!result.success) {
        showWarning(result.error ?? t("auth.register.accountFailed"));
        return;
      }

      if (result.needsConfirmation) {
        setWarning("");
        setConfirmationEmail(result.email ?? email.trim().toLowerCase());
        setConfirmationPending(true);
        return;
      }

      setWarning("");

      // Confirm-off projects hand back a live session, so
      // skip login and route role-aware (admin to /admin).
      try {
        const profile = await getCurrentUserProfile();

        router.replace(
          resolvePostLoginRoute(
            profile.success
              ? (profile as { role?: unknown }).role
              : null,
          ) as never,
        );
      } catch {
        router.replace(Routes.DASHBOARD);
      }
    } catch (error) {
      showWarning(
        error instanceof Error
          ? error.message
          : t("auth.register.accountFailedNow"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.replace(Routes.LOGIN);
  };

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) {
      return;
    }

    setWarning("");

    try {
      setGoogleLoading(true);

      const result = await signInWithGoogle();

      if (result.success) {
        // Web redirect unloads the page; native session is
        // already persisted. The auth layout notices the new
        // session and routes role-aware on its own —
        // replace explicitly in case the event lags.
        if (!("redirected" in result)) {
          try {
            const profile = await getCurrentUserProfile();

            router.replace(
              resolvePostLoginRoute(
                profile.success
                  ? (profile as { role?: unknown }).role
                  : null,
              ) as never,
            );
          } catch {
            router.replace(Routes.DASHBOARD);
          }
        }
        return;
      }

      // Dismissed browser: stay put silently.
      if ("cancelled" in result && result.cancelled) {
        return;
      }

      if ("redirected" in result && result.redirected) {
        return;
      }

      showWarning(
        ("error" in result &&
          typeof result.error === "string" &&
          result.error) ||
          t("auth.login.googleIncomplete"),
      );
    } catch {
      showWarning(
        t("auth.login.googleIncomplete"),
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTermsAgree = () => {
    setTermsAgreed(true);
    setTermsModalVisible(false);
    setWarning("");
  };

  const toggleTerms = () => {
    if (termsAgreed) {
      setTermsAgreed(false);
      setWarning("");
    } else {
      setTermsModalVisible(true);
    }
  };

  const openTerms = () => {
    setTermsModalVisible(true);
  };

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resending || resendCooldown > 0 || !confirmationEmail) {
      return;
    }

    setResending(true);
    setWarning("");

    try {
      const result = await resendConfirmation(confirmationEmail);

      if (!result.success) {
        showWarning(result.error ?? t("auth.register.resendFailed"));

        if (result.throttled) {
          setResendCooldown(60);
        }

        return;
      }

      setResendCooldown(60);
    } finally {
      setResending(false);
    }
  };

  const handleEditEmail = () => {
    setConfirmationPending(false);
    setConfirmationEmail("");
    setWarning("");
    emailRef.current?.focus();
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <AuthLogo />

        <AuthHeader
          title={t("auth.register.title")}
          subtitle={t("auth.register.subtitle")}
        />

        <View style={styles.form}>
          <AppInput
            label={t("auth.register.usernameLabel")}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setWarning("");
            }}
            placeholder={t("auth.register.usernamePlaceholder")}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            importantForAutofill="no"
            returnKeyType="next"
            onSubmitEditing={() =>
              emailRef.current?.focus()
            }
          />

          <AppInput
            label={t("auth.register.emailLabel")}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setWarning("");
            }}
            placeholder={t("auth.register.emailPlaceholder")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            importantForAutofill="no"
            returnKeyType="next"
            onSubmitEditing={() =>
              passwordRef.current?.focus()
            }
            inputRef={emailRef}
          />

          <PasswordInput
            label={t("passwordInput.labelPassword")}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setWarning("");
            }}
            placeholder={t("passwordInput.placeholderNewPassword")}
            autoComplete="password-new"
            importantForAutofill="no"
            returnKeyType="next"
            onSubmitEditing={() =>
              confirmPasswordRef.current?.focus()
            }
            inputRef={passwordRef}
          />

          <PasswordInput
            label={t("passwordInput.labelConfirmPassword")}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setWarning("");
            }}
            placeholder={t("passwordInput.placeholderConfirmNewPassword")}
            autoComplete="password-new"
            importantForAutofill="no"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            inputRef={confirmPasswordRef}
          />

          <View style={styles.termsRow}>
            <Pressable
              onPress={toggleTerms}
              style={styles.checkboxHit}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: termsAgreed,
              }}
              accessibilityLabel={t("auth.register.agreeA11y")}
              hitSlop={8}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor:
                      colors.primary,
                    backgroundColor:
                      termsAgreed
                        ? colors.primary
                        : colors.surface,
                  },
                ]}
              >
                {termsAgreed && (
                  <AppText
                    style={[
                      styles.checkmark,
                      {
                        color:
                          colors.onPrimary,
                      },
                    ]}
                  >
                    ✓
                  </AppText>
                )}
              </View>
            </Pressable>

            <AppText style={styles.termsText}>
              <AppText onPress={toggleTerms}>
                {t("auth.register.agreePrefix")}
              </AppText>
              <AppText
                style={[
                  styles.termsLink,
                  {
                    color: colors.linkText,
                  },
                ]}
                onPress={openTerms}
                accessibilityRole="link"
                accessibilityLabel={t("auth.register.openTermsA11y")}
              >
                {t("auth.register.termsLink")}
              </AppText>
            </AppText>
          </View>

          <AppButton
            title={
              loading
                ? t("auth.register.creatingAccount")
                : t("auth.register.createAccount")
            }
            onPress={handleRegister}
            disabled={loading || googleLoading}
            style={styles.createButton}
          />

          <AuthWarning message={warning} />

          <View
            style={styles.dividerRow}
            accessibilityRole="none"
          >
            <View
              style={[
                styles.dividerLine,
                {
                  backgroundColor:
                    colors.border,
                },
              ]}
            />
            <AppText
              style={[
                styles.dividerText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {t("auth.login.dividerOr")}
            </AppText>
            <View
              style={[
                styles.dividerLine,
                {
                  backgroundColor:
                    colors.border,
                },
              ]}
            />
          </View>

          <Pressable
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
            style={({ pressed }) => [
              styles.googleButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              (pressed ||
                loading ||
                googleLoading) &&
                styles.googlePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("auth.login.googleA11y")}
            accessibilityHint={t("auth.register.googleHint")}
            accessibilityState={{
              disabled: loading || googleLoading,
              busy: googleLoading,
            }}
          >
            {googleLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.textSecondary}
              />
            ) : (
              <GoogleGIcon size={20} />
            )}
            <AppText
              style={[
                styles.googleLabel,
                { color: colors.text },
              ]}
            >
              {googleLoading
                ? t("auth.login.connecting")
                : t("auth.login.continueWithGoogle")}
            </AppText>
          </Pressable>

          <DropdownModal
            visible={confirmationPending}
            title={t("auth.register.checkEmailTitle")}
            showCloseButton={false}
            dismissOnOverlayPress={false}
            onClose={() => {}}
          >
            <View style={styles.confirmationBody}>
              <View
                style={styles.mailIconWrap}
              >
                <Ionicons
                  name="mail-outline"
                  size={48}
                  color={colors.primary}
                />
              </View>

              <AppText
                style={styles.confirmationText}
              >
                {t("auth.register.confirmationSent", {
                  email: confirmationEmail,
                })}
              </AppText>

              <AppButton
                title={
                  resending
                    ? t("common.resending")
                    : resendCooldown > 0
                      ? t("common.resendIn", {
                          seconds: resendCooldown,
                        })
                      : t("auth.register.resendConfirmation")
                }
                onPress={handleResend}
                disabled={resending || resendCooldown > 0}
                style={styles.createButton}
              />

              <AppButton
                title={t("auth.register.continueToSignIn")}
                onPress={handleLogin}
                style={styles.createButton}
              />

              <Pressable
                onPress={handleEditEmail}
                style={styles.editEmailButton}
                accessibilityRole="button"
                accessibilityLabel={t(
                  "auth.register.useDifferentEmailA11y",
                )}
              >
                <AppText
                  style={[
                    styles.editEmailText,
                    {
                      color: colors.linkText,
                    },
                  ]}
                >
                  {t("auth.register.useDifferentEmail")}
                </AppText>
              </Pressable>
            </View>
          </DropdownModal>
        </View>

        <AuthFooter
          prompt={t("auth.register.footerPrompt")}
          actionLabel={t("auth.register.footerAction")}
          onAction={handleLogin}
        />

        <Copyright />
      </View>

      <TermsModal
        visible={termsModalVisible}
        onClose={() =>
          setTermsModalVisible(false)
        }
        onAgree={handleTermsAgree}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-start",
  },

  form: {
    width: "100%",
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },

  checkboxHit: {
    paddingVertical: 8,
    paddingRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  checkmark: {
    fontSize: 14,
    fontWeight: "700",
  },

  termsText: {
    flex: 1,
    flexWrap: "wrap",
  },

  termsLink: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  createButton: {
    marginTop: Spacing.sm,
  },

  dividerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },

  dividerLine: {
    flex: 1,
    height: 1,
  },

  dividerText: {
    marginHorizontal: Spacing.sm,
    fontWeight: "600",
  },

  googleButton: {
    width: "100%",
    minHeight: Control.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: Control.buttonPadding,
    marginTop: Control.buttonGap,
    gap: 10,
  },

  googlePressed: {
    opacity: 0.6,
  },

  googleLabel: {
    fontSize: 16,
    fontWeight: "600",
  },

  confirmationBody: {
    width: "100%",
    alignItems: "center",
  },

  mailIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: Spacing.sm,
  },

  confirmationText: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  editEmailButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: Spacing.xs,
  },

  editEmailText: {
    fontWeight: "600",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});