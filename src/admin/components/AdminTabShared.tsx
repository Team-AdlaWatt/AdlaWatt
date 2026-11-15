import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import type { AdminFleetHealth } from "@/services/adminService";

// ============================================================
// ADMIN TAB SHARED PIECES
//
// The three dashboard tabs (Overview, Users, Reports) render
// the same state ladder — loading spinner, error card with
// retry, tab header — over one shared fleet fetch. These
// pieces keep that ladder identical across tabs instead of
// copy-pasting it per tab. Admin-local on purpose: the shared
// ui/ErrorState translates its labels via i18n, and admin is
// pinned English-only.
// ============================================================

export interface AdminTabDataProps {
  fleet: AdminFleetHealth | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function AdminTabLoading() {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <View style={styles.center}>
      <ActivityIndicator
        size="large"
        color={colors.primary}
      />
    </View>
  );
}

interface AdminTabErrorProps {
  message: string;
  onRetry: () => void;
}

export function AdminTabError({
  message,
  onRetry,
}: AdminTabErrorProps) {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <View style={styles.center}>
      <AppText variant="body" style={styles.errorText}>
        {message}
      </AppText>

      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          pressed && styles.pressed,
        ]}
      >
        <AppText variant="body" style={styles.retryText}>
          Retry
        </AppText>
      </Pressable>
    </View>
  );
}

interface AdminTabHeaderProps {
  title: string;
  subtitle: string;
}

export function AdminTabHeader({
  title,
  subtitle,
}: AdminTabHeaderProps) {
  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  return (
    <View style={styles.headerCard}>
      <AppText variant="title" style={styles.headerTitle}>
        {title}
      </AppText>

      <AppText variant="caption" style={styles.headerSub}>
        {subtitle}
      </AppText>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    center: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 12,
    },

    errorText: {
      color: colors.textSecondary,
      textAlign: "center",
    },

    retryButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },

    retryText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    pressed: {
      opacity: 0.7,
    },

    headerCard: {
      width: "100%",
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      padding: 18,
      gap: 6,
    },

    headerTitle: {
      color: colors.text,
      fontWeight: "700",
    },

    headerSub: {
      color: colors.textSecondary,
    },
  });
