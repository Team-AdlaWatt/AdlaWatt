import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import React, {
  Component,
  type ReactNode,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import { Radius } from "@/constants/theme";
import {
  useAppColors,
} from "@/hooks/useAppColors";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

function RouteErrorFallback({
  onRetry,
}: {
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const colors = useAppColors();

  return (
    <View
      testID="route-error-boundary"
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.glass.white,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={44}
          color={colors.primary}
        />

        <AppText
          variant="heading"
          accessibilityRole="header"
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          {t("common.routeErrorTitle")}
        </AppText>

        <AppText
          variant="body"
          style={[
            styles.body,
            { color: colors.textSecondary },
          ]}
        >
          {t("common.routeErrorBody")}
        </AppText>

        <Pressable
          testID="route-error-retry"
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t(
            "common.routeErrorRetry",
          )}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText
            variant="caption"
            style={[
              styles.retryLabel,
              { color: colors.onPrimary },
            ]}
          >
            {t("common.routeErrorRetry")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <RouteErrorFallback
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    borderWidth: 2,
    borderRadius: Radius.lg,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    minWidth: 140,
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryLabel: {
    fontWeight: "700",
  },
});
