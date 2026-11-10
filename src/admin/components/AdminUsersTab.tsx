import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import AppText from "@/components/ui/AppText";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  ADMIN_HOUSEHOLDS,
} from "@/admin/mockData";

export default function AdminUsersTab() {
  const colors = useAppColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [selectedAlias, setSelectedAlias] = useState<string | null>(
    null,
  );

  const selectedHousehold = ADMIN_HOUSEHOLDS.find(
    (household) => household.alias === selectedAlias,
  );

  if (selectedHousehold) {
    return (
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <Pressable
            onPress={() => setSelectedAlias(null)}
            accessibilityRole="button"
            accessibilityLabel="Back to users"
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.onPrimary}
            />

            <AppText variant="body" style={styles.backText}>
              Back
            </AppText>
          </Pressable>

          <AppText variant="title" style={styles.headerTitle}>
            {selectedHousehold.alias}
          </AppText>

          <AppText variant="caption" style={styles.headerSub}>
            Pseudonymous household summary
          </AppText>
        </View>

        <View style={styles.detailCard}>
          <DetailRow
            label="Battery health"
            value={selectedHousehold.batteryHealth + "% (band " + selectedHousehold.band + ")"}
            colors={colors}
          />

          <DetailRow
            label="Solar / day"
            value={`${selectedHousehold.solarKwhPerDay.toFixed(1)} kWh`}
            colors={colors}
          />

          <DetailRow
            label="Load / day"
            value={`${selectedHousehold.loadKwhPerDay.toFixed(1)} kWh`}
            colors={colors}
          />

          <DetailRow
            label="Last seen"
            value={selectedHousehold.lastSeen}
            colors={colors}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <AppText variant="title" style={styles.headerTitle}>
          Users
        </AppText>

        <AppText variant="caption" style={styles.headerSub}>
          {ADMIN_HOUSEHOLDS.length} households, pseudonymous aliases only.
        </AppText>
      </View>

      <View style={styles.list}>
        {ADMIN_HOUSEHOLDS.map((household) => (
          <Pressable
            key={household.alias}
            onPress={() => setSelectedAlias(household.alias)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${household.alias}`}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rowIcon}>
              <Ionicons
                name="home-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.rowBody}>
              <AppText variant="body" style={styles.rowTitle}>
                {household.alias}
              </AppText>

              <AppText variant="caption" style={styles.rowMeta}>
                Battery {household.batteryHealth}% · Solar{" "}
                {household.solarKwhPerDay.toFixed(1)} kWh/day
              </AppText>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: AppColors;
}) {
  const styles = useMemo(() => getDetailStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>

      <AppText variant="body" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const getDetailStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      width: "100%",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 4,
    },

    label: {
      color: colors.textSecondary,
      fontWeight: "600",
    },

    value: {
      color: colors.text,
      fontWeight: "600",
    },
  });

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      width: "100%",
      gap: 18,
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

    backButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: colors.primary,
      marginBottom: 10,
    },

    backText: {
      color: colors.onPrimary,
      fontWeight: "700",
    },

    detailCard: {
      width: "100%",
      backgroundColor: colors.glass.white,
      borderWidth: 3,
      borderColor: colors.cardBorder,
      borderRadius: 15,
      paddingHorizontal: 18,
      paddingVertical: 6,
    },

    list: {
      width: "100%",
      gap: 10,
    },

    row: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.glass.white,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 14,
    },

    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryWash,
    },

    rowBody: {
      flex: 1,
      gap: 2,
    },

    rowTitle: {
      color: colors.text,
      fontWeight: "700",
    },

    rowMeta: {
      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.7,
    },
  });
