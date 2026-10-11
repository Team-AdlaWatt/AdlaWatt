import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import ComponentStatusBox from "@/components/forms/ComponentStatusBox";
import {
  applianceCardGrid,
} from "@/components/forms/applianceCard";
import Copyright from "@/components/ui/Copyright";

import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import { useScreenPadding } from "@/constants/sizing";

import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import { useTranslation } from "react-i18next";

import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { Radius } from "@/constants/theme";
import {
  SlidingToggle,
} from "@/components/ui/SlidingToggle";
import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import {
  subscribeResilientChannel,
  type ResilientSubscription,
} from "@/services/realtimeResubscribe";

// ============================================
// COMPONENT IMAGE MAPPING
// ============================================

const componentImages: Record<string, any> = {
  "Buck Converter": require(
    "@/assets/images/components/Buck Converter.png",
  ),

  "DS18B20 (Battery)": require(
    "@/assets/images/components/DS18B20.png",
  ),

  "DS18B20 (Solar)": require(
    "@/assets/images/components/DS18B20.png",
  ),

  ESP32: require(
    "@/assets/images/components/ESP32.png",
  ),

  "INA228 (Input)": require(
    "@/assets/images/components/INA228.png",
  ),

  "INA228 (Output)": require(
    "@/assets/images/components/INA228.png",
  ),

  "Relay Module 5V 1 Channel": require(
    "@/assets/images/components/Relay.png",
  ),

  "Voltage Sensor": require(
    "@/assets/images/components/Voltage Sensor.png",
  ),

  DHT22: require(
    "@/assets/images/components/DHT22.png",
  ),

  "5V DC Fan": require(
    "@/assets/images/components/DC Fan.png",
  ),

  "SPI TFT Display": require(
    "@/assets/images/components/SPI TFT Display.png",
  ),
};

// ============================================
// TYPES
// ============================================

type ComponentData = {
  component_id: string;
  component_name: string;
  status: boolean;
};

type DeviceStatus =
  | "Online"
  | "Offline"
  | "online"
  | "offline"
  | null;

// ============================================
// COMPONENT
// ============================================

export default function ComponentsScreen() {
  const { t } = useTranslation();
  const colors = useAppColors();

  // Responsive gutter: 16/20/24 by phone width (UI-STANDARDS.md).
  const screenPadding = useScreenPadding();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const [statusFilter, setStatusFilter] =
    useState<
      "Active" | "Inactive"
    >("Active");

  const [components, setComponents] =
    useState<ComponentData[]>([]);

  // ESP32 status from monitoring table
  const [deviceStatus, setDeviceStatus] =
    useState<DeviceStatus>(null);

  // ============================================
  // CONTENT-AWARE STATUS SEGMENTS
  //
  // Only segments holding components render; Active is
  // the default and Inactive the fallback. ESP32 follows
  // monitoring.device_status, other rows use their flag —
  // one shared rule feeds both the counts and the list.
  // ============================================

  const isComponentActive = useCallback(
    (component: ComponentData): boolean => {
      if (component.component_name === "ESP32") {
        return (
          String(deviceStatus).toLowerCase() ===
          "online"
        );
      }

      return component.status;
    },
    [deviceStatus],
  );

  const componentCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;

    for (const component of components) {
      if (isComponentActive(component)) {
        active += 1;
      } else {
        inactive += 1;
      }
    }

    return { active, inactive };
  }, [components, isComponentActive]);

  const visibleComponentFilters = useMemo<
    ("Active" | "Inactive")[]
  >(() => {
    if (components.length === 0) {
      return ["Active", "Inactive"];
    }

    const visible: ("Active" | "Inactive")[] = [];

    if (componentCounts.active > 0) {
      visible.push("Active");
    }

    if (componentCounts.inactive > 0) {
      visible.push("Inactive");
    }

    // Unreachable, but a zero-option toggle would break
    // the pill math.
    return visible.length > 0
      ? visible
      : (["Active", "Inactive"] as (
          | "Active"
          | "Inactive"
        )[]);
  }, [components.length, componentCounts]);

  const effectiveStatusFilter =
    visibleComponentFilters.includes(statusFilter)
      ? statusFilter
      : (visibleComponentFilters[0] ?? "Active");

  useEffect(() => {
    if (
      !visibleComponentFilters.includes(statusFilter)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- glide selection to next visible segment
      setStatusFilter(
        visibleComponentFilters[0] ?? "Active",
      );
    }
  }, [visibleComponentFilters, statusFilter]);

  // ============================================
  // LOAD COMPONENTS + ESP32 STATUS + REALTIME
  // ============================================

  useEffect(() => {
    let cancelled = false;

    let componentsChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let monitoringChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let componentsSubscription:
      | ResilientSubscription
      | null = null;

    let monitoringSubscription:
      | ResilientSubscription
      | null = null;

    // ==========================================
    // LOAD COMPONENTS
    // ==========================================

    const loadComponents = async (
      userId: string,
    ) => {
      const { data, error } =
        await supabase
          .from("components")
          .select(
            "component_id, component_name, status",
          )
          .eq("user_id", userId)
          .order("component_name", {
            ascending: true,
          });

      if (cancelled) return;

      if (error) {
        console.error(
          "Error loading components:",
          error.message,
        );
        return;
      }

      setComponents(data ?? []);
    };

    // ==========================================
    // LOAD ESP32 DEVICE STATUS
    // ==========================================

    const loadDeviceStatus = async (
      userId: string,
    ) => {
      const { data, error } =
        await supabase
          .from("monitoring")
          .select("device_status")
          .eq("user_id", userId)
          .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error(
          "Error loading device status:",
          error.message,
        );

        setDeviceStatus(null);
        return;
      }

      setDeviceStatus(
        data?.device_status ?? null,
      );
    };

    // ==========================================
    // SETUP
    // ==========================================

    const setup = async () => {
      const user = await getAuthenticatedUserSafe();

      if (cancelled) return;

      if (!user) {
        setComponents([]);
        setDeviceStatus(null);
        return;
      }

      // ========================================
      // LOAD INITIAL DATA
      // ========================================

      await Promise.all([
        loadComponents(user.id),
        loadDeviceStatus(user.id),
      ]);

      if (cancelled) return;

      // ========================================
      // COMPONENTS REALTIME (shared resilient recovery:
      // capped backoff, no attempt cap, warn-once logging)
      // ========================================

      componentsSubscription = subscribeResilientChannel({
        topic: `components-${user.id}`,
        label: `components-${user.id}`,
        build: (ch) =>
          ch.on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "components",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              if (!cancelled) {
                loadComponents(user.id);
              }
            },
          ),
        isAlive: () => !cancelled,
        onChannel: (next) => {
          componentsChannel = next;
        },
      });

      // ========================================
      // MONITORING REALTIME (same shared recovery)
      // ========================================

      monitoringSubscription = subscribeResilientChannel({
        topic: `monitoring-${user.id}`,
        label: `monitoring-${user.id}`,
        build: (ch) =>
          ch.on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "monitoring",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              if (cancelled) return;

              const updatedStatus =
                payload.new.device_status;

              setDeviceStatus(
                updatedStatus as DeviceStatus,
              );
            },
          ),
        isAlive: () => !cancelled,
        onChannel: (next) => {
          monitoringChannel = next;
        },
      });
    };

    setup();

    // ==========================================
    // CLEANUP
    // ==========================================

    return () => {
      cancelled = true;

      if (componentsSubscription) {
        componentsSubscription.stop();
        componentsSubscription = null;
      }

      if (monitoringSubscription) {
        monitoringSubscription.stop();
        monitoringSubscription = null;
      }

      if (componentsChannel) {
        supabase.removeChannel(
          componentsChannel,
        );
      }

      if (monitoringChannel) {
        supabase.removeChannel(
          monitoringChannel,
        );
      }
    };
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <ScreenContainer2>
      <NavBar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
      >
        {/* Header */}

        <View style={styles.card}>
          <AppText
            variant="heading"
            style={styles.title}
          >
            {t("dashboard.components.title")}
          </AppText>

          <AppText
            variant="caption"
            style={styles.subtitle}
          >
            {t("dashboard.components.subtitle")}
          </AppText>
        </View>

        {/* STATUS FILTER (only segments with content) */}

        <SlidingToggle
          value={effectiveStatusFilter}
          onChange={setStatusFilter}
          style={styles.statusToggleColors}
          options={[
            ...(visibleComponentFilters.includes(
              "Active",
            )
              ? [
                  {
                    value: "Active" as const,
                    label: "Active",
                    activeColor: colors.primary,
                    accessibilityLabel:
                      "Show active components",
                  },
                ]
              : []),
            ...(visibleComponentFilters.includes(
              "Inactive",
            )
              ? [
                  {
                    value: "Inactive" as const,
                    label: "Inactive",
                    activeColor: colors.error,
                    accessibilityLabel:
                      "Show inactive components",
                  },
                ]
              : []),
          ]}
        />

        {/* COMPONENT GRID */}

        <View
          style={[applianceCardGrid, { marginTop: 20 }]}
        >
          {(() => {
            const filteredComponents =
              [...components]
                .sort((a, b) =>
                  a.component_name.localeCompare(
                    b.component_name,
                  ),
                )
                .filter((component) => {
                  const isActive =
                    isComponentActive(component);

                  return effectiveStatusFilter ===
                    "Active"
                    ? isActive
                    : !isActive;
                });

            // ========================================
            // EMPTY STATE
            // ========================================

            if (
              filteredComponents.length === 0
            ) {
              return (
                <EmptyState
                  title={
                    effectiveStatusFilter === "Active"
                      ? "No Active Components"
                      : "No Inactive Components"
                  }
                  description={
                    effectiveStatusFilter === "Active"
                      ? "No components are currently active."
                      : "No components are currently inactive."
                  }
                  icon="hardware-chip-outline"
                />
              );
            }

            // ========================================
            // COMPONENT CARDS
            // ========================================

            return filteredComponents.map(
              (component) => {
                const isESP32 =
                  component.component_name ===
                  "ESP32";

                // ESP32 connection status
                // comes from monitoring table.
                const isConnected =
                  String(
                    deviceStatus,
                  ).toLowerCase() ===
                  "online";

                const status = isESP32
                  ? isConnected
                    ? "Connected"
                    : "Not Connected"
                  : component.status
                    ? "Active"
                    : "Inactive";

                return (
                  <ComponentStatusBox
                    key={
                      component.component_id
                    }
                    name={
                      component.component_name
                    }
                    status={status}
                    imageSource={
                      componentImages[
                        component.component_name
                      ]
                    }
                  />
                );
              },
            );
          })()}
        </View>

        <Copyright />
      </ScrollView>
    </ScreenContainer2>
  );
}

// ============================================
// STYLES
// ============================================


const getStyles = (colors: AppColors) => StyleSheet.create({

  scrollView: {

    flex: 1,

    backgroundColor:
      colors.background,

  },

  content: {

    padding: 16,

  },

  card: {

    backgroundColor:
      colors.glass.white,

    borderWidth: 3,

    borderColor:
      colors.cardBorder,

    borderRadius: 16,

    padding: 18,

  },

  title: {

    color: colors.text,

    fontWeight: "700",

  },

  subtitle: {

    color:
      colors.textSecondary,

    marginTop: 6,

  },

  statusToggleColors: {

    width: "100%",

    maxWidth: 360,

    alignSelf: "center",

    backgroundColor:
      colors.glass.white,

    borderColor:
      colors.border,

    borderRadius: Radius.md,

    marginTop: 18,

  },

  pressed: {

    opacity: 0.7,

  },

});