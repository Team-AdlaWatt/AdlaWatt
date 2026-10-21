import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import {
  getAuthenticatedUserSafe,
  isAuthSessionMissingError,
  supabase,
} from "@/lib/supabase";
import {
  logActivity,
  logAuth,
  logProfile,
} from "@/services/activityLogService";
import { Routes } from "@/constants/routes";
import i18n from "@/services/i18n";

// ============================================================
// SHARED AUTH HELPERS
// ============================================================
//
// Single source of truth for auth validation + error mapping
// so client screens mirror these rules for instant UX while
// the service remains safe to call directly.
//
// Security notes:
// - Signup/login failures that could reveal account existence
//   ("already registered", username lookup misses) map to
//   generic messages. Username login inherently allows
//   probing via the lookup RPC; errors and timing are kept
//   uniform to minimize the oracle.
// - Resends are throttled per email (service-side) so rapid
//   taps or direct service calls cannot flood inboxes or burn
//   Supabase rate limits.
// ============================================================

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESEND_COOLDOWN_MS = 60 * 1000;

const resendTimestamps = new Map<string, number>();

const isRateLimitMessage = (message: string): boolean => {
    const lower = message.toLowerCase();

    return (
        lower.includes("rate") ||
        lower.includes("too many") ||
        lower.includes("security") ||
        lower.includes("exceeded") ||
        lower.includes("throttle")
    );
};

const isNetworkMessage = (message: string): boolean => {
    const lower = message.toLowerCase();

    return (
        lower.includes("fetch") ||
        lower.includes("network") ||
        lower.includes("offline") ||
        lower.includes("timeout") ||
        lower.includes("unreachable")
    );
};

const isAlreadyRegisteredMessage = (message: string): boolean => {
    const lower = message.toLowerCase();

    return (
        lower.includes("already") ||
        lower.includes("registered") ||
        lower.includes("exists") ||
        lower.includes("taken") ||
        lower.includes("duplicate")
    );
};

// ============================================================
// ROLES + POST-LOGIN ROUTING
// ============================================================
//
// Hidden admin dashboard: users.role 'admin' lands on
// Routes.ADMIN, everyone else on Routes.DASHBOARD. Unknown
// roles fall back to household (never fail open to admin).
// ============================================================

export type UserRole = "household" | "admin";

export function resolvePostLoginRoute(
    role: unknown,
): string {
    return role === "admin"
        ? Routes.ADMIN
        : Routes.DASHBOARD;
}

// Onboarding-aware sibling of resolvePostLoginRoute.
// Admin never onboards; household lands on /onboarding
// until users.onboarding_completed reads true. The flag is
// typed boolean | undefined by the profile union, so only an
// explicit true skips the panel (call sites pass true when
// the profile read itself failed — never strand on error).
export function resolveOnboardingAwareRoute(
    role: unknown,
    onboardingCompleted: boolean | undefined,
): string {
    if (role === "admin") {
        return Routes.ADMIN;
    }

    return onboardingCompleted === true
        ? Routes.DASHBOARD
        : Routes.ONBOARDING;
}

// ============================================================
// AUTH REDIRECT
// ============================================================
//
// Every email / OAuth link must return the user to a
// reachable target. Native uses the app's custom scheme
// (adlawatt://auth/...) so the OS hands the link off to the
// app — no http(s)://localhost dependency that is unreachable
// on a phone. Web uses the current origin.
//
// The returned value is passed as emailRedirectTo / redirectTo
// and MUST be allowlisted in Supabase Auth > URL Configuration
// > Redirect URLs (adlawatt://auth/callback,
// adlawatt://auth/forgot-password, and the web origin).
// ============================================================

export const getAuthRedirect = (
    path: string,
): string | undefined => {
    if (Platform.OS === "web") {
        if (
            typeof window !== "undefined" &&
            window.location?.origin
        ) {
            return `${window.location.origin}${path}`;
        }

        return undefined;
    }

    return `adlawatt://${path.replace(/^\/+/, "")}`;
};

export async function resendConfirmation(email: string) {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
        return {
            success: false,
            error: i18n.t("validation.emailRequired"),
        };
    }

    const now = Date.now();
    const lastSent = resendTimestamps.get(cleanEmail) ?? 0;

    if (now - lastSent < RESEND_COOLDOWN_MS) {
        return {
            success: false,
            throttled: true,
            error: i18n.t("common.confirmationThrottled"),
        };
    }

    resendTimestamps.set(cleanEmail, now);

    const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
            // Return to the app, not the Supabase Site URL
            // (localhost by default) — see getAuthRedirect.
            emailRedirectTo: getAuthRedirect(
                Routes.AUTH_CALLBACK,
            ),
        },
    });

    if (error) {
        return {
            success: false,
            throttled: isRateLimitMessage(error.message),
            error: error.message,
        };
    }

    return { success: true, throttled: false };
}

// Separate throttle bucket so recovery requests never eat
// into the signup-confirmation resend budget (and vice
// versa). Same 60s window, same service-side spirit.
const recoveryTimestamps = new Map<string, number>();

// ============================================================
// PASSWORD RECOVERY (Supabase built-in email flow)
// ============================================================
//
// Step 1: requestPasswordReset() sends the recovery link to
// the account email. Step 2 happens inside
// /auth/forgot-password itself, which exchanges the link's
// PKCE code (or verifies its token_hash) and reveals the
// verified card: Continue to Account or set a new password.
// Step 3: updateRecoveryPassword() sets the new password on
// the recovery session.
//
// Recovery links never pass through /auth/callback: that
// screen is reserved for signup confirmation and OAuth.
// Old callback-addressed recovery links still resolve via
// the callback's fallback, which routes here.
//
// Anti-enumeration: send failures that could reveal whether
// an address is registered map to one generic message, and
// the screen shows the same "check your inbox" card either
// way (mirrors the signup/resend contract above).
// ============================================================

// Recovery links land directly on the reset screen so the
// email-confirmation step stays embedded there. Must be
// allowlisted in Supabase Auth > URL Configuration >
// Redirect URLs (adlawatt://auth/forgot-password and the web
// origin). The target itself comes from getAuthRedirect.

export async function requestPasswordReset(email: string) {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
        return {
            success: false,
            error: i18n.t("validation.emailRequired"),
        };
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
        return {
            success: false,
            error: i18n.t("validation.emailInvalid"),
        };
    }

    const now = Date.now();
    const lastSent = recoveryTimestamps.get(cleanEmail) ?? 0;

    if (now - lastSent < RESEND_COOLDOWN_MS) {
        return {
            success: false,
            throttled: true,
            error: i18n.t("auth.forgot.recoveryThrottled"),
        };
    }

    recoveryTimestamps.set(cleanEmail, now);

    const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
            redirectTo: getAuthRedirect(
                Routes.FORGOT_PASSWORD,
            ),
        },
    );

    if (error) {
        if (isRateLimitMessage(error.message)) {
            return {
                success: false,
                throttled: true,
                error: i18n.t("common.tooManyRequests"),
            };
        }

        if (isNetworkMessage(error.message)) {
            return {
                success: false,
                error: i18n.t("common.noConnection"),
            };
        }

        // Generic on purpose: never reveal whether the
        // address is registered (see contract above).
        return {
            success: false,
            error: i18n.t("auth.forgot.recoveryFailed"),
        };
    }

    return { success: true, throttled: false };
}

export async function updateRecoveryPassword(password: string) {
    if (!password || password.trim().length < 8) {
        return {
            success: false,
            error: i18n.t("validation.passwordShort"),
        };
    }

    if (password.length > 72) {
        return {
            success: false,
            error: i18n.t("validation.passwordLong"),
        };
    }

    try {
        const { error } =
            await supabase.auth.updateUser({ password });

        if (error) {
            if (isAuthSessionMissingError(error)) {
                return {
                    success: false,
                    expired: true,
                    error: i18n.t("auth.forgot.recoveryExpired"),
                };
            }

            if (isRateLimitMessage(error.message)) {
                return {
                    success: false,
                    error: i18n.t("common.tooManyRequests"),
                };
            }

            return {
                success: false,
                error: i18n.t("auth.forgot.recoveryUpdateFailed"),
            };
        }

        // Fire-and-forget: a slow insert must never freeze
        // the password update (same rule as loginUser).
        logProfile.passwordChanged();

        return { success: true };
    } catch (error) {
        if (isAuthSessionMissingError(error)) {
            return {
                success: false,
                expired: true,
                error: i18n.t("auth.forgot.recoveryExpired"),
            };
        }

        console.error("Recovery password update error:", error);

        return {
            success: false,
            error: i18n.t("auth.forgot.recoveryUpdateFailed"),
        };
    }
}

export async function registerUser(
    username: string,
    email: string,
    password: string,
    termsAgreed: boolean,
) {
    try {
        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();

        // Username validation
        if (!cleanUsername) {
            return {
                success: false,
                error: i18n.t("validation.usernameRequired"),
            };
        }

        if (cleanUsername.length < 3) {
            return {
                success: false,
                error: i18n.t("validation.usernameShort"),
            };
        }

        if (cleanUsername.length > 30) {
            return {
                success: false,
                error: i18n.t("validation.usernameLong"),
            };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
            return {
                success: false,
                error:
                    i18n.t("validation.usernameChars"),
            };
        }

        if (!cleanEmail) {
            return {
                success: false,
                error: i18n.t("validation.emailRequired"),
            };
        }

        if (!EMAIL_PATTERN.test(cleanEmail)) {
            return {
                success: false,
                error: i18n.t("validation.emailInvalid"),
            };
        }

        // Password validation
        if (!password || password.trim().length < 8) {
            return {
                success: false,
                error: i18n.t("validation.passwordShort"),
            };
        }

        if (password.length > 72) {
            return {
                success: false,
                error: i18n.t("validation.passwordLong"),
            };
        }

        // Terms validation
        if (!termsAgreed) {
            return {
                success: false,
                error: i18n.t("validation.termsRequired"),
            };
        }

        /*
         * Create the authentication account.
         *
         * Username and terms_agreed are stored temporarily
         * in Supabase Auth metadata.
         *
         * The database trigger then creates the corresponding
         * public.users profile automatically.
         */
        const { data: authData, error: authError } =
            await supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                    data: {
                        username: cleanUsername,
                        terms_agreed: termsAgreed,
                    },
                    // Return to the app, not the Supabase Site URL
                    // (localhost by default) — see getAuthRedirect.
                    emailRedirectTo: getAuthRedirect(
                        Routes.AUTH_CALLBACK,
                    ),
                },
            });

        if (authError) {
            console.error("Registration error:", authError.message);

            // Never reveal whether the email is taken.
            if (isAlreadyRegisteredMessage(authError.message)) {
                return {
                    success: false,
                    error: i18n.t("auth.register.accountTaken"),
                };
            }

            if (isRateLimitMessage(authError.message)) {
                return {
                    success: false,
                    error: i18n.t("auth.register.tooManyAttempts"),
                };
            }

            return {
                success: false,
                error: authError.message,
            };
        }

        if (!authData.user) {
            return {
                success: false,
                error: i18n.t("auth.register.accountNotCreated"),
            };
        }

        logAuth.accountCreated(
            cleanUsername,
            authData.user.id,
        );

        // Confirm-email ON: no session until the user clicks
        // the email link. Confirm-off: session exists at once.
        if (!authData.session) {
            return {
                success: true,
                user: authData.user,
                needsConfirmation: true,
                email: cleanEmail,
            };
        }

        return {
            success: true,
            user: authData.user,
            needsConfirmation: false,
            email: cleanEmail,
        };

    } catch (error) {
        console.error("Registration error:", error);

        return {
            success: false,
            error: i18n.t("auth.register.accountFailedNow"),
        };
    }
}



export async function getCurrentUserProfile() {
    try {
        const user = await getAuthenticatedUserSafe();

        if (!user) {
            return {
                success: false,
                error: i18n.t("common.authRequired"),
            };
        }

        const { data: profile, error: profileError } =
            await supabase
                .from("users")
                .select(
                    "id, username, email, terms_agreed, created_at, email_notifications, role, onboarding_completed",
                )
                .eq("id", user.id)
                .single();

        if (profileError) {
            console.error(
                "Get user profile error:",
                profileError.message,
            );

            return {
                success: false,
                error: i18n.t("common.accountLoadFailed"),
            };
        }

        return {
            success: true,
            user,
            userId: profile?.id ?? user.id,
            username: profile?.username ?? "",
            email: profile?.email ?? user.email ?? "",
            termsAgreed: profile?.terms_agreed ?? false,
            createdAt: profile?.created_at ?? null,
            // Global alert-email preference; default ON for
            // legacy rows where the column reads null.
            emailNotifications:
                profile?.email_notifications ?? true,
            // Hidden admin dashboard gating. Unknown/missing
            // values fall back to household (never fail open
            // to admin). Phase 1: self-readable users.role.
            role: (
                profile as { role?: unknown } | null
            )?.role === "admin"
                ? ("admin" as const)
                : ("household" as const),
            // First-run onboarding gate. New signups start
            // false (DB default); legacy rows are backfilled
            // to true by migration so they never re-see the
            // panel. Only an explicit true skips onboarding.
            onboardingCompleted:
                profile?.onboarding_completed === true,
        };
    } catch (error) {
        if (isAuthSessionMissingError(error)) {
            return {
                success: false,
                error: i18n.t("common.authRequired"),
            };
        }

        console.error(
            "Get current user profile error:",
            error,
        );

        return {
            success: false,
            error:
                i18n.t("common.accountLoadFailed"),
        };
    }
}

// Flips users.onboarding_completed for the signed-in user.
// Failures return false but never block navigation — the
// panel skips itself on the next cold start either way.
export async function completeOnboarding(): Promise<boolean> {
    try {
        const user = await getAuthenticatedUserSafe();

        if (!user) {
            return false;
        }

        const { error } = await supabase
            .from("users")
            .update({ onboarding_completed: true })
            .eq("id", user.id);

        if (error) {
            console.error(
                "Complete onboarding error:",
                error.message,
            );

            return false;
        }

        logActivity({
            title: "Onboarding Completed",
            description:
                "The first-run onboarding panel was finished.",
            type: "info",
        });

        return true;
    } catch (error) {
        console.error(
            "Complete onboarding error:",
            error,
        );

        return false;
    }
}

export async function loginUser(
    usernameOrEmail: string,
    password: string,
) {
    try {
        const identifier = usernameOrEmail.trim().toLowerCase();

        if (!identifier || !password) {
            return {
                success: false,
                error:
                    i18n.t("validation.identifierRequired"),
            };
        }

        let email = identifier;

        // Username login. Both miss and lookup-failure paths
        // return the identical message so the RPC cannot be
        // used to probe which usernames exist.
        if (!identifier.includes("@")) {
            const { data: profileEmail, error: profileError } =
                await supabase.rpc(
                    "get_email_by_username",
                    {
                        lookup_username: identifier,
                    },
                );

            if (profileError) {
                console.error(
                    "Username lookup error:",
                    profileError.message,
                );

                return {
                    success: false,
                    kind: "invalid" as const,
                    error: i18n.t("auth.login.invalidCredentials"),
                };
            }

            if (!profileEmail) {
                return {
                    success: false,
                    kind: "invalid" as const,
                    error: i18n.t("auth.login.invalidCredentials"),
                };
            }

            email = profileEmail.trim().toLowerCase();
        }

        // Supabase authentication
        const { data, error } =
            await supabase.auth.signInWithPassword({
                email,
                password,
            });

        if (error) {
            console.error("Login error:", error.message);

            if (
                error.message
                    .toLowerCase()
                    .includes("email not confirmed")
            ) {
                // Auto-send a fresh confirmation link so the
                // user does not have to tap Resend manually.
                // resendConfirmation enforces the per-email
                // cooldown; failures never override the
                // unconfirmed outcome.
                let confirmationResent:
                    | "sent"
                    | "rate-limited"
                    | "failed" = "failed";

                try {
                    const resendResult =
                        await resendConfirmation(email);

                    if (resendResult.success) {
                        confirmationResent = "sent";
                    } else if (resendResult.throttled) {
                        confirmationResent = "rate-limited";
                    } else {
                        confirmationResent = "failed";
                    }
                } catch {
                    confirmationResent = "failed";
                }

                return {
                    success: false,
                    kind: "unconfirmed" as const,
                    emailNotConfirmed: true,
                    email,
                    confirmationResent,
                    error: i18n.t("auth.login.emailNotConfirmed"),
                };
            }

            if (isRateLimitMessage(error.message)) {
                return {
                    success: false,
                    kind: "rate-limited" as const,
                    error: i18n.t("auth.login.tooManyAttempts"),
                };
            }

            if (isNetworkMessage(error.message)) {
                return {
                    success: false,
                    kind: "network" as const,
                    error: i18n.t("common.noConnection"),
                };
            }

            return {
                success: false,
                kind: "invalid" as const,
                error: i18n.t("auth.login.invalidCredentials"),
            };
        }

        if (!data.user || !data.session) {
            return {
                success: false,
                kind: "invalid" as const,
                error: i18n.t("auth.login.sessionFailed"),
            };
        }

        // Credential-safe: row is already scoped by user_id;
        // never write emails/usernames into the description.
        logAuth.loggedIn();

        return {
            success: true,
            user: data.user,
            session: data.session,
        };
    } catch (error) {
        console.error("Login error:", error);

        return {
            success: false,
            kind: "unknown" as const,
            error:
                i18n.t("auth.login.sessionFailedNow"),
        };
    }
}

// ============================================================
// GOOGLE OAUTH (Supabase provider)
// ============================================================
//
// Requires Supabase Dashboard > Authentication > Providers >
// Google enabled with the Google Cloud Web-client ID + secret,
// and the redirect allowlisted:
//   web:    <origin>/auth/callback
//   native: adlawatt://auth/callback (matches
//           getAuthRedirect + Routes.AUTH_CALLBACK)
//
// Profile rows for OAuth users are auto-created by the
// public.handle_new_auth_user_profile() trigger (username
// derived from the email prefix), so no client-side username
// step is needed here.
//
// Web takes a full redirect (page unloads); native opens an
// auth session and exchanges the returned PKCE code, which
// the /auth/callback screen also handles for cold-start
// deep links.
// ============================================================

const extractOAuthCode = (url: string): string => {
    const match = url.match(/[?&#]code=([^&#]+)/);

    if (!match?.[1]) {
        return "";
    }

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
};

const extractOAuthError = (url: string): string => {
    const match =
        url.match(/[?&#]error_description=([^&#]+)/) ??
        url.match(/[?&#]error=([^&#]+)/);

    if (!match?.[1]) {
        return "";
    }

    try {
        return decodeURIComponent(match[1].replace(/\+/g, " "));
    } catch {
        return match[1];
    }
};

export async function signInWithGoogle() {
    try {
        const redirectTo = getAuthRedirect(
            Routes.AUTH_CALLBACK,
        );

        const { data, error } =
            await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo,
                    // Handle navigation ourselves so web and
                    // native share one deterministic flow.
                    skipBrowserRedirect: true,
                    queryParams: {
                        access_type: "offline",
                        prompt: "consent",
                    },
                },
            });

        if (error) {
            console.error("Google OAuth error:", error.message);

            if (isRateLimitMessage(error.message)) {
                return {
                    success: false,
                    kind: "rate-limited" as const,
                    error: i18n.t("auth.login.tooManyAttempts"),
                };
            }

            if (isNetworkMessage(error.message)) {
                return {
                    success: false,
                    kind: "network" as const,
                    error: i18n.t("common.noConnection"),
                };
            }

            return {
                success: false,
                kind: "unknown" as const,
                error: i18n.t("auth.login.googleUnavailable"),
            };
        }

        if (!data?.url) {
            return {
                success: false,
                kind: "unknown" as const,
                error: i18n.t("auth.login.googleUnavailable"),
            };
        }

        // Web: full redirect to Google; Supabase returns to
        // /auth/callback where the PKCE code is exchanged.
        if (Platform.OS === "web") {
            if (typeof window !== "undefined") {
                window.location.assign(data.url);
            }

            return { success: true, redirected: true as const };
        }

        // Native (dev client): in-app auth session. The custom
        // adlawatt:// scheme requires a dev-client or device
        // build — it does not resolve inside Expo Go.
        const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectTo,
        );

        if (result.type !== "success") {
            return {
                success: false,
                cancelled: true as const,
                kind: "cancelled" as const,
            };
        }

        const providerError = extractOAuthError(result.url);

        if (providerError) {
            return {
                success: false,
                kind: "invalid" as const,
                error: i18n.t("auth.login.googleIncomplete"),
            };
        }

        const code = extractOAuthCode(result.url);

        if (!code) {
            return {
                success: false,
                kind: "invalid" as const,
                error: i18n.t("auth.login.googleIncomplete"),
            };
        }

        const { data: sessionData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error(
                "Google OAuth exchange error:",
                exchangeError.message,
            );

            return {
                success: false,
                kind: "invalid" as const,
                error: i18n.t("auth.login.googleIncomplete"),
            };
        }

        if (!sessionData.user || !sessionData.session) {
            return {
                success: false,
                kind: "invalid" as const,
                error: i18n.t("auth.login.sessionFailed"),
            };
        }

        // Same credential-safe contract as loginUser.
        logAuth.loggedIn();

        return {
            success: true,
            user: sessionData.user,
            session: sessionData.session,
        };
    } catch (error) {
        console.error("Google OAuth error:", error);

        return {
            success: false,
            kind: "unknown" as const,
            error: i18n.t("auth.login.googleFailed"),
        };
    }
}


export async function updateAccount(
    username: string,
    email: string,
    currentPassword: string,
    newPassword?: string,
) {
    try {
        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();
        const cleanCurrentPassword = currentPassword;

        // =========================
        // VALIDATE USERNAME
        // =========================

        if (!cleanUsername) {
            return {
                success: false,
                error: "Please enter a username.",
            };
        }

        if (cleanUsername.length < 3) {
            return {
                success: false,
                error: "Username must be at least 3 characters.",
            };
        }

        if (cleanUsername.length > 30) {
            return {
                success: false,
                error: "Username must not exceed 30 characters.",
            };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
            return {
                success: false,
                error:
                    "Username can only contain letters, numbers, and underscores.",
            };
        }

        // =========================
        // VALIDATE EMAIL
        // =========================

        if (!cleanEmail) {
            return {
                success: false,
                error: "Please enter your email address.",
            };
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return {
                success: false,
                error: "Enter a valid email address.",
            };
        }

        // =========================
        // VALIDATE PASSWORD
        // =========================

        if (!cleanCurrentPassword) {
            return {
                success: false,
                error: "Please enter your current password.",
            };
        }

        if (newPassword && newPassword.length < 8) {
            return {
                success: false,
                error: "Password must be at least 8 characters.",
            };
        }

        if (newPassword && newPassword.length > 72) {
            return {
                success: false,
                error: "Password must not exceed 72 characters.",
            };
        }

        // =========================
        // GET CURRENT USER
        // =========================

        const user = await getAuthenticatedUserSafe();

        if (!user) {
            return {
                success: false,
                error: "No authenticated user found.",
            };
        }

        if (!user.email) {
            return {
                success: false,
                error: "Your account does not have an email address.",
            };
        }

        // =========================
        // VERIFY CURRENT PASSWORD
        // =========================

        const { error: verifyError } =
            await supabase.auth.signInWithPassword({
                email: user.email,
                password: cleanCurrentPassword,
            });

        if (verifyError) {
            logActivity({
                title: "Verification Failed",
                description:
                    "Incorrect current password during account update.",
                type: "warning",
            });

            return {
                success: false,
                error: "Incorrect current password.",
            };
        }

        // =========================
        // CHECK USERNAME AVAILABILITY
        // =========================

        const { data: existingUsername, error: usernameError } =
            await supabase
                .from("users")
                .select("id")
                .eq("username", cleanUsername)
                .neq("id", user.id)
                .maybeSingle();

        if (usernameError) {
            console.error(
                "Username availability error:",
                usernameError.message,
            );

            return {
                success: false,
                error: "Unable to verify username availability.",
            };
        }

        if (existingUsername) {
            return {
                success: false,
                error: "That username is already being used.",
            };
        }

        // =========================
        // CHECK EMAIL AVAILABILITY
        // =========================

        const { data: existingEmail, error: emailError } =
            await supabase
                .from("users")
                .select("id")
                .eq("email", cleanEmail)
                .neq("id", user.id)
                .maybeSingle();

        if (emailError) {
            console.error(
                "Email availability error:",
                emailError.message,
            );

            return {
                success: false,
                error: "Unable to verify email availability.",
            };
        }

        if (existingEmail) {
            return {
                success: false,
                error: "That email address is already registered.",
            };
        }

        // =========================
        // UPDATE SUPABASE AUTH
        // =========================

        const emailChanged =
            user.email?.trim().toLowerCase() !== cleanEmail;

        const passwordChanged =
            !!newPassword && newPassword.length > 0;

        if (emailChanged || passwordChanged) {
            const authUpdate: {
                email?: string;
                password?: string;
            } = {};

            if (emailChanged) {
                authUpdate.email = cleanEmail;
            }

            if (passwordChanged) {
                authUpdate.password = newPassword;
            }

            const { data: authData, error: authUpdateError } =
                await supabase.auth.updateUser(authUpdate);

            if (authUpdateError) {
                console.error(
                    "Supabase Auth update error:",
                    authUpdateError.message,
                );

                return {
                    success: false,
                    error: authUpdateError.message,
                };
            }

            // If Supabase requires email confirmation,
            // authData.user.email may still contain the old email.
            if (
                emailChanged &&
                authData.user?.email?.trim().toLowerCase() !==
                cleanEmail
            ) {
                // Username can still be updated.
                const { error: usernameUpdateError } =
                    await supabase
                        .from("users")
                        .update({
                            username: cleanUsername,
                        })
                        .eq("id", user.id);

                if (usernameUpdateError) {
                    return {
                        success: false,
                        error:
                            usernameUpdateError.message,
                    };
                }

                if (passwordChanged) {
                    logProfile.passwordChanged();
                }

                return {
                    success: true,
                    username: cleanUsername,
                    email: user.email,
                    emailChangePending: true,
                    message:
                        "Username updated. Please confirm your new email address before it becomes your login email.",
                };
            }
        }

        // =========================
        // UPDATE PUBLIC USERS TABLE
        // =========================

        const { error: profileUpdateError } =
            await supabase
                .from("users")
                .update({
                    username: cleanUsername,
                    email: cleanEmail,
                })
                .eq("id", user.id);

        if (profileUpdateError) {
            console.error(
                "Profile update error:",
                profileUpdateError.message,
            );

            return {
                success: false,
                error: profileUpdateError.message,
            };
        }

        if (passwordChanged) {
            logProfile.passwordChanged();
        }

        return {
            success: true,
            username: cleanUsername,
            email: cleanEmail,
            emailChangePending: false,
        };
    } catch (error) {
        console.error(
            "Update account error:",
            error,
        );

        return {
            success: false,
            error:
                "Unable to update your account. Please try again.",
        };
    }
}