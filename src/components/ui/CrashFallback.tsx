import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";

// ============================================================
// CRASH FALLBACK (pre-provider)
//
// Rendered by the root error boundary, outside ThemeProvider /
// SettingsProvider / AuthProvider, so it uses the fixed cream
// palette and raw RN primitives on purpose. "Try again" resets
// the boundary and remounts the tree; "Restart app" reloads
// through expo-updates as a last resort. Never leave a crash
// screen without an exit: a dead end during a demo is worse
// than a reload.
// ============================================================

interface CrashFallbackProps {
  onRetry?: () => void;
}

async function reloadApp(): Promise<void> {
  try {
    const Updates = await import("expo-updates");
    await Updates.reloadAsync();
  } catch {
    // Web / dev clients without expo-updates: the Try again
    // action above is still available.
  }
}

export default function CrashFallback({
  onRetry,
}: CrashFallbackProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
    >
      <Ionicons
        name="alert-circle-outline"
        size={56}
        color={Colors.light.textSecondary}
      />

      <Text style={styles.title}>
        Something went wrong
      </Text>

      <Text style={styles.message}>
        The error was reported. Try again, or
        restart the app if this screen stays up.
      </Text>

      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryLabel}>
            Try again
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restart app"
        onPress={() => {
          void reloadApp();
        }}
        style={({ pressed }) => [
          styles.button,
          styles.secondaryButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.secondaryLabel}>
          Restart app
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
    backgroundColor: Colors.light.background,
  },

  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.onBackground,
    textAlign: "center",
  },

  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },

  button: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  primaryButton: {
    marginTop: 24,
    backgroundColor: Colors.light.primary,
  },

  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  primaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.onPrimary,
  },

  secondaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.primaryText,
  },
});
