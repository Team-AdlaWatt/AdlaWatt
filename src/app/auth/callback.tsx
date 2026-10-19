import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import AppButton from "@/components/ui/AppButton";
import AuthFooter from "@/components/layout/AuthFooter";
import AuthHeader from "@/components/layout/AuthHeader";
import AuthLogo from "@/components/layout/AuthLogo";
import AuthWarning from "@/components/layout/AuthWarning";
import ScreenContainer from "@/components/layout/ScreenContainer";
import Copyright from "@/components/ui/Copyright";
import { Routes } from "@/constants/routes";
import { useAppColors } from "@/hooks/useAppColors";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

// ============================================================
// AUTH CALLBACK
// ============================================================
//
// Receives Supabase email-confirmation links on both
// native (adlawatt://auth/callback?code=…) and web
// (/auth/callback?code=…). PKCE code flow is primary;
// token_hash links are verified as fallback.
//
// Legacy implicit-flow links (#access_token=… in the hash,
// issued before the client forced flowType: 'pkce') carry
// no query params at all — expo-router can never see the
// fragment — so web parses the hash and sets the session
// directly as a second fallback.
// ============================================================

type Status = "working" | "success" | "error";

export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    code?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
    error?: string | string[];
    error_code?: string | string[];
    error_description?: string | string[];
  }>();

  const colors = useAppColors();

  const [status, setStatus] = useState<Status>("working");
  const [message, setMessage] = useState("");
  // True when the arriving link is an OAuth sign-in rather
  // than an email confirmation, so the header reads
  // "Google Sign-In" instead of "Email Confirmation".
  const [isOAuth, setIsOAuth] = useState(false);
  // True when the link carried no code at all (wrong/old
  // email, or params lost in transit). Offers a direct
  // recovery shortcut instead of a dead end.
  const [isMissingCode, setIsMissingCode] = useState(false);

  const exchangeAttempted = useRef(false);

  const firstParam = (
    value: string | string[] | undefined,
  ): string => {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value) && value.length > 0) {
      return value[0] ?? "";
    }

    return "";
  };

  const decodeParam = (value: string): string => {
    try {
      return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      return value;
    }
  };

  // Implicit-flow tokens live in the URL fragment
  // (#access_token=…&refresh_token=…), which never reaches
  // useLocalSearchParams. Parse it manually on web only.
  const parseHashParams = (): Record<string, string> => {
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      !window.location?.hash
    ) {
      return {};
    }

    const out: Record<string, string> = {};

    for (const part of window.location.hash
      .replace(/^#/, "")
      .split("&")) {
      const idx = part.indexOf("=");

      if (idx <= 0) {
        continue;
      }

      const key = part.slice(0, idx);
      const raw = part.slice(idx + 1);

      try {
        out[key] = decodeURIComponent(
          raw.replace(/\+/g, " "),
        );
      } catch {
        out[key] = raw;
      }
    }

    return out;
  };

  const code = firstParam(params.code);
  const tokenHash = firstParam(params.token_hash);
  const otpType = firstParam(params.type);
  const linkError =
    firstParam(params.error) || firstParam(params.error_code);
  const linkErrorDescription = firstParam(
    params.error_description,
  );

  // Recovery links sign the user in with a PASSWORD_RECOVERY
  // event (both PKCE-code and token-hash flows). Catch it and
  // hand the flow to /auth/forgot-password instead of the
  // dashboard — the AuthContext flag exempts that screen
  // from the signed-in bounce in the auth layout.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace(
          `${Routes.FORGOT_PASSWORD}?verified=1`,
        );
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const confirm = async () => {
      // Single-shot: auth codes are single-use, so a second
      // run (StrictMode remount, language switch mid-flow)
      // must never re-exchange and burn a confusing error
      // over a success.
      if (exchangeAttempted.current) {
        return;
      }

      exchangeAttempted.current = true;

      setStatus("working");
      setMessage("");

      if (linkError) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            linkErrorDescription
              ? decodeParam(linkErrorDescription)
              : t("auth.callback.linkInvalid"),
          );
        }
        return;
      }

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!cancelled) {
          if (error) {
            setStatus("error");
            setMessage(
              t("auth.callback.linkInvalidResend"),
            );
          } else {
            // A PKCE code can also come from Google OAuth,
            // not just email confirmation — label it by the
            // signed-in provider so Google users never see a
            // confusing "email confirmed" message.
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (
                user?.app_metadata?.provider === "google"
              ) {
                setIsOAuth(true);
                setStatus("success");
                setMessage(
                  t("auth.callback.signedInGoogle"),
                );

                return;
              }
            } catch {
              // Provider lookup is cosmetic only; fall
              // through to the confirmation copy below.
            }

            // The auth layout notices the new session and
            // routes to the dashboard on its own.
            setStatus("success");
            setMessage(
              t("auth.callback.confirmed"),
            );
          }
        }
        return;
      }

      if (tokenHash && otpType) {
        const allowedTypes = [
          "signup",
          "invite",
          "magiclink",
          "recovery",
          "email_change",
        ] as const;

        type OtpType = (typeof allowedTypes)[number];

        const verifiedType: OtpType = (
          allowedTypes as readonly string[]
        ).includes(otpType)
          ? (otpType as OtpType)
          : "signup";

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: verifiedType,
        });

        if (!cancelled) {
          if (error) {
            setStatus("error");
            setMessage(
              t("auth.callback.linkInvalidResend"),
            );
          } else if (verifiedType === "recovery") {
            // The PASSWORD_RECOVERY listener above usually
            // beats us here; this covers the case where the
            // event was already consumed before we mounted.
            router.replace(
              `${Routes.FORGOT_PASSWORD}?verified=1`,
            );
          } else {
            setStatus("success");
            setMessage(
              t("auth.callback.confirmed"),
            );
          }
        }
        return;
      }

      // Legacy implicit-flow links carry tokens in the URL
      // fragment instead of a ?code= param. Set the session
      // directly so in-flight Google links keep working.
      const hashParams = parseHashParams();

      if (
        hashParams.access_token &&
        hashParams.refresh_token
      ) {
        const { error } = await supabase.auth.setSession({
          access_token: hashParams.access_token,
          refresh_token: hashParams.refresh_token,
        });

        if (!cancelled) {
          if (error) {
            setStatus("error");
            setMessage(
              t("auth.callback.googleIncomplete"),
            );
          } else {
            // Same session contract as the PKCE path; the
            // auth layout routes to the dashboard on its own.
            setIsOAuth(true);
            setStatus("success");
            setMessage(
              t("auth.callback.signedInGoogle"),
            );
          }
        }
        return;
      }

      // Bare mount with a live session: the OAuth code was
      // already exchanged elsewhere (e.g. the login screen's
      // native auth-session handler won the race with this
      // deep link). Report success instead of a scary
      // missing-code error.
      try {
        const {
          data: { session: existing },
        } = await supabase.auth.getSession();

        if (!cancelled && existing) {
          setStatus("success");
          setMessage(
            t("auth.callback.signedIn"),
          );

          return;
        }
      } catch {
        // Session probe is best-effort only; fall through
        // to the missing-code message below.
      }

      if (!cancelled) {
        setStatus("error");
        setIsMissingCode(true);
        setMessage(
          t("auth.callback.linkMissing"),
        );
      }
    };

    void confirm();

    return () => {
      cancelled = true;
    };
  }, [t, code, tokenHash, otpType, linkError, linkErrorDescription]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <AuthLogo />

        <AuthHeader
          title={isOAuth ? t("auth.callback.oauthTitle") : t("auth.callback.title")}
          subtitle={
            isOAuth
              ? t("auth.callback.oauthSubtitle")
              : t("auth.callback.subtitle")
          }
        />

        {status !== "error" && (
          <ActivityIndicator
            size="large"
            color={colors.accentContent}
          />
        )}

        {status === "error" && (
          <View style={styles.form}>
            <AuthWarning message={message} />

            <AppButton
              title={t("auth.callback.backToSignIn")}
              onPress={() => router.replace(Routes.LOGIN)}
            />

            {isMissingCode && (
              <AppButton
                title={t("auth.callback.goToResetPassword")}
                onPress={() =>
                  router.replace(Routes.FORGOT_PASSWORD)
                }
              />
            )}
          </View>
        )}

        <AuthFooter
          prompt={t("auth.callback.footerPrompt")}
          actionLabel={t("auth.callback.footerAction")}
          onAction={() => router.replace(Routes.REGISTER)}
        />

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
