import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import { Colors } from "@/constants/colors";

// Frozen severity scale (shared by reference across themes
// in colors.ts), so callouts need no theme branching.
const MANUAL_SEVERITY =
  Colors.light.severity;

/* ============================================================
   MANUAL CALLOUT
   TIP / NOTE / WARNING boxes for the User Manual screen.

   Colors come from the frozen severity scale in colors.ts
   (identical in both themes by design), so callouts stay
   readable in dark mode without branching:
     tip     -> nominal  (green tint)
     note    -> elevated (sand tint)
     warning -> critical (red tint)
   Meaning never depends on color alone: icon + label carry
   it in every theme.
   ============================================================ */

export type ManualCalloutKind =
  | "tip"
  | "note"
  | "warning";

interface ManualCalloutProps {
  kind: ManualCalloutKind;
  children: React.ReactNode;
}

const KIND_CONFIG: Record<
  ManualCalloutKind,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  tip: {
    label: "TIP",
    icon: "information-circle",
  },
  note: {
    label: "NOTE",
    icon: "alert-circle",
  },
  warning: {
    label: "WARNING",
    icon: "warning",
  },
};

export default function ManualCallout({
  kind,
  children,
}: ManualCalloutProps) {
  const styles = useMemo(
    () => getStyles(),
    [],
  );

  const config = KIND_CONFIG[kind];

  const severity =
    kind === "tip"
      ? MANUAL_SEVERITY.nominal
      : kind === "note"
        ? MANUAL_SEVERITY.elevated
        : MANUAL_SEVERITY.critical;

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor:
            severity.bg,
          borderColor:
            severity.border,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${config.label}: ${
        typeof children === "string"
          ? children
          : config.label
      }`}
    >
      <Ionicons
        name={config.icon}
        size={18}
        color={severity.text}
        style={styles.icon}
      />

      <View style={styles.content}>
        <AppText
          variant="caption"
          style={[
            styles.label,
            { color: severity.text },
          ]}
        >
          {config.label}
        </AppText>

        {typeof children ===
        "string" ? (
          <AppText
            variant="caption"
            style={[
              styles.text,
              { color: severity.text },
            ]}
          >
            {children}
          </AppText>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const getStyles = () =>
  StyleSheet.create({
    box: {
      width: "100%",
      flexDirection: "row",
      alignItems: "flex-start",
      borderWidth: 2,
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
    },

    icon: {
      marginRight: 8,
      marginTop: 1,
    },

    content: {
      flex: 1,
    },

    label: {
      fontSize: 12,
      fontWeight: "700",
    },

    text: {
      fontSize: 13,
      marginTop: 2,
      lineHeight: 19,
    },
  });
