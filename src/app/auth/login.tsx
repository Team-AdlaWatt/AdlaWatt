import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import AppInput from "@/components/ui/AppInput";
import Copyright from "@/components/ui/Copyright";
import GoogleGIcon from "@/components/ui/GoogleGIcon";
import PasswordInput from "@/components/ui/PasswordInput";
import AuthFooter from "@/components/layout/AuthFooter";
import AuthHeader from "@/components/layout/AuthHeader";
import AuthLogo from "@/components/layout/AuthLogo";
import AuthWarning from "@/components/layout/AuthWarning";
import ScreenContainer from "@/components/layout/ScreenContainer";
import AppButton from "@/components/ui/AppButton";
import AppText from "@/components/ui/AppText";
import { Routes } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { Control, Touch } from "@/constants/sizing";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

import {
  getCurrentUserProfile,
  loginUser,
  resendConfirmation,
  resolvePostLoginRoute,
  signInWithGoogle,
} from "@/services/auth";
import { useTranslation } from "react-i18next";

// Completes the pending auth session on Android when the
// in-app browser redirects back to adlawatt://auth/callback.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [confirmationResent, setConfirmationResent] = useState<
    "" | "sent" | "rate-limited" | "failed"
  >("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const colors = useAppColors();
  const noticeStyles = useMemo(
    () => mailCardStyles(colors),
    [colors],
  );
  const extraStyles = useMemo(
    () => loginExtraStyles(colors),
    [colors],
  );

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
    if (resending || resendCooldown > 0 || !unconfirmedEmail) {
      return;
    }

    setResending(true);

    try {
      const result = await resendConfirmation(unconfirmedEmail);

      if (result.success) {
        setConfirmationResent("sent");
        setResendCooldown(60);
      } else if (result.throttled) {
        setConfirmationResent("rate-limited");
        setResendCooldown(60);
      } else {
        setConfirmationResent("failed");
      }
    } finally {
      setResending(false);
    }
  };

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
  if (loading) {
    return;
  }

  setWarning("");

  const identifier = usernameOrEmail.trim();
  const cleanPassword = password;

  if (!identifier) {
    setWarning(t("validation.identifierEmpty"));
    return;
  }

  if (!cleanPassword) {
    setWarning(t("validation.passwordEmpty"));
    return;
  }

  if (identifier.includes("@")) {
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(identifier)) {
      setWarning(t("validation.emailInvalid"));
      return;
    }
  } else if (identifier.length < 3) {
    setWarning(t("validation.usernameShort"));
    return;
  }

  if (cleanPassword.length < 8) {
    setWarning(t("validation.passwordShort"));
    return;
  }

  try {
    setLoading(true);

    const result = await loginUser(
      identifier,
      cleanPassword,
    );

    if (!result.success) {
  if (result.emailNotConfirmed) {
    setUnconfirmedEmail(result.email ?? "");

    const resent =
      (result.confirmationResent as
        | "sent"
        | "rate-limited"
        | "failed"
        | undefined) ?? "failed";

    setConfirmationResent(resent);

    if (resent === "sent") {
      setResendCooldown(60);
    }

    // Confirmation flow owns its messaging in the notice
    // card below Sign In; keep the red warning slot clear.
    setWarning("");
    return;
  }

  setUnconfirmedEmail("");
  setConfirmationResent("");

  setWarning(
    result.error ??
      t("auth.login.signInFailed"),
  );
  return;
}

    setUnconfirmedEmail("");
    setConfirmationResent("");

    // Hidden admin routing: test admin (users.role admin)
    // lands on /admin, everyone else on /dashboard. Profile
    // failures fall back to household (never fail open).
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
  } catch {
    setWarning(
      t("common.wentWrong"),
    );
  } finally {
    setLoading(false);
  }
};

  const handleRegister = () => {
    router.push(Routes.REGISTER);
  };

  // ── Forgot password routes to its screen; Google uses
  // the Supabase OAuth provider (see services/auth). ──
  const handleForgotPassword = () => {
    router.push(Routes.FORGOT_PASSWORD);
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
        // session and routes on its own — replace explicitly
        // in case the event lags (role-aware for admin).
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

      // Dismissed browser: stay on login silently.
      if ("cancelled" in result && result.cancelled) {
        return;
      }

      if ("redirected" in result && result.redirected) {
        return;
      }

      setWarning(
        ("error" in result && typeof result.error === "string" && result.error) ||
          t("auth.login.googleIncomplete"),
      );
    } catch {
      setWarning(
        t("auth.login.googleIncomplete"),
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <AuthLogo />

        <AuthHeader
          title={t("auth.login.title")}
          subtitle={t("auth.login.subtitle")}
        />

        <View style={styles.form}>
          <AppInput
            label={t("auth.login.identifierLabel")}
            value={usernameOrEmail}
            onChangeText={setUsernameOrEmail}
            placeholder={t("auth.login.identifierPlaceholder")}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            returnKeyType="next"
            onSubmitEditing={() =>
              passwordRef.current?.focus()
            }
          />

          <PasswordInput
            label={t("passwordInput.labelPassword")}
            value={password}
            onChangeText={setPassword}
            placeholder={t("passwordInput.placeholderPassword")}
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            inputRef={passwordRef}
            bottomGap={0}
          />

          <View style={extraStyles.forgotRow}>
            <Pressable
              onPress={handleForgotPassword}
              style={extraStyles.forgotHit}
              accessibilityRole="link"
              accessibilityLabel={t("auth.login.forgotPasswordLabel")}
              accessibilityHint={t("auth.login.forgotPasswordHint")}
              hitSlop={12}
            >
              <AppText style={extraStyles.forgotLink}>
                {t("auth.login.forgotPassword")}
              </AppText>
            </Pressable>
          </View>

          <AppButton
            title={loading ? t("auth.login.signingIn") : t("auth.login.signIn")}
            onPress={handleLogin}
            disabled={loading}
          />

          <AuthWarning message={warning} />

          <View
            style={extraStyles.dividerRow}
            accessibilityRole="none"
          >
            <View style={extraStyles.dividerLine} />
            <AppText style={extraStyles.dividerText}>{t("auth.login.dividerOr")}</AppText>
            <View style={extraStyles.dividerLine} />
          </View>

          <Pressable
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
            style={({ pressed }) => [
              extraStyles.googleButton,
              pressed && extraStyles.googlePressed,
              (loading || googleLoading) &&
                extraStyles.googleDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("auth.login.googleA11y")}
            accessibilityHint={t("auth.login.googleHint")}
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
            <AppText style={extraStyles.googleLabel}>
              {googleLoading
                ? t("auth.login.connecting")
                : t("auth.login.continueWithGoogle")}
            </AppText>
          </Pressable>

          {unconfirmedEmail ? (
            <View
              style={noticeStyles.card}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityLabel={t("auth.login.verifyTitle")}
            >
              <View style={noticeStyles.headerPanel}>
                <View style={noticeStyles.headerLeft}>
                  <Ionicons
                    name="mail-unread-outline"
                    size={22}
                    color={colors.headerContent}
                  />

                  <AppText
                    style={noticeStyles.headerTitle}
                  >
                    {t("auth.login.verifyTitle")}
                  </AppText>
                </View>

                <View style={noticeStyles.sentPill}>
                  <AppText
                    style={noticeStyles.sentPillText}
                  >
                    {t("auth.login.verifySent")}
                  </AppText>
                </View>
              </View>

              <View style={noticeStyles.body}>
                <View style={noticeStyles.toRow}>
                  <AppText style={noticeStyles.toLabel}>
                    {t("auth.login.verifyTo")}
                  </AppText>

                  <View style={noticeStyles.emailChip}>
                    <AppText
                      style={noticeStyles.emailChipText}
                      numberOfLines={1}
                    >
                      {unconfirmedEmail}
                    </AppText>
                  </View>
                </View>

                <AppText style={noticeStyles.bodyText}>
                  {t("auth.login.verifyBody")}
                </AppText>

                <AppText style={noticeStyles.status}>
                  {confirmationResent === "sent"
                    ? t("auth.login.verifySentFresh")
                    : confirmationResent === "rate-limited"
                      ? t("auth.login.verifySentRecent")
                      : t("auth.login.verifySendFresh")}
                </AppText>

                <AppButton
                  title={
                    resending
                      ? t("common.resending")
                      : resendCooldown > 0
                        ? t("common.resendIn", {
                            seconds: resendCooldown,
                          })
                        : t("auth.login.resendConfirmation")
                  }
                  onPress={handleResend}
                  disabled={resending || resendCooldown > 0}
                />
              </View>
            </View>
          ) : null}
        </View>

        <AuthFooter
          prompt={t("auth.login.footerPrompt")}
          actionLabel={t("auth.login.footerAction")}
          onAction={handleRegister}
        />

        {/* Test admin hint: static text only (no autofill),
            dev builds only — never ships to production. The
            account itself must exist in Supabase with
            users.role = 'admin' (see user_roles migration);
            the password below is a test-only credential. */}
        {__DEV__ ? (
          <View
            style={noticeStyles.card}
            accessibilityRole="text"
            accessibilityLabel={t(
              "auth.login.testAdminTitle",
            )}
          >
            <View style={noticeStyles.headerPanel}>
              <View style={noticeStyles.headerLeft}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={colors.headerContent}
                />

                <AppText
                  style={noticeStyles.headerTitle}
                >
                  {t("auth.login.testAdminTitle")}
                </AppText>
              </View>
            </View>

            <View style={noticeStyles.body}>
              <AppText style={noticeStyles.bodyText}>
                {t("auth.login.testAdminHint")}
              </AppText>

              <AppText style={noticeStyles.status}>
                {t("auth.login.testAdminEmailLabel")}:{" "}
                admin_test@adlawatt.test
              </AppText>

              <AppText style={noticeStyles.status}>
                {t("auth.login.testAdminUsernameLabel")}:{" "}
                adlawatt_admin
              </AppText>

              <AppText style={noticeStyles.bodyText}>
                {t("auth.login.testAdminPasswordLabel")}:{" "}
                adlawatt123
              </AppText>
            </View>
          </View>
        ) : null}

        <Copyright />
      </View>
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
});

const mailCardStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      width: "100%",
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      overflow: "hidden",
      marginTop: Spacing.md,
    },

    headerPanel: {
      width: "100%",
      backgroundColor: colors.headerBackground,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 9,
    },

    headerLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    },

    headerTitle: {
      color: colors.headerContent,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
      flexShrink: 1,
    },

    sentPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.headerContent,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginLeft: 8,
    },

    sentPillText: {
      color: colors.headerContent,
      fontSize: 12,
      fontWeight: "700",
    },

    body: {
      padding: 14,
    },

    toRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },

    toLabel: {
      color: colors.textSecondary,
    },

    emailChip: {
      flex: 1,
      minWidth: 0,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },

    emailChipText: {
      fontWeight: "700",
    },

    bodyText: {
      marginBottom: Spacing.xs,
    },

    status: {
      marginBottom: Spacing.sm,
      color: colors.textSecondary,
    },
  });

// ── Option B UI-only extras: Forgot Password + OR + Google ──
const loginExtraStyles = (colors: AppColors) =>
  StyleSheet.create({
    forgotRow: {
      width: "100%",
      alignItems: "flex-end",
      marginTop: 2,
      marginBottom: 14,
    },

    forgotHit: {
      // 48 minimum touch target (UI-STANDARDS.md).
      minHeight: Touch.target,
      justifyContent: "flex-start",
      paddingHorizontal: 4,
    },

    forgotLink: {
      color: colors.linkText,
      fontWeight: "600",
      textDecorationLine: "underline",
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
      backgroundColor: colors.border,
    },

    dividerText: {
      marginHorizontal: Spacing.sm,
      color: colors.textSecondary,
      fontWeight: "600",
    },

    googleButton: {
      width: "100%",
      minHeight: Control.button,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: Control.buttonPadding,
      marginTop: Control.buttonGap,
      gap: 10,
    },

    googlePressed: {
      opacity: 0.7,
    },

    googleDisabled: {
      opacity: 0.6,
    },

    googleLabel: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });