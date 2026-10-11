import { Ionicons } from "@expo/vector-icons";

import { router } from "expo-router";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";

import { Routes } from "@/constants/routes";
import { Bar, Touch } from "@/constants/sizing";

import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

import {
  subscribeResilientChannel,
  type ResilientSubscription,
} from "@/services/realtimeResubscribe";

import AppText from "@/components/ui/AppText";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTranslation } from "react-i18next";
import { resolveAvatarPhotoUrl } from "@/services/avatar";

import type { DeviceStatus } from "@/services/monitoringService";

// ============================================================
// NAVBAR PROPS
// ============================================================

interface NavBarProps {
  onNotificationPress?: () => void;
  deviceStatus?: DeviceStatus;
}

// ============================================================
// NAVBAR
// ============================================================

export default function NavBar({
  onNotificationPress,
  deviceStatus = "Offline",
}: NavBarProps) {
  const [
    hasUnreadNotifications,
    setHasUnreadNotifications,
  ] = useState(false);
  const { t } = useTranslation();

  // Signed-in username, served synchronously from the
  // AuthContext session cache — no per-mount fetch, so the
  // name never blinks on navigation. Falls back to the
  // session email prefix (identical to the auto-derived
  // username in almost all cases) so the slot is never
  // empty while signed in, even on first load.
  const { profileUsername, user: authUser } =
    useAuth();

  const fallbackName =
    authUser?.email?.split("@")[0] || null;

  const username = profileUsername || fallbackName;

  // Google photo URL from session metadata (email accounts
  // carry none) — resolved synchronously beside the name so
  // the avatar never blinks independently of it. Null feeds
  // the initial-letter fallback inside UserAvatar.
  const photoUrl = resolveAvatarPhotoUrl(authUser);

  // ==========================================================
  // CHECK FOR UNREAD NOTIFICATIONS
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const checkUnreadNotifications =
      async () => {
        const user = await getAuthenticatedUserSafe();

        if (!mounted) {
          return;
        }

        if (!user) {
          setHasUnreadNotifications(false);
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("notifications")
          .select("notif_id")
          .eq("user_id", user.id)
          .eq("read", false)
          .limit(1);

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "Error checking unread notifications:",
            error,
          );

          return;
        }

        setHasUnreadNotifications(
          (data?.length ?? 0) > 0,
        );
      };

    checkUnreadNotifications();

    // Live badge: any insert/update/delete on the user's
    // notifications re-runs the check, so the dot clears
    // right after mark-as-read and lights on new arrivals
    // without waiting for a remount.
    //
    // Stable channel per user (no Date.now) so StrictMode
    // remounts reuse instead of leaking duplicates on the
    // shared websocket (previously socket 1006 on login).
    // Drops recover on capped backoff via the shared helper —
    // no attempt cap, so the badge never strands dead.
    let channel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let navbarSubscription:
      | ResilientSubscription
      | null = null;

    const subscribeNavbar = (
      userId: string,
    ): void => {
      if (!mounted) {
        return;
      }

      if (navbarSubscription) {
        navbarSubscription.stop();
        navbarSubscription = null;
      }

      navbarSubscription = subscribeResilientChannel({
        topic: `navbar-notifications-${userId}`,
        label: "Navbar notifications",
        build: (base) =>
          base.on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            () => {
              if (mounted) {
                checkUnreadNotifications();
              }
            },
          ),
        isAlive: () => mounted,
        onChannel: (next) => {
          channel = next;
        },
      });
    };

    getAuthenticatedUserSafe()
      .then((user) => {
        if (!mounted || !user) {
          return;
        }

        subscribeNavbar(user.id);
      })
      .catch(() => {});

    return () => {
      mounted = false;

      if (navbarSubscription) {
        navbarSubscription.stop();
        navbarSubscription = null;
      }

      // Covers channels assigned after cleanup started:
      // remove by stable topic as well as by instance.
      const stale = channel;

      getAuthenticatedUserSafe()
        .then((user) => {
          if (stale) {
            supabase.removeChannel(stale).catch(() => {});
          }

          if (user) {
            const leaked = supabase
              .getChannels()
              .find(
                (c) =>
                  (c as unknown as { topic?: string })
                    .topic ===
                  `realtime:navbar-notifications-${user.id}`,
              );

            if (leaked && leaked !== stale) {
              supabase
                .removeChannel(
                  leaked as unknown as NonNullable<
                    typeof channel
                  >,
                )
                .catch(() => {});
            }
          }
        })
        .catch(() => {
          if (stale) {
            supabase.removeChannel(stale).catch(() => {});
          }
        });
    };
  }, []);

  // ==========================================================
  // HANDLE NOTIFICATION PRESS
  // ==========================================================

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
      return;
    }

    router.push(
      Routes.NOTIFICATIONS,
    );
  };

  // ==========================================================
  // DEVICE STATUS
  // ==========================================================

  const isOnline =
    deviceStatus === "Online";

  const colors = useAppColors();

  // Viewport width so the bar background spans edge to
  // edge like NavBarBottom, even though NavBar renders
  // inside ScreenContainer2's maxWidth 768 column.
  // Inner container is untouched.
  const { width: screenWidth } =
    useWindowDimensions();

  // Status-bar inset: bar itself stays 56 high, the
  // wrapper absorbs the device cutout above it (never a
  // fixed paddingTop — insets vary per device).
  const insets = useSafeAreaInsets();

  const navBarStyles = useMemo(
    () => getNavBarStyles(colors),
    [colors],
  );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <View
      style={[
        navBarStyles.wrapper,
        {
          width: screenWidth,
          alignSelf: "center",
          paddingTop: insets.top,
        },
      ]}
    >
      <View
        style={
          navBarStyles.container
        }
      >
        {/* ====================================================
            DEVICE STATUS
            ==================================================== */}

        <View
          style={
            navBarStyles.deviceStatus
          }
        >
          <View
            style={[
              navBarStyles.statusDot,
              isOnline
                ? navBarStyles.onlineDot
                : navBarStyles.offlineDot,
            ]}
          />

          <AppText
            variant="caption"
            style={
              navBarStyles.statusText
            }
          >
            {deviceStatus}
          </AppText>
        </View>

        {/* ====================================================
            RIGHT CLUSTER (username › profile › bell)
            ==================================================== */}

        <View
          style={
            navBarStyles.actions
          }
        >
          {username ? (
            <View
              style={navBarStyles.identityGroup}
              accessibilityLabel={t("shared.signedInAs", {
                username,
              })}
            >
              <AppText
                variant="body"
                style={navBarStyles.usernameText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {username}
              </AppText>

              <UserAvatar
                username={username}
                photoUrl={photoUrl}
                size={30}
              />
            </View>
          ) : null}

          {/* ==================================================
              NOTIFICATION
              ================================================== */}

          <Pressable
            onPress={
              handleNotificationPress
            }
            style={
              navBarStyles.iconButton
            }
            accessibilityRole="button"
            accessibilityLabel={t("shared.notifications")}
          >
            <Ionicons
              name="notifications-outline"
              size={
                navBarDimensions.notificationIconSize
              }
              color={colors.bar.text}
            />

            {hasUnreadNotifications && (
              <View
                style={
                  navBarStyles.notificationDot
                }
              />
            )}
          </Pressable>
        </View>
      </View>

      {/* ======================================================
          SECONDARY ACCENT LINE
          ====================================================== */}

      <View
        style={
          navBarStyles.accentLine
        }
      />
    </View>
  );
}

const navBarDimensions = {
  height: Bar.appBar,
  horizontalPadding: 16,
  iconButtonWidth: Touch.target,
  iconButtonHeight: Touch.target,
  notificationIconSize: Touch.icon,
  notificationDotSize: 8,
  accentHeight: 3,

  // Device status capsule: flexible width (min + padding)
  // so 320dp phones never overflow; text truncates inside.
  deviceStatusMinWidth: 64,
  deviceStatusMaxWidth: 96,
  deviceStatusHeight: 29,
  deviceStatusRadius: 20,
  statusDotSize: 9,
  statusDotMargin: 8,
};
const getNavBarStyles = (colors: AppColors) =>
  StyleSheet.create({
  wrapper: {
    width: "100%",
    zIndex: 100,
    elevation: 8,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.12)",
  },

  container: {
    height: navBarDimensions.height,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // ← changed
    paddingHorizontal:
      navBarDimensions.horizontalPadding,
    backgroundColor: colors.bar.background,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },

  // Identity cluster pinned right with the bell: username,
  // then avatar, then bell. The name truncates at maxWidth
  // instead of squeezing its neighbors.
  identityGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },

  usernameText: {
    color: colors.bar.text,
    fontSize: 14,
    fontWeight: "600",
    // 320dp-safe: truncates with ellipsis via flexShrink.
    maxWidth: 100,
    flexShrink: 1,
  },

  iconButton: {
    width: navBarDimensions.iconButtonWidth,
    height: navBarDimensions.iconButtonHeight,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: navBarDimensions.notificationDotSize,
    height: navBarDimensions.notificationDotSize,
    borderRadius:
      navBarDimensions.notificationDotSize / 2,
    backgroundColor: colors.error,
  },

  accentLine: {
    width: "100%",
    height: navBarDimensions.accentHeight,
    backgroundColor: colors.bar.accent,
  },

  // Device status capsule
  deviceStatus: {
    minWidth:
      navBarDimensions.deviceStatusMinWidth,
    maxWidth:
      navBarDimensions.deviceStatusMaxWidth,
    height: navBarDimensions.deviceStatusHeight,
    borderRadius: navBarDimensions.deviceStatusRadius,
    backgroundColor: colors.bar.capsule,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    flexShrink: 1,
  },

  statusDot: {
    width: navBarDimensions.statusDotSize,
    height: navBarDimensions.statusDotSize,
    borderRadius: navBarDimensions.statusDotSize / 2,
    marginRight: navBarDimensions.statusDotMargin,
  },

  onlineDot: {
    backgroundColor: colors.bar.online,
  },

  offlineDot: {
    backgroundColor: colors.error,
  },

  statusText: {
    // Theme text (not bar.text): light #1C1B1F on cream
    // capsule for legibility; dark stays #E3E3E3.
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
});