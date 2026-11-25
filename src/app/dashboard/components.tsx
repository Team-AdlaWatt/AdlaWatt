import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from "react-native";

import ComponentStatusBox from "@/components/forms/ComponentStatusBox";
import {
  electronicsCardGrid,
} from "@/components/forms/electronicsCard";
import Copyright from "@/components/ui/Copyright";

import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import { useScreenPadding } from "@/constants/sizing";

import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import { useScrollToTopController } from "@/hooks/useScrollToTopController";
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
import { useMonitoringContext } from "@/context/MonitoringContext";
import {
  subscribeResilientChannel,
  type ResilientSubscription,
} from "@/services/realtimeResubscribe";

// ============================================
// COMPONENT IMAGE MAPPING
// ============================================

const componentImages: Record<string, any> = {
  "ESP32-S3": require(
    "@/assets/images/components/ESP32-S3.png",
  ),

  INA219: require(
    "@/assets/images/components/INA219.png",
  ),

  DS18B20: require(
    "@/assets/images/components/DS18B20.png",
  ),

  DHT22: require(
    "@/assets/images/components/DHT22.png",
  ),

  "Relay Module 5V 1 Channel": require(
    "@/assets/images/components/Relay.png",
  ),

  "5V DC Fan": require(
    "@/assets/images/components/DC Fan.png",
  ),

  "SPI TFT Display": require(
    "@/assets/images/components/SPI TFT Display.png",
  ),
};

const ESP32_NAMES = ["ESP32-S3"];

const isESP32Name = (name: string): boolean =>
  ESP32_NAMES.includes(name);

// ============================================
// TYPES
// ============================================

type ComponentData = {
  component_id: string;
  component_name: string;
  status: boolean;
};

const CANONICAL_COMPONENT_NAMES = new Set([
  "ESP32-S3",
  "INA219",
  "DS18B20",
  "DHT22",
  "Relay Module 5V 1 Channel",
  "5V DC Fan",
  "SPI TFT Display",
]);

const normalizeComponentName = (
  componentName: string,
): string => {
  const name =
    typeof componentName === "string"
      ? componentName.trim()
      : "";

  switch (name.toLowerCase()) {
    case "esp32":
    case "esp32-s3":
      return "ESP32-S3";
    case "voltage sensor":
    case "ina219":
      return "INA219";
    case "ds18b20":
    case "ds18b20 (battery)":
    case "ds18b20(battery)":
    case "ds18b20 (solar)":
    case "ds18b20(solar)":
    case "ds18b20 solar":
    case "ds18b20 2 solar":
    case "ds18b20 2 solar temp":
      return "DS18B20";
    default:
      return name;
  }
};

const normalizeComponents = (
  rows: ComponentData[],
): ComponentData[] => {
  const byName = new Map<string, ComponentData>();

  for (const row of rows) {
    const componentName = normalizeComponentName(
      row.component_name,
    );

    if (
      !CANONICAL_COMPONENT_NAMES.has(componentName)
    ) {
      continue;
    }

    const normalizedRow: ComponentData = {
      ...row,
      component_name: componentName,
      status: Boolean(row.status),
    };

    const existing = byName.get(componentName);

    if (
      !existing ||
      (!existing.status && normalizedRow.status)
    ) {
      byName.set(componentName, normalizedRow);
    }
  }

  return [...byName.values()];
};

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

  const scrollRef =
    useRef<ScrollViewInstance>(null);

  const scrollToTop =
    useScrollToTopController(scrollRef);

  const [statusFilter, setStatusFilter] =
    useState<
      "Active" | "Inactive"
    >("Active");

  const [components, setComponents] =
    useState<ComponentData[]>([]);

  // Unified live monitoring (single dashboard provider): updates
  // immediately when hardware becomes active / table changes.
  const { connectionStatus } = useMonitoringContext();

  // ============================================
  // CONTENT-AWARE STATUS SEGMENTS
  //
  // Only segments holding components render; Active is
  // the default and Inactive the fallback. ESP32 follows
  // monitoring.device_status, other rows use their flag.
  // One shared rule feeds both the counts and the list.
  // ============================================

  const displayComponents = useMemo(
    () =>
      [...components].sort((a, b) =>
        a.component_name.localeCompare(b.component_name),
      ),
    [components],
  );

  const isComponentActive = useCallback(
    (component: ComponentData): boolean => {
      if (isESP32Name(component.component_name)) {
        return connectionStatus === "online";
      }

      return component.status;
    },
    [connectionStatus],
  );

  const componentCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;

    for (const component of displayComponents) {
      if (isComponentActive(component)) {
        active += 1;
      } else {
        inactive += 1;
      }
    }

    return { active, inactive };
  }, [displayComponents, isComponentActive]);

  const visibleComponentFilters = useMemo<
    ("Active" | "Inactive")[]
  >(() => {
    if (displayComponents.length === 0) {
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
  }, [displayComponents.length, componentCounts]);

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

    let componentsSubscription:
      | ResilientSubscription
      | null = null;

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

      setComponents(
        normalizeComponents(
          (data ?? []) as ComponentData[],
        ),
      );
    };

    const setup = async () => {
      const user = await getAuthenticatedUserSafe();

      if (cancelled) return;

      if (!user) {
        setComponents([]);
        return;
      }

      await loadComponents(user.id);

      if (cancelled) return;

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
    };

    setup();

    return () => {
      cancelled = true;

      if (componentsSubscription) {
        componentsSubscription.stop();
        componentsSubscription = null;
      }

      if (componentsChannel) {
        supabase.removeChannel(
          componentsChannel,
        );
      }
    };
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <ScreenContainer2 scrollToTop={scrollToTop}>
      <NavBar />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
        onScroll={scrollToTop.reportScroll}
        scrollEventThrottle={16}
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
          style={[electronicsCardGrid, { marginTop: 20 }]}
        >
          {(() => {
            const filteredComponents =
              displayComponents.filter((component) => {
                const isActive =
                  isComponentActive(component);

                return effectiveStatusFilter === "Active"
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
                const isESP32 = isESP32Name(
                  component.component_name,
                );

                // ESP32 connection status
                // comes from monitoring table.
                const status = isESP32
                  ? connectionStatus === "online"
                    ? "Connected"
                    : connectionStatus === "offline"
                      ? "Not Connected"
                      : connectionStatus === "error"
                        ? "Unavailable"
                        : "Connecting"
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