import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import ApplianceModal from "@/components/forms/ApplianceModal";
import ApplianceStatusBox from "@/components/forms/ApplianceStatusBox";
import {
  applianceCardGrid,
} from "@/components/forms/applianceCard";
import Copyright from "@/components/ui/Copyright";
import NavBar from "@/components/layout/Navbar";
import ScreenContainer2 from "@/components/layout/ScreenContainer2";
import AppText from "@/components/ui/AppText";
import { useTranslation } from "react-i18next";
import { DropdownModal, RadioOptionRow } from "@/components/ui/DropdownModal";
import EmptyState from "@/components/ui/EmptyState";

import { Colors } from "@/constants/colors";
import {
  CATALOG_IMAGES,
} from "@/constants/applianceCatalog";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  Radius,
} from "@/constants/theme";
import { Control, useScreenPadding } from "@/constants/sizing";
import {
  SlidingToggle,
} from "@/components/ui/SlidingToggle";
import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import {
  type BatteryStateInput,
  recommendAppliance,
} from "@/services/recommendation";
import {
  useMonitoring,
} from "@/services/monitoringService";

type PowerLevel =
  | "All"
  | "Highest"
  | "Moderate"
  | "Low";

type Area =
  | "All Areas"
  | "Living Area"
  | "Bedroom"
  | "Kitchen Area"
  | "Work/Study Area"
  | "Bathroom Area"
  | "Porch"
  | "Custom";

type SelectedAppliance = {
  id: string;
  name: string;
  watts: string;
  area: string;
  imageUrl?: string | null;
};

type StatusFilter =
  | "Advisable"
  | "Caution"
  | "notAdvisable";

type ApplianceStatus =
  | "advisable"
  | "care"
  | "notAdvisable";

const STATUS_FOR_FILTER: Record<
  StatusFilter,
  ApplianceStatus
> = {
  Advisable: "advisable",
  Caution: "care",
  notAdvisable: "notAdvisable",
};

const TOGGLE_META_BASE: {
  filter: StatusFilter;
  label: string;
  tone: "primary" | "warning" | "error";
  accessibilityLabel: string;
}[] = [
  {
    filter: "Advisable",
    label: "Advisable",
    tone: "primary",
    accessibilityLabel:
      "Show advisable appliances",
  },
  {
    filter: "Caution",
    label: "Caution",
    tone: "warning",
    accessibilityLabel:
      "Show appliances to use with care",
  },
  {
    filter: "notAdvisable",
    label: "Not Advisable",
    tone: "error",
    accessibilityLabel:
      "Show not advisable appliances",
  },
];

const getToggleColor = (
  colors: AppColors,
  tone: "primary" | "warning" | "error",
) =>
  tone === "warning"
    ? colors.warning
    : tone === "error"
      ? colors.error
      : colors.primary;

const statusMeta = (
  status: ApplianceStatus,
) => {

  if (
    status === "care"
  ) {

    return {
      label: "Use with care",
      tone: "care" as const,
    };
  }

  if (
    status === "notAdvisable"
  ) {

    return {
      label: "Not advised",
      tone: "not" as const,
    };
  }

  return {
    label: "OK to use",
    tone: "ok" as const,
  };
};

/*
 * UI area names (resolved areas already use these names —
 * catalog uiArea values and "Custom Appliances").
 */
const areaMap: Record<
  Exclude<Area, "All Areas">,
  string
> = {
  "Living Area": "Living Area",
  Bedroom: "Bedroom",
  "Kitchen Area": "Kitchen Area",
  "Work/Study Area": "Work/Study Area",
  "Bathroom Area": "Bathroom Area",
  Porch: "Porch",
  Custom: "Custom Appliances",
};

export default function AppliancesScreen() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("Advisable");

  const colors = useAppColors();

  // Responsive gutter: 16/20/24 by phone width (UI-STANDARDS.md).
  const screenPadding = useScreenPadding();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  const {
    monitoring,
  } = useMonitoring();

  const [
    selectedAppliances,
    setSelectedAppliances,
  ] = useState<SelectedAppliance[]>([]);

  const [
    applianceModalVisible,
    setApplianceModalVisible,
  ] = useState(false);

  const [powerFilter, setPowerFilter] =
    useState<PowerLevel>("All");

  const [areaFilter, setAreaFilter] =
    useState<Area>("All Areas");

  const [
    powerModalVisible,
    setPowerModalVisible,
  ] = useState(false);

  const [
    areaModalVisible,
    setAreaModalVisible,
  ] = useState(false);

  const loadSelectedAppliances = async () => {
    try {
      const { fetchSelectedAppliances } = await import(
        "@/services/appliancesService"
      );
      const resolved = await fetchSelectedAppliances();

      setSelectedAppliances(
        resolved.map((item) => ({
          id: item.id,
          name: item.name,
          watts: item.display,
          area: item.area,
          imageUrl: item.imageUrl ?? null,
        })),
      );

      return;
    } catch {
      // Fall back to legacy direct query below.
    }

    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setSelectedAppliances([]);
      return;
    }

    const { data, error } = await supabase
      .from("appliances")
      .select(
        "app_id, appliance_name, type, catalog_key, wattage_min, wattage_max, selection, image_url",
      )
      .eq("user_id", user.id)
      .order("appliance_name");

    if (error) {
      console.error(
        "Failed to load selected appliances:",
        error.message,
      );
      return;
    }

    const { CATALOG_BY_KEY } = await import(
      "@/constants/applianceCatalog"
    );

    setSelectedAppliances(
      (data ?? [])
        .filter(
          (item) =>
            typeof item.catalog_key === "string" ||
            (item.type === "custom" &&
              item.selection === true),
        )
        .map((item) => {
          if (
            typeof item.catalog_key === "string"
          ) {
            const catalog =
              CATALOG_BY_KEY.get(item.catalog_key);

            if (catalog) {
              return {
                id: catalog.key,
                name: catalog.name,
                watts: catalog.display,
                area: catalog.uiArea,
              };
            }
          }

          const minWatts = Number(item.wattage_min);
          const maxWatts = Number(item.wattage_max);

          const watts =
            Number.isFinite(minWatts) &&
            Number.isFinite(maxWatts) &&
            minWatts > 0 &&
            maxWatts >= minWatts
              ? `${minWatts}-${maxWatts}W`
              : "";

          return {
            id: String(item.app_id),
            name: String(item.appliance_name),
            watts,
            area: "Custom Appliances",
            imageUrl:
              typeof item.image_url === "string"
                ? item.image_url
                : null,
          };
        }),
    );
  };

  const handleApplianceSave = async () => {
    await loadSelectedAppliances();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch is the effect's purpose
    loadSelectedAppliances();
  }, []);

  const handlePowerFilter = (
    filter: PowerLevel,
  ) => {
    setPowerFilter(filter);
    setPowerModalVisible(false);
  };

  const handleAreaFilter = (filter: Area) => {
    setAreaFilter(filter);
    setAreaModalVisible(false);
  };

  // ==========================================================
  // RECOMMENDATION STATUS
  //
  // Live battery readings drive the engine verdict. When no
  // monitoring row exists yet, the legacy wattage heuristic
  // keeps the prior behavior until data arrives.
  // ==========================================================

  const getApplianceStatus = useCallback(
    (
      appliance: SelectedAppliance,
    ): ApplianceStatus => {

    if (
      !monitoring
    ) {

      const watts =
        appliance.watts
          .match(/\d+/g)
          ?.map(Number) ?? [];

      const maxWatts = Math.max(
        ...watts,
        0,
      );

      return maxWatts < 300
        ? "advisable"
        : "notAdvisable";
    }

    const battery: BatteryStateInput = {
      soc: monitoring.battery_level,
      voltage: monitoring.voltage,
      remainingWh:
        monitoring.watt_hours,
      dod: monitoring.dod_status,
    };

    const recommendation =
      recommendAppliance(
        battery,
        {
          id: appliance.id,
          name: appliance.name,
          wattage: appliance.watts,
        },
      );

    if (
      recommendation.verdict ===
      "notRecommended"
    ) {

      return "notAdvisable";
    }

    if (
      recommendation.verdict ===
      "care"
    ) {

      return "care";
    }

    return "advisable";
    },
    [monitoring],
  );

  // ==========================================================
  // CONTENT-AWARE STATUS SEGMENTS
  //
  // Only segments holding appliances render; the selection
  // follows the first non-empty segment in
  // Caution → Advisable → Not Advisable order (Not Advisable
  // is the last-resort fallback). An empty appliance list
  // keeps all three segments on Advisable.
  // ==========================================================

  const statusCounts = useMemo(() => {
    const counts: Record<ApplianceStatus, number> = {
      advisable: 0,
      care: 0,
      notAdvisable: 0,
    };

    for (const appliance of selectedAppliances) {
      counts[getApplianceStatus(appliance)] += 1;
    }

    return counts;
  }, [selectedAppliances, getApplianceStatus]);

  const visibleStatusFilters = useMemo<StatusFilter[]>(() => {
    if (selectedAppliances.length === 0) {
      return ["Advisable", "Caution", "notAdvisable"];
    }

    const ordered: StatusFilter[] = [
      "Caution",
      "Advisable",
      "notAdvisable",
    ];

    const visible = ordered.filter(
      (filter) =>
        statusCounts[STATUS_FOR_FILTER[filter]] > 0,
    );

    // Unreachable (every appliance has a status), but a
    // zero-option toggle would break the pill math.
    return visible.length > 0
      ? visible
      : (["Advisable", "Caution", "notAdvisable"] as StatusFilter[]);
  }, [selectedAppliances.length, statusCounts]);

  // Effective selection for this render (covers first paint
  // before the canonical sync below commits).
  const effectiveStatusFilter =
    visibleStatusFilters.includes(statusFilter)
      ? statusFilter
      : (visibleStatusFilters[0] ?? "Advisable");

  // Keep the stored selection canonical: when counts shift
  // (add/archive/delete/battery verdict change) and empty
  // the active segment, glide to the next visible one.
  useEffect(() => {
    if (!visibleStatusFilters.includes(statusFilter)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- glide selection to next visible segment
      setStatusFilter(
        visibleStatusFilters[0] ?? "Advisable",
      );
    }
  }, [visibleStatusFilters, statusFilter]);

  const visibleToggleMeta = useMemo(
    () =>
      TOGGLE_META_BASE.filter((meta) =>
        visibleStatusFilters.includes(meta.filter),
      ),
    [visibleStatusFilters],
  );

  const filteredAppliances =
    selectedAppliances.filter((appliance) => {
      const watts =
        appliance.watts.match(/\d+/g)?.map(Number) ??
        [];

      const maxWatts = Math.max(...watts, 0);

      const matchesPower =
        powerFilter === "All" ||
        (powerFilter === "Highest" &&
          maxWatts >= 50) ||
        (powerFilter === "Moderate" &&
          maxWatts >= 20 &&
          maxWatts < 50) ||
        (powerFilter === "Low" &&
          maxWatts < 20);

      const matchesArea =
        areaFilter === "All Areas" ||
        appliance.area === areaMap[areaFilter];

      const status =
        getApplianceStatus(appliance);

      const matchesStatus =
        status ===
        STATUS_FOR_FILTER[
          effectiveStatusFilter
        ];

      return (
        matchesPower &&
        matchesArea &&
        matchesStatus
      );
    });

  return (
    <ScreenContainer2>
      <NavBar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: screenPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.card}>
          <AppText
            variant="heading"
            style={styles.title}
          >
            {t("dashboard.appliances.title")}
          </AppText>

          <AppText
            variant="caption"
            style={styles.subtitle}
          >
            {t("dashboard.appliances.subtitle")}
          </AppText>
        </View>

        {/* Controls */}
        {/* Select Appliances (full spread, above the filters) */}
        <Pressable
          onPress={() =>
            setApplianceModalVisible(true)
          }
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Select appliances"
        >
          <Ionicons
            name="add-outline"
            size={18}
            color={colors.onPrimary}
          />

          <AppText
            variant="caption"
            style={styles.addButtonText}
          >
            Select Appliances
          </AppText>
        </Pressable>

        <View style={styles.controls}>
          {/* Power Filter */}
          <View style={styles.filterWrapper}>
            <Pressable
              onPress={() => {
                setPowerModalVisible(true);
                setAreaModalVisible(false);
              }}
              style={({ pressed }) => [
                styles.filterButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="flash-outline"
                size={18}
                color={colors.accentContent}
              />

              <AppText
                variant="caption"
                style={styles.filterText}
              >
                {powerFilter}
              </AppText>

              <Ionicons
                name="chevron-down-outline"
                size={17}
                color={colors.text}
              />
            </Pressable>
          </View>

          {/* Area Filter */}
          <View style={styles.filterWrapper}>
            <Pressable
              onPress={() => {
                setAreaModalVisible(true);
                setPowerModalVisible(false);
              }}
              style={({ pressed }) => [
                styles.filterButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.accentContent}
              />

              <AppText
                variant="caption"
                style={styles.filterText}
              >
                {areaFilter}
              </AppText>

              <Ionicons
                name="chevron-down-outline"
                size={17}
                color={colors.text}
              />
            </Pressable>
          </View>
        </View>

        {/* Status Filter (only segments with content) */}
        <SlidingToggle
          value={effectiveStatusFilter}
          onChange={setStatusFilter}
          style={styles.statusToggleColors}
          options={visibleToggleMeta.map(
            ({
              filter,
              label,
              tone,
              accessibilityLabel,
            }) => ({
              value: filter,
              label,
              activeColor: getToggleColor(
                colors,
                tone,
              ),
              activeInk:
                filter === "Caution"
                  ? Colors.light.text
                  : undefined,
              accessibilityLabel,
            }),
          )}
        />

        {/* Appliances */}
        <View style={[applianceCardGrid, { marginTop: 20 }]}>
          {filteredAppliances.length === 0 ? (
            <EmptyState
              title={
                selectedAppliances.length === 0
                  ? "No Appliances"
                  : effectiveStatusFilter ===
                      "Advisable"
                    ? "No Advisable Appliances"
                    : effectiveStatusFilter ===
                        "Caution"
                      ? "No Appliances to Use With Care"
                      : "No Not Advisable Appliances"
              }
              description={
                selectedAppliances.length === 0
                  ? "No appliances have been selected yet."
                  : "No appliances match the selected filters."
              }
              icon={
                selectedAppliances.length === 0
                  ? "cube-outline"
                  : effectiveStatusFilter ===
                      "Advisable"
                    ? "checkmark-circle-outline"
                    : effectiveStatusFilter ===
                        "Caution"
                      ? "warning-outline"
                      : "alert-circle-outline"
              }
            />
          ) : (
            filteredAppliances.map((appliance) => {
              const status =
                getApplianceStatus(appliance);

              const statusMapped =
                statusMeta(status);

              return (
                <ApplianceStatusBox
                  key={appliance.id}
                  name={appliance.name}
                  wattage={appliance.watts}
                  status={
                    statusMapped.label
                  }
                  statusTone={
                    statusMapped.tone
                  }
                  imageSource={
                    appliance.imageUrl
                      ? { uri: appliance.imageUrl }
                      : (CATALOG_IMAGES[
                          appliance.id
                        ] ?? undefined)
                  }
                />
              );
            })
          )}
        </View>

        <Copyright />
      </ScrollView>

      <ApplianceModal
        visible={applianceModalVisible}
        onClose={() =>
          setApplianceModalVisible(false)
        }
        onSave={handleApplianceSave}
        selectedAppliances={selectedAppliances}
      />

      {/* ========================================================
          POWER LEVEL MODAL
      ======================================================== */}
      <DropdownModal
        visible={powerModalVisible}
        title="Power Level"
        onClose={() =>
          setPowerModalVisible(false)
        }
      >
        {(
          [
            "All",
            "Highest",
            "Moderate",
            "Low",
          ] as PowerLevel[]
        ).map((option) => (
          <RadioOptionRow
            key={option}
            label={option}
            selected={
              powerFilter === option
            }
            onPress={() =>
              handlePowerFilter(option)
            }
          />
        ))}
      </DropdownModal>

      {/* ========================================================
          AREA MODAL
      ======================================================== */}
      <DropdownModal
        visible={areaModalVisible}
        title="Area"
        onClose={() =>
          setAreaModalVisible(false)
        }
      >
        {(
          [
            "All Areas",
            "Living Area",
            "Bedroom",
            "Kitchen Area",
            "Work/Study Area",
            "Bathroom Area",
            "Porch",
            "Custom",
          ] as Area[]
        ).map((option) => (
          <RadioOptionRow
            key={option}
            label={option}
            selected={areaFilter === option}
            onPress={() =>
              handleAreaFilter(option)
            }
          />
        ))}
      </DropdownModal>
    </ScreenContainer2>
  );
}

const dimensions = {
  padding: 16,
  radius: 16,
  borderWidth: 3,
  gap: 10,
};

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },

  content: {
    padding: dimensions.padding,
    paddingBottom: 24,
  },

  sectionHeader: {
    marginBottom: 12,
  },

  card: {
    backgroundColor: colors.glass.white,
    borderWidth: dimensions.borderWidth,
    borderColor: colors.cardBorder,
    borderRadius: dimensions.radius,
    padding: 18,
    marginBottom: 16,
  },

  title: {
    color: colors.text,
    fontWeight: "700",
  },

  subtitle: {
    color: colors.textSecondary,
    marginTop: 6,
  },

  controls: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: dimensions.gap,
    marginBottom: 18,
    zIndex: 20,
  },

  addButton: {
    width: "100%",
    minHeight: Control.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: dimensions.gap,
  },

  addButtonText: {
    color: colors.onPrimary,
    fontWeight: "700",
  },

  filterWrapper: {
    flex: 1,
    position: "relative",
  },

  filterButton: {
    minHeight: Control.button,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.white,
    borderWidth: dimensions.borderWidth,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 11,
    gap: 6,
  },

  filterText: {
    flex: 1,
    color: colors.text,
    fontWeight: "600",
  },

  pressed: {
    opacity: 0.7,
  },

  applianceSection: {
    width: "100%",
    marginBottom: 18,
  },

  sectionTitle: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 10,
  },

  statusToggleColors: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    backgroundColor: colors.glass.white,
    borderColor: colors.border,
    borderRadius: Radius.md,
    marginTop: 10,
  },
});