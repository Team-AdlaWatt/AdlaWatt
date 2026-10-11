import { Ionicons } from "@expo/vector-icons";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import ApplianceBox from "@/components/forms/ApplianceBox";
import {
  applianceCardGrid,
} from "@/components/forms/applianceCard";
import CustomApplianceModal from "@/components/forms/CustomApplianceModal";
import MediaPickerModal, {
  type PickedPhoto,
} from "@/components/forms/MediaPickerModal";
import {
  deleteAppliancePhotoByUrl,
  uploadAppliancePhoto,
} from "@/services/appliancePhotoService";
import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import SearchBox from "@/components/ui/SearchBox";

import { Colors } from "@/constants/colors";
import {
  CATALOG_IMAGES,
  CUSTOM_AREA,
  GIVEN_CATALOG,
  type CatalogItem,
} from "@/constants/applianceCatalog";
import { logAppliance } from "@/services/activityLogService";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import {
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Control, Touch } from "@/constants/sizing";

import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";

type Appliance = {
  id: string;
  name: string;
  watts: string;
  area: string;
  // Stored public photo URL. Null/undefined renders the
  // bundled adlawatt icon — the default for every custom.
  imageUrl?: string | null;
};

type ApplianceModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave?: (appliances: Appliance[]) => void;
  onCustomAdd?: (appliance: Appliance) => void;
  onCustomUpdate?: (
    appliance: Appliance,
  ) => void;
  onCustomDelete?: (id: string) => void;
  selectedAppliances?: Appliance[];
};

/*
 * v5 schema: DB holds user picks only, no wattage column.
 *  - given  = { catalog_key LIKE 'catalog:%',
 *               wattage_min/max from GIVEN_CATALOG }
 *  - custom = { catalog_key NULL, wattage_min/max interval }
 * Catalog wattage/area always come from GIVEN_CATALOG in code.
 *
 * v6 archive flag: archive = true means archived (hidden).
 * The DB trigger stores archive := NOT selection, so only
 * selected customs (archive = false) are listed. Deselecting
 * archives the row at once. An archives viewer is future work.
 */
const toFiniteNumber = (value: unknown): number | null => {
  const num =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/W$/i, "").trim());

  return Number.isFinite(num) && num > 0 ? num : null;
};

const formatIntervalWatts = (
  min: number,
  max: number,
): string => `${min}-${max}W`;

const formatCustomWatts = (
  wattMin: unknown,
  wattMax: unknown,
): string => {
  const min = toFiniteNumber(wattMin);
  const max = toFiniteNumber(wattMax);

  if (min !== null && max !== null && max >= min) {
    return formatIntervalWatts(min, max);
  }

  return "";
};

/* Parses "15-25" / "15 - 25" / "15.5-25.5" into { min, max }. */
const parseWattInterval = (
  raw: string,
): { min: number; max: number } | null => {
  const match = raw.match(
    /^(\d+(?:\.\d{1,2})?)\s*-\s*(\d+(?:\.\d{1,2})?)$/,
  );

  if (!match) {
    return null;
  }

  const min = Number(match[1]);
  const max = Number(match[2]);

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min < 1 ||
    max > 720 ||
    min > max
  ) {
    return null;
  }

  return { min, max };
};

/*
 * UI area colors
 */
const areaColors: Record<string, string> = {
  "Living Area": Colors.light.areas.living,
  "Bedroom": Colors.light.areas.bedroom,
  "Kitchen Area": Colors.light.areas.kitchen,
  "Work/Study Area": Colors.light.areas.study,
  "Bathroom Area": Colors.light.areas.bathroom,
  "Porch": Colors.light.areas.porch,
};

const getAreaColor = (
  area: string,
  fallback: string,
) =>
  areaColors[area] ?? fallback;

const catalogToAppliance = (
  item: CatalogItem,
): Appliance => ({
  id: item.key,
  name: item.name,
  watts: item.display,
  area: item.uiArea,
});

export default function ApplianceModal({
  visible,
  onClose,
  selectedAppliances = [],
  onCustomAdd,
  onCustomUpdate,
  onCustomDelete,
  onSave,
}: ApplianceModalProps) {
  const [selected, setSelected] = useState<
    string[]
  >([]);

  const [appliances, setAppliances] = useState<
    Appliance[]
  >([]);

  const [searchText, setSearchText] =
    useState("");

  const [addModalVisible, setAddModalVisible] =
    useState(false);

  const [editModalVisible, setEditModalVisible] =
    useState(false);

  const [customName, setCustomName] =
    useState("");

  const [customWatts, setCustomWatts] =
    useState("");

  // Live interval validity: the strict twin inputs admit
  // only well-formed sides, but an interval can still be
  // incomplete ("12-") or reversed ("720-129"). The confirm
  // button stays disabled until the whole interval passes
  // the exact submit rules below.
  const customWattsValid = useMemo(() => {
    const text = customWatts.trim();

    if (
      !/^\d+(\.\d{1,2})?\s*-\s*\d+(\.\d{1,2})?$/.test(
        text,
      )
    ) {
      return false;
    }

    return parseWattInterval(text) !== null;
  }, [customWatts]);

  const [customError, setCustomError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // True while custom appliances are being fetched, so the
  // section can show a loading state instead of flashing empty.
  const [isLoadingCustoms, setIsLoadingCustoms] =
    useState(false);

  const [editingCustom, setEditingCustom] =
    useState<Appliance | null>(null);

  // ---- Custom photo draft (add/edit form) ----
  // Local pick (fresh from the library) wins over the
  // stored URL for the preview. The stored URL is swapped
  // into the row on confirm; the pre-edit original is kept
  // separately so a replaced object can be deleted.
  const [customPhotoLocal, setCustomPhotoLocal] =
    useState<PickedPhoto | null>(null);

  const [customPhotoUrl, setCustomPhotoUrl] =
    useState<string | null>(null);

  const [customPhotoOriginalUrl, setCustomPhotoOriginalUrl] =
    useState<string | null>(null);

  // True while a form photo upload runs (confirm dims).
  const [photoBusy, setPhotoBusy] = useState(false);

  // Media picker visibility. Only the add/edit form picks
  // photos now that the box camera cell is gone.

  const [isReset, setIsReset] =
    useState(false);

  // Customs the user archived (archive = true through
  // the DB trigger). Archived rows are hidden from the list
  // until the archives viewer lands.
  const [archivedCount, setArchivedCount] =
    useState(0);

  const [isSaving, setIsSaving] = useState(false);

  // Layer 1 = Add Appliances (catalog + active customs).
  // Layer 2 = Archived viewer (archive=true customs only).
  // Same shell/modal, only the content layer swaps.
  const [layer, setLayer] = useState<1 | 2>(1);

  const [archivedAppliances, setArchivedAppliances] =
    useState<Appliance[]>([]);

  const [archiveSearchText, setArchiveSearchText] =
    useState("");

  // Custom ids the user deleted/archived/reset locally this
  // session. Prop customs are merged into the display so a
  // selected custom never vanishes while loading, but ids in
  // here are excluded so a deleted custom does not reappear
  // via the prop fallback before the parent refreshes.
  const [dismissedCustomIds, setDismissedCustomIds] =
    useState<string[]>([]);

  // Single-open 3-dot menus: at most one box menu across
  // Layer 1 and the archived viewer. Declared before the
  // visible-sync effect below (react-hooks/immutability).
  const [openMenuId, setOpenMenuId] = useState<
    string | null
  >(null);

  // Guards the async load: only the latest open may write
  // state, so a slow fetch cannot overwrite newer toggles
  // and closing mid-fetch cannot set state for a dead open.
  const loadSeq = useRef(0);

  const scrollRef = useRef<ScrollView>(null);

  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  // Custom section follows the themed brand primary so it
  // stays correct in both light and dark mode.
  const areaColor = (area: string) =>
    area === "Custom Appliances"
      ? colors.primary
      : getAreaColor(area, colors.border);

  // ============================================================
  // LOAD APPLIANCES
  // ============================================================
  //
  // Single open wins: `seq` invalidates stale fetches, and the
  // final selection is the UNION of DB state + the prop snapshot
  // taken at open, so a slow/empty fetch can never wipe the
  // parent's selected customs.
  // ============================================================

  const loadAppliances = async (
    propSnapshot: Appliance[],
  ) => {
    const seq = loadSeq.current + 1;
    loadSeq.current = seq;

    setIsLoadingCustoms(true);

    const user = await getAuthenticatedUserSafe();

    if (loadSeq.current !== seq) {
      return;
    }

    if (!user) {
      const propIds = propSnapshot.map(({ id }) => id);
      const propCustoms = propSnapshot.filter(
        (item) => item.area === CUSTOM_AREA,
      );
      // Dismissed is always empty on fresh open (cleared in the
      // open effect), so no filter needed here.
      setAppliances(propCustoms);
      setArchivedAppliances([]);
      setSelected(propIds);
      setArchivedCount(0);
      setIsLoadingCustoms(false);
      return;
    }

    const { data, error } = await supabase
      .from("appliances")
      .select(
        "app_id, appliance_name, type, catalog_key, wattage_min, wattage_max, selection, archive, image_url",
      )
      .eq("user_id", user.id)
      .order("appliance_name");

    if (loadSeq.current !== seq) {
      return;
    }

    if (error) {
      console.error(
        "Failed to load appliances:",
        error.message,
      );
      // Keep the prop snapshot visible instead of flashing
      // empty: selected customs must stay displayed even when
      // the fetch fails.
      const propIds = propSnapshot.map(({ id }) => id);
      const propCustoms = propSnapshot.filter(
        (item) => item.area === CUSTOM_AREA,
      );
      setAppliances((current) => {
        if (current.length > 0) {
          return current;
        }
        return propCustoms;
      });
      setSelected((current) =>
        current.length > 0
          ? current
          : propIds,
      );
      setIsLoadingCustoms(false);
      return;
    }

    const rows = data ?? [];

    const pickedCatalogKeys = rows
      .filter(
        (item) =>
          typeof item.catalog_key === "string" &&
          item.catalog_key.startsWith("catalog:") &&
          item.selection !== false,
      )
      .map((item) => String(item.catalog_key));

    // Layer 1 list: active customs (archive != true).
    // Layer 2 list: archived customs (archive == true).
    const customs: Appliance[] = rows
      .filter(
        (item) =>
          item.type === "custom" &&
          item.archive !== true,
      )
      .map((item) => ({
        id: String(item.app_id),
        name: String(item.appliance_name),
        watts: formatCustomWatts(
          item.wattage_min,
          item.wattage_max,
        ),
        area: CUSTOM_AREA,
        imageUrl:
          typeof item.image_url === "string"
            ? item.image_url
            : null,
      }));

    const archived: Appliance[] = rows
      .filter(
        (item) =>
          item.type === "custom" &&
          item.archive === true,
      )
      .map((item) => ({
        id: String(item.app_id),
        name: String(item.appliance_name),
        watts: formatCustomWatts(
          item.wattage_min,
          item.wattage_max,
        ),
        area: CUSTOM_AREA,
        imageUrl:
          typeof item.image_url === "string"
            ? item.image_url
            : null,
      }));

    const selectedCustomIds = rows
      .filter(
        (item) =>
          item.type === "custom" &&
          item.selection === true,
      )
      .map((item) => String(item.app_id));

    const propIds = propSnapshot.map(({ id }) => id);

    setAppliances(customs);
    setArchivedAppliances(archived);
    setSelected([
      ...new Set([
        ...pickedCatalogKeys,
        ...selectedCustomIds,
        ...propIds,
      ]),
    ]);
    setArchivedCount(archived.length);
    setIsLoadingCustoms(false);

    console.debug(
      `[ApplianceModal] loaded rows=${rows.length} active=${customs.length} archived=${archived.length}`,
    );
  };

  // ============================================================
  // LOAD ARCHIVED ONLY (Layer 2 refetch)
  // ============================================================
  //
  // Layer 2 refetches on open so it never depends on the
  // Layer 1 snapshot timing: even if the item was archived from
  // a prop-fallback row or an earlier fetch was stale, opening
  // the archive layer always reads fresh archive=true rows.
  // ============================================================

  const loadArchived = async () => {
    const seq = loadSeq.current + 1;
    loadSeq.current = seq;

    setIsLoadingCustoms(true);

    const user = await getAuthenticatedUserSafe();

    if (loadSeq.current !== seq) {
      return;
    }

    if (!user) {
      setArchivedAppliances([]);
      setArchivedCount(0);
      setIsLoadingCustoms(false);
      return;
    }

    const { data, error } = await supabase
      .from("appliances")
      .select(
        "app_id, appliance_name, type, catalog_key, wattage_min, wattage_max, selection, archive, image_url",
      )
      .eq("user_id", user.id)
      .eq("type", "custom")
      .eq("archive", true)
      .order("appliance_name");

    if (loadSeq.current !== seq) {
      return;
    }

    if (error) {
      console.error(
        "Failed to load archived appliances:",
        error.message,
      );
      setCustomError(
        "Unable to load archived appliances. Please try again.",
      );
      setIsLoadingCustoms(false);
      return;
    }

    const archived: Appliance[] = (data ?? []).map(
      (item) => ({
        id: String(item.app_id),
        name: String(item.appliance_name),
        watts: formatCustomWatts(
          item.wattage_min,
          item.wattage_max,
        ),
        area: CUSTOM_AREA,
        imageUrl:
          typeof item.image_url === "string"
            ? item.image_url
            : null,
      }),
    );

    console.debug(
      `[ApplianceModal] loaded archived=${archived.length}`,
    );

    setArchivedAppliances(archived);
    setArchivedCount(archived.length);
    setIsLoadingCustoms(false);
  };

  // ============================================================
  // MODAL STATE
  // ============================================================
  //
  // Deps are [visible] only on purpose. Depending on the
  // `selectedAppliances` array would re-run the loader mid-edit
  // (wiping toggles + search) whenever the parent re-renders
  // with a new array identity. The prop is snapshotted once per
  // open for the immediate paint + DB union above.
  // ============================================================

  useEffect(() => {
    if (visible) {
      const snapshot = selectedAppliances;

      // Immediate paint so selected customs are visible even
      // before the DB fetch resolves. loadAppliances() owns the
      // seq guard, so a slow fetch cannot overwrite a newer open
      // and closing mid-fetch invalidates it.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modal open snapshots selection + resets draft state (intentional UI sync with visible)
      setSelected(snapshot.map(({ id }) => id));
      setDismissedCustomIds([]);
      setSearchText("");
      setArchiveSearchText("");
      setLayer(1);
      setIsSaving(false);

      void loadAppliances(snapshot);

      return;
    }

    loadSeq.current += 1;
    setSelected([]);
    setSearchText("");
    setArchiveSearchText("");
    setLayer(1);
    setOpenMenuId(null);
    setArchivedAppliances([]);
    setIsLoadingCustoms(false);
    setEditModalVisible(false);
    setAddModalVisible(false);
    setCustomName("");
    setCustomWatts("");
    setCustomError("");
    setSuccessMessage("");
    setEditingCustom(null);
    setIsReset(false);
    setIsSaving(false);
    setDismissedCustomIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ============================================================
  // TOGGLE APPLIANCE
  // ============================================================

  const toggleAppliance = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
          (item) => item !== id,
        )
        : [...current, id],
    );
  };

  // ============================================================
  // RESET SELECTION
  // ============================================================

  const handleReset = async () => {
    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError("You must be signed in.");
      return;
    }

    const { error } = await supabase.rpc(
      "reset_appliance_selection",
    );

    if (error) {
      console.error(
        "Reset appliance selection error:",
        error.message,
      );

      setCustomError(
        "Unable to reset appliance selection.",
      );

      return;
    }

    setSelected([]);
    setCustomName("");
    setCustomWatts("");
    setCustomError("");
    setEditModalVisible(false);
    setAddModalVisible(false);
    setEditingCustom(null);
    setIsReset(true);
    // Selection-only reset (RPC clears given rows and flips
    // customs to selection=false without touching archive):
    // Layer 1 customs stay visible unticked, the archived
    // list is untouched, so there is nothing to move or
    // dismiss here.

    logAppliance.selectionReset();
  };

  // ============================================================
  // SAVE APPLIANCE SELECTION
  // ============================================================

  const handleSave = async () => {
    if (isLoadingCustoms) {
      setCustomError(
        "Still loading your custom appliances. Please wait a moment and try again.",
      );
      return;
    }

    if (isSaving) {
      return;
    }

    const user = await getAuthenticatedUserSafe();

    if (!user) {
      console.error("No authenticated user.");
      return;
    }

    setIsSaving(true);

    const selectedSet = new Set(selected);

    const catalogPicks = GIVEN_CATALOG.filter(
      (item) => selectedSet.has(item.key),
    ).map((item) => ({
      key: item.key,
      name: item.name,
      wattMin: item.wattMin,
      wattMax: item.wattMax,
    }));

    // Union DB customs + prop customs (minus locally dismissed)
    // so a selected custom can never be dropped just because the
    // fetch had not finished or had filtered it out.
    const customsForSave = [
      ...new Map(
        [
          ...appliances,
          ...selectedAppliances.filter(
            (item) =>
              item.area === CUSTOM_AREA &&
              !dismissedCustomIds.includes(item.id),
          ),
        ].map((item) => [item.id, item]),
      ).values(),
    ];

    const customSelected = customsForSave
      .filter((item) => selectedSet.has(item.id))
      .map((item) => item.id);

    const { error: saveError } = await supabase.rpc(
      "save_appliance_selection",
      {
        p_catalog: catalogPicks,
        p_custom_selected: customSelected,
      },
    );

    setIsSaving(false);

    if (saveError) {
      console.error(
        "Save appliance selection error:",
        saveError.message,
      );

      setCustomError(
        "Unable to save appliance selection.",
      );

      return;
    }

    const selectedItems = displayAppliances.filter(
      (item) => selected.includes(item.id),
    );

    logAppliance.selectionSaved(selectedItems.length);

    onSave?.(selectedItems);
    onClose();
  };

  // ============================================================
  // CANCEL EDIT MODAL
  // ============================================================

  const handleEditCancel = () => {
    setCustomName("");
    setCustomWatts("");
    setCustomError("");
    setCustomPhotoLocal(null);
    setCustomPhotoUrl(null);
    setCustomPhotoOriginalUrl(null);
    setEditingCustom(null);
    setEditModalVisible(false);
  };

  // ============================================================
  // ADD MODAL (ADD-ONLY, DropdownModal shell like CalendarModal)
  // ============================================================

  const handleAddOpen = () => {
    setEditingCustom(null);
    setCustomName("");
    setCustomWatts("");
    setCustomError("");
    setCustomPhotoLocal(null);
    setCustomPhotoUrl(null);
    setCustomPhotoOriginalUrl(null);
    setAddModalVisible(true);
  };

  const handleAddCancel = () => {
    setCustomName("");
    setCustomWatts("");
    setCustomError("");
    setCustomPhotoLocal(null);
    setCustomPhotoUrl(null);
    setCustomPhotoOriginalUrl(null);
    setAddModalVisible(false);
  };

  // ============================================================
  // ADD CUSTOM APPLIANCE
  // ============================================================

  const handleCustomAdd = async () => {
    const name = customName.trim();
    const wattsRaw = customWatts.trim();

    if (
      !/^[A-Za-z][A-Za-z0-9 /&.'-]{2,49}$/.test(
        name,
      )
    ) {
      setCustomError(
        "Appliance name must be valid and readable.",
      );
      return;
    }

    if (!/^\d+(\.\d{1,2})?\s*-\s*\d+(\.\d{1,2})?$/.test(wattsRaw)) {
      setCustomError(
        "Enter wattage interval, for example 15-25.",
      );
      return;
    }

    const interval = parseWattInterval(wattsRaw);

    if (!interval) {
      setCustomError(
        "Enter a valid wattage interval between 1W and 720W.",
      );
      return;
    }

    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError(
        "You must be signed in to add an appliance.",
      );
      return;
    }

    const {
      data: duplicate,
      error: duplicateError,
    } = await supabase
      .from("appliances")
      .select("app_id")
      .eq("user_id", user.id)
      .eq("type", "custom")
      .ilike("appliance_name", name)
      .maybeSingle();

    if (duplicateError) {
      console.error(
        "Duplicate appliance check error:",
        duplicateError.message,
      );

      setCustomError(
        "Unable to check appliance name.",
      );

      return;
    }

    if (duplicate) {
      setCustomError(
        "This appliance already exists.",
      );
      return;
    }

    // Photo first: a failed upload aborts the add so no
    // row is ever created pointing at a missing object.
    let imageUrl: string | null = null;

    if (customPhotoLocal) {
      setPhotoBusy(true);

      const upload = await uploadAppliancePhoto(
        user.id,
        customPhotoLocal.uri,
        customPhotoLocal.mimeType,
      );

      setPhotoBusy(false);

      if (
        !upload.success ||
        !("url" in upload) ||
        !upload.url
      ) {
        setCustomError(
          ("error" in upload && upload.error) ||
            "Unable to upload that photo. Please try again.",
        );
        return;
      }

      imageUrl = upload.url;
    }

    const { data, error } = await supabase
      .from("appliances")
      .insert({
        user_id: user.id,
        appliance_name: name,
        type: "custom",
        wattage_min: interval.min,
        wattage_max: interval.max,
        image_url: imageUrl,
        // New customs start selected: under the v6 archive
        // flag an unselected row would be archive = true and
        // hidden from the list at once.
        selection: true,
      })
      .select(
        "app_id, appliance_name, wattage_min, wattage_max, image_url",
      )
      .single();

    if (error) {
      console.error(
        "Custom appliance error:",
        error.message,
      );

      setCustomError(
        "Unable to add appliance. Please try again.",
      );

      return;
    }

    const appliance: Appliance = {
      id: String(data.app_id),
      name: String(data.appliance_name),
      watts: formatCustomWatts(
        data.wattage_min,
        data.wattage_max,
      ),
      area: CUSTOM_AREA,
      imageUrl:
        typeof data.image_url === "string"
          ? data.image_url
          : imageUrl,
    };

    onCustomAdd?.(appliance);

    logAppliance.added(name, appliance.watts);

    setAppliances((current) => [
      ...current,
      appliance,
    ]);

    setSelected((current) => [
      ...new Set([...current, appliance.id]),
    ]);

    setCustomName("");
    setCustomWatts("");
    setCustomError("");
    setCustomPhotoLocal(null);
    setCustomPhotoUrl(null);
    setCustomPhotoOriginalUrl(null);
    setAddModalVisible(false);

    setSuccessMessage(
      `${name} successfully added!`,
    );

    setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  // ============================================================
  // UPDATE CUSTOM APPLIANCE
  // ============================================================

  const handleCustomUpdate = async () => {
    if (!editingCustom) return;

    const name = customName.trim();
    const wattsRaw = customWatts.trim();

    if (
      !/^[A-Za-z][A-Za-z0-9 /&.'-]{2,49}$/.test(
        name,
      )
    ) {
      setCustomError(
        "Enter a valid appliance name.",
      );
      return;
    }

    if (!/^\d+(\.\d{1,2})?\s*-\s*\d+(\.\d{1,2})?$/.test(wattsRaw)) {
      setCustomError(
        "Enter wattage interval, for example 15-25.",
      );
      return;
    }

    const interval = parseWattInterval(wattsRaw);

    if (!interval) {
      setCustomError(
        "Enter a valid wattage interval between 1W and 720W.",
      );
      return;
    }

    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError(
        "You must be signed in to update an appliance.",
      );
      return;
    }

    const {
      data: duplicate,
      error: duplicateError,
    } = await supabase
      .from("appliances")
      .select("app_id")
      .eq("user_id", user.id)
      .eq("type", "custom")
      .ilike("appliance_name", name)
      .neq("app_id", editingCustom.id)
      .maybeSingle();

    if (duplicateError) {
      console.error(
        "Duplicate appliance check error:",
        duplicateError.message,
      );

      setCustomError(
        "Unable to check appliance name.",
      );

      return;
    }

    if (duplicate) {
      setCustomError(
        "This appliance already exists.",
      );
      return;
    }

    // Resolve the photo: a fresh pick uploads first (a
    // failed upload aborts before the row is touched);
    // otherwise keep the stored URL, or null when the user
    // removed it in the picker.
    let finalImageUrl: string | null = customPhotoUrl;

    if (customPhotoLocal) {
      setPhotoBusy(true);

      const upload = await uploadAppliancePhoto(
        user.id,
        customPhotoLocal.uri,
        customPhotoLocal.mimeType,
      );

      setPhotoBusy(false);

      if (
        !upload.success ||
        !("url" in upload) ||
        !upload.url
      ) {
        setCustomError(
          ("error" in upload && upload.error) ||
            "Unable to upload that photo. Please try again.",
        );
        return;
      }

      finalImageUrl = upload.url;
    }

    const { data, error } = await supabase
      .from("appliances")
      .update({
        appliance_name: name,
        wattage_min: interval.min,
        wattage_max: interval.max,
        image_url: finalImageUrl,
      })
      .eq("app_id", editingCustom.id)
      .eq("user_id", user.id)
      .eq("type", "custom")
      .select(
        "app_id, appliance_name, wattage_min, wattage_max, image_url",
      )
      .single();

    if (error) {
      console.error(
        "Custom appliance update error:",
        error.message,
      );

      setCustomError(
        "Unable to update appliance. Please try again.",
      );

      return;
    }

    const updated: Appliance = {
      id: String(data.app_id),
      name: String(data.appliance_name),
      watts: formatCustomWatts(
        data.wattage_min,
        data.wattage_max,
      ),
      area: CUSTOM_AREA,
      imageUrl:
        typeof data.image_url === "string"
          ? data.image_url
          : finalImageUrl,
    };

    // Replaced or removed photos leave orphaned objects:
    // delete the pre-edit original best-effort. A failed
    // delete never fails the save itself.
    if (
      customPhotoOriginalUrl &&
      customPhotoOriginalUrl !== finalImageUrl
    ) {
      void deleteAppliancePhotoByUrl(
        customPhotoOriginalUrl,
      ).catch(() => {});
    }

    setAppliances((current) =>
      current.map((item) =>
        item.id === updated.id
          ? updated
          : item,
      ),
    );

    // Edit works from either layer; keep both lists in sync.
    setArchivedAppliances((current) =>
      current.map((item) =>
        item.id === updated.id
          ? updated
          : item,
      ),
    );

    onCustomUpdate?.(updated);

    logAppliance.updated(name);

    setEditingCustom(null);
    setCustomName("");
    setCustomWatts("");
    setCustomError("");
    setCustomPhotoLocal(null);
    setCustomPhotoUrl(null);
    setCustomPhotoOriginalUrl(null);
    setEditModalVisible(false);

    setSuccessMessage(
      `${name} successfully updated!`,
    );

    setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  // ============================================================
  // DELETE CUSTOM APPLIANCE
  // ============================================================

  const handleCustomDelete = async (
    id: string,
  ) => {
    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError(
        "You must be signed in to delete an appliance.",
      );
      return;
    }

    const { error } = await supabase
      .from("appliances")
      .delete()
      .eq("app_id", id)
      .eq("user_id", user.id)
      .eq("type", "custom");

    if (error) {
      console.error(
        "Custom appliance delete error:",
        error.message,
      );

      setCustomError(
        "Unable to delete appliance. Please try again.",
      );

      return;
    }

    const removed =
      appliances.find((item) => item.id === id) ??
      archivedAppliances.find((item) => item.id === id);

    // Deleting the row orphans its photo: remove the stored
    // object best-effort. Never fails the delete itself.
    const removedImageUrl = removed?.imageUrl ?? null;

    if (removedImageUrl) {
      void deleteAppliancePhotoByUrl(
        removedImageUrl,
      ).catch(() => {});
    }

    const wasArchived = archivedAppliances.some(
      (item) => item.id === id,
    );

    setAppliances((current) =>
      current.filter((item) => item.id !== id),
    );

    setArchivedAppliances((current) =>
      current.filter((item) => item.id !== id),
    );

    if (wasArchived) {
      setArchivedCount((current) =>
        Math.max(0, current - 1),
      );
    }

    setSelected((current) =>
      current.filter((item) => item !== id),
    );

    setDismissedCustomIds((current) =>
      current.includes(id)
        ? current
        : [...current, id],
    );

    logAppliance.removed(
      removed?.name ?? "Custom appliance",
    );

    onCustomDelete?.(id);
  };

  // ============================================================
  // ARCHIVE CUSTOM APPLIANCE (Layer 1 -> Layer 2)
  // ============================================================
  //
  // v7 manual archive: archive_appliance() sets
  // (selection=false, archive=true) or raises
  // 'Appliance not found.' Strict RPC-only so a missing v7
  // migration surfaces loudly instead of silently succeeding.
  // ============================================================

  const handleCustomArchive = async (
    id: string,
  ) => {
    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError(
        "You must be signed in to archive an appliance.",
      );
      return;
    }

    // The row may be rendered from the prop fallback merge
    // (DB fetch pending) rather than `appliances` state, so look
    // in both places. Otherwise archiving a prop-fallback row
    // would vanish from Layer 1 without ever reaching Layer 2.
    const target =
      appliances.find((item) => item.id === id) ??
      selectedAppliances.find(
        (item) =>
          item.id === id && item.area === CUSTOM_AREA,
      ) ??
      null;

    const { error } = await supabase.rpc(
      "archive_appliance",
      {
        p_app_id: id,
      },
    );

    if (error) {
      console.error(
        "Custom appliance archive error:",
        error.message,
      );

      if (
        error.message.includes("Appliance not found")
      ) {
        setCustomError(
          "Appliance not found. It may have been deleted.",
        );
      } else if (
        error.message.includes("archive_appliance")
      ) {
        setCustomError(
          "Archive service is not updated. Please apply the v7 database script.",
        );
      } else {
        setCustomError(
          "Unable to archive appliance. Please try again.",
        );
      }

      return;
    }

    const name =
      target?.name ?? "Custom appliance";

    const moved: Appliance | null = target ?? null;

    setAppliances((current) =>
      current.filter((item) => item.id !== id),
    );

    if (moved) {
      setArchivedAppliances((current) =>
        current.some((item) => item.id === moved.id)
          ? current
          : [...current, moved].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
      );
    }

    setSelected((current) =>
      current.filter((item) => item !== id),
    );

    setDismissedCustomIds((current) =>
      current.includes(id)
        ? current
        : [...current, id],
    );

    setArchivedCount(
      (current) => current + 1,
    );

    logAppliance.archived(name);

    setSuccessMessage(
      `${name} archived.`,
    );

    setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  // ============================================================
  // UNARCHIVE CUSTOM APPLIANCE (Layer 2 -> Layer 1, unticked)
  // ============================================================
  //
  // v7 manual archive: unarchive_appliance() restores
  // (selection=false, archive=false) or raises
  // 'Appliance not found.' Strict RPC-only so a missing v7
  // migration surfaces loudly instead of silently succeeding.
  // ============================================================

  const handleCustomUnarchive = async (
    id: string,
  ) => {
    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError(
        "You must be signed in to unarchive an appliance.",
      );
      return;
    }

    const target = archivedAppliances.find(
      (item) => item.id === id,
    );

    const { error } = await supabase.rpc(
      "unarchive_appliance",
      {
        p_app_id: id,
      },
    );

    if (error) {
      console.error(
        "Custom appliance unarchive error:",
        error.message,
      );

      if (
        error.message.includes("Appliance not found")
      ) {
        setCustomError(
          "Appliance not found. It may have been deleted.",
        );
      } else if (
        error.message.includes("unarchive_appliance")
      ) {
        setCustomError(
          "Archive service is not updated. Please apply the v7 database script.",
        );
      } else {
        setCustomError(
          "Unable to unarchive appliance. Please try again.",
        );
      }

      return;
    }

    const name =
      target?.name ?? "Custom appliance";

    setArchivedAppliances((current) =>
      current.filter((item) => item.id !== id),
    );

    setArchivedCount((current) =>
      Math.max(0, current - 1),
    );

    if (target) {
      setAppliances((current) =>
        current.some((item) => item.id === target.id)
          ? current
          : [...current, target].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
      );
    }

    // Ensure restored item is unticked in Layer 1.
    setSelected((current) =>
      current.filter((item) => item !== id),
    );

    setDismissedCustomIds((current) =>
      current.filter((item) => item !== id),
    );

    logAppliance.unarchived(name);

    setSuccessMessage(
      `${name} restored.`,
    );

    setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  // ============================================================
  // OPEN CUSTOM EDITOR (EDIT MODAL)
  // ============================================================
  //
  // Opens the shared add/edit dialog prefilled with the custom
  // appliance values, using the exact same layout as adding.
  // ============================================================

  const openCustomEditor = (
    appliance: Appliance,
  ) => {
    setEditingCustom(appliance);
    setCustomName(appliance.name);

    setCustomWatts(
      appliance.watts.replace(/W$/, ""),
    );

    setCustomPhotoLocal(null);
    setCustomPhotoUrl(appliance.imageUrl ?? null);
    setCustomPhotoOriginalUrl(
      appliance.imageUrl ?? null,
    );

    setCustomError("");
    setEditModalVisible(true);
  };

  // ============================================================
  // CUSTOM PHOTO (ADD/EDIT FORM PICKER)
  // ============================================================
  //
  // One MediaPickerModal serves the add/edit form. Picks stay
  // a local draft until Add/Save persists them (upload, swap
  // the row, delete the replaced object).
  // ============================================================

  const [photoPickerVisible, setPhotoPickerVisible] =
    useState(false);

  const handlePhotoSelect = (photo: PickedPhoto) => {
    // Form draft only: persistence happens on Add/Save.
    setCustomPhotoLocal(photo);
    setPhotoPickerVisible(false);
  };

  const handlePhotoRemove = () => {
    // Clearing the draft only: the stored object is deleted
    // on Save (or kept when the form is cancelled with no
    // changes persisted).
    setCustomPhotoLocal(null);
    setCustomPhotoUrl(null);
    setPhotoPickerVisible(false);
  };

  const formPhotoPreview =
    customPhotoLocal?.uri ?? customPhotoUrl;

  const handleBoxMenuToggle = (id: string) => {
    setOpenMenuId((current) =>
      current === id ? null : id,
    );
  };

  // ============================================================
  // AREA SECTIONS
  // ============================================================

  const sections = [
    "Living Area",
    "Bedroom",
    "Kitchen Area",
    "Work/Study Area",
    "Bathroom Area",
    "Porch",
  ];

  // ============================================================
  // SEARCH FILTER
  // ============================================================

  const normalizedSearch = searchText
    .trim()
    .toLowerCase();

  // ============================================================
  // DISPLAY LIST (catalog-first, slim schema)
  // ============================================================
  //
  // Catalog always renders from GIVEN_CATALOG in code.
  // DB only holds user picks: given rows (catalog_key) for
  // selection state, custom rows for user-created items.
  // `appliances` state holds DB customs only; prop customs are
  // merged in (minus locally dismissed) so a selected custom
  // stays displayed with the catalog boxes even while the fetch
  // is pending, fails, or filtered the row out.
  // ============================================================

  const propCustomFallback = useMemo(
    () =>
      selectedAppliances.filter(
        (item) =>
          item.area === CUSTOM_AREA &&
          !dismissedCustomIds.includes(item.id),
      ),
    [selectedAppliances, dismissedCustomIds],
  );

  const mergedCustoms = useMemo(() => {
    const byId = new Map<string, Appliance>(
      appliances.map((item) => [item.id, item]),
    );

    for (const item of propCustomFallback) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    return [...byId.values()];
  }, [appliances, propCustomFallback]);

  // Derived each render so React Compiler can memoize it
  // (react-hooks/preserve-manual-memoization). Catalog is
  // module-stable and small; no manual useMemo needed.
  const displayAppliances: Appliance[] = [
    ...GIVEN_CATALOG.map(catalogToAppliance),
    ...mergedCustoms,
  ];

  const filteredAppliances =
    displayAppliances.filter(
      (appliance) =>
        !normalizedSearch ||
        appliance.name
          .toLowerCase()
          .includes(normalizedSearch),
    );

  // Customs visible in the section. Loading/empty states own
  // this list only when not searching; search results keep the
  // previous hide-when-no-match behavior.
  const customAppliances = filteredAppliances.filter(
    (item) => item.area === CUSTOM_AREA,
  );

  const showCustomStates = normalizedSearch === "";

  // ============================================================
  // LAYER 2 (ARCHIVED VIEWER) FILTER
  // ============================================================

  const normalizedArchiveSearch = archiveSearchText
    .trim()
    .toLowerCase();

  const filteredArchivedAppliances =
    archivedAppliances.filter(
      (appliance) =>
        !normalizedArchiveSearch ||
        appliance.name
          .toLowerCase()
          .includes(normalizedArchiveSearch),
    );

  const showArchivedStates =
    normalizedArchiveSearch === "";

  const openArchiveLayer = () => {
    setCustomError("");
    setArchiveSearchText("");
    setOpenMenuId(null);
    setLayer(2);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // Always refetch so Layer 2 reflects the table, not just
    // the optimistic Layer 1 state.
    void loadArchived();
  };

  const closeArchiveLayer = () => {
    setArchiveSearchText("");
    setOpenMenuId(null);
    setLayer(1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // ============================================================
  // ACTION ROW (Add Custom + Archived, Layer 1 only)
  // ============================================================
  //
  // Layer 2 has no buttons; return uses the footer Back button.
  // ============================================================

  const renderActionRow = () => (
    <View style={styles.customSection}>
      <Pressable
        onPress={handleAddOpen}
        style={({ pressed }) => [
          styles.customButton,
          styles.customButtonHalf,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add custom appliance"
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={colors.onPrimary}
        />

        <AppText
          variant="caption"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.customButtonText}
        >
          Add Custom
        </AppText>
      </Pressable>

      <Pressable
        onPress={openArchiveLayer}
        style={({ pressed }) => [
          styles.archiveRowButton,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Archived appliances, ${archivedCount} archived`}
      >
        <Ionicons
          name="archive-outline"
          size={18}
          color={colors.text}
        />

        <AppText
          variant="caption"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.archiveRowButtonText}
        >
          Archived
        </AppText>
      </Pressable>
    </View>
  );

  // ============================================================
  // SELECT ALL (UNION-VISIBLE)
  // ============================================================
  //
  // No filter: selects every catalog + custom box. Filtering:
  // adds only visible boxes, unioned with existing picks so
  // pre-search selections are never dropped. Local-only like
  // toggleAppliance — persisted on Save.
  // ============================================================

  const handleSelectAll = () => {
    const target = normalizedSearch
      ? filteredAppliances
      : displayAppliances;

    if (target.length === 0) {
      return;
    }

    setSelected((current) => [
      ...new Set([
        ...current,
        ...target.map(({ id }) => id),
      ]),
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header: Layer 1 = Select, Layer 2 = Archived viewer.
              Layer 2 has no back arrow; the title sits left and
              return uses the row/footer Back buttons. */}
          <View style={styles.header}>
            <AppText
              variant="heading"
              style={styles.title}
            >
              {layer === 2
                ? "Archived Appliances"
                : "Select Appliances"}
            </AppText>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={
                layer === 2
                  ? "Close Archived Appliances"
                  : "Close Select Appliances"
              }
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.headerContent}
              />
            </Pressable>
          </View>

          {/* Thin success banner: full-spread white strip pinned
              directly below the header, shared by both layers.
              Single text line + hairline, static while the list
              scrolls beneath. */}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#00805A"
              />

              <AppText
                variant="caption"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.successBannerText}
              >
                {successMessage}
              </AppText>
            </View>
          ) : null}

          {/* Content */}
          <ScrollView
            ref={scrollRef}
            style={styles.content}
            contentContainerStyle={
              styles.contentContainer
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Battery Advisory (Layer 1 only) */}
            {layer === 1 ? (
              <View style={styles.advisory}>
                <View style={styles.advisoryRow}>
                  <Ionicons
                    name="battery-half-outline"
                    size={24}
                    color={colors.accentContent}
                  />

                  <View style={styles.advisoryText}>
                    <AppText
                      variant="body"
                      style={styles.advisoryTitle}
                    >
                      Battery Capacity: 720 Wh
                    </AppText>

                    <AppText
                      variant="caption"
                      style={
                        styles.advisoryDescription
                      }
                    >
                      Select the appliances you want to use
                      and keep them within the available
                      energy capacity.
                    </AppText>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Search (Layer 1 only; Layer 2 has its own search below) */}
            {layer === 1 ? (
              <View style={styles.searchRow}>
                <View style={styles.searchBoxFlex}>
                  <SearchBox
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search appliances..."
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Search appliances"
                  />
                </View>
              </View>
            ) : null}

            {/* Action row Layer 1 only here; Layer 2 renders it
                below its own search box. */}
            {layer === 1 ? renderActionRow() : null}

            {/* Custom Appliances Layer 1 only (header always shows) */}
            {layer === 1 &&
              (showCustomStates ||
                customAppliances.length > 0) && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AppText
                      variant="body"
                      style={styles.sectionTitle}
                    >
                      Custom Appliances
                    </AppText>

                    <View
                      style={[
                        styles.sectionLine,
                        {
                          backgroundColor:
                            colors.border,
                        },
                      ]}
                    />
                  </View>

                  {isLoadingCustoms &&
                  showCustomStates ? (
                    <EmptyState
                      title="Loading Custom Appliances"
                      description="Fetching your custom appliances…"
                      icon="sync-outline"
                      style={styles.customState}
                    />
                  ) : customAppliances.length > 0 ? (
                    <View style={styles.grid}>
                      {customAppliances.map(
                        (appliance) => {
                          const isSelected =
                            selected.includes(
                              appliance.id,
                            );

                          return (
                            <ApplianceBox
                              key={appliance.id}
                              name={appliance.name}
                              wattage={appliance.watts}
                              color={
                                colors.primary
                              }
                              imageSource={
                                appliance.imageUrl
                                  ? {
                                      uri: appliance.imageUrl,
                                    }
                                  : undefined
                              }
                              selected={isSelected}
                              isCustom
                              menuOpen={
                                openMenuId ===
                                appliance.id
                              }
                              onMenuToggle={() =>
                                handleBoxMenuToggle(
                                  appliance.id,
                                )
                              }
                              onPress={() =>
                                toggleAppliance(
                                  appliance.id,
                                )
                              }
                              onEdit={() =>
                                openCustomEditor(
                                  appliance,
                                )
                              }
                              onDelete={() =>
                                handleCustomDelete(
                                  appliance.id,
                                )
                              }
                              onArchive={() =>
                                handleCustomArchive(
                                  appliance.id,
                                )
                              }
                            />
                          );
                        },
                      )}
                    </View>
                  ) : showCustomStates ? (
                    <EmptyState
                      title="No Custom Appliances"
                      description="You haven't added any yet. Tap Add Custom Appliance above to create one."
                      icon="cube-outline"
                      style={styles.customState}
                    />
                  ) : null}
                </View>
              )}

            {/* Appliance Categories (Layer 1 only) */}
            {layer === 1 &&
              sections.map((section) => {
                const items =
                  filteredAppliances.filter(
                    (item) =>
                      item.area === section,
                  );

                if (items.length === 0) {
                  return null;
                }

                return (
                  <View
                    key={section}
                    style={styles.section}
                  >
                    <View style={styles.sectionHeader}>
                      <AppText
                        variant="body"
                        style={styles.sectionTitle}
                      >
                        {section}
                      </AppText>

                      <View
                        style={[
                          styles.sectionLine,
                          {
                            backgroundColor:
                              areaColor(section),
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.grid}>
                      {items.map((appliance) => {
                        const isSelected =
                          selected.includes(
                            appliance.id,
                          );

                        return (
                          <ApplianceBox
                            key={appliance.id}
                            name={appliance.name}
                            wattage={appliance.watts}
                            color={areaColor(
                              appliance.area,
                            )}
                            imageSource={
                              CATALOG_IMAGES[
                                appliance.id
                              ]
                            }
                            selected={isSelected}
                            onPress={() =>
                              toggleAppliance(
                                appliance.id,
                              )
                            }
                          />
                        );
                      })}
                    </View>
                  </View>
                );
              })}

            {/* No Search Results (Layer 1 only) */}
            {layer === 1 &&
              normalizedSearch.length > 0 &&
              filteredAppliances.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons
                    name="search-outline"
                    size={28}
                    color={
                      colors.textSecondary
                    }
                  />

                  <AppText
                    variant="caption"
                    style={styles.noResultsText}
                  >
                    {`No appliances found for "${searchText.trim()}"`}
                  </AppText>
                </View>
              )}

            {/* ================= LAYER 2: ARCHIVED VIEWER ================= */}
            {layer === 2 ? (
              <>
                {/* Archived advisory */}
                <View style={styles.advisory}>
                  <View style={styles.advisoryRow}>
                    <Ionicons
                      name="archive-outline"
                      size={24}
                      color={colors.accentContent}
                    />

                    <View style={styles.advisoryText}>
                      <AppText
                        variant="body"
                        style={styles.advisoryTitle}
                      >
                        Archived Appliances
                      </AppText>

                      <AppText
                        variant="caption"
                        style={
                          styles.advisoryDescription
                        }
                      >
                        Archived customs are hidden from
                        selection. Unarchive to return them
                        to the list as unticked.
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Archived search */}
                <View style={styles.searchRow}>
                  <View style={styles.searchBoxFlex}>
                    <SearchBox
                      value={archiveSearchText}
                      onChangeText={
                        setArchiveSearchText
                      }
                      placeholder="Search archived..."
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Search archived appliances"
                    />
                  </View>
                </View>

                {/* Archived grid (same box layout, viewer-only) */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AppText
                      variant="body"
                      style={styles.sectionTitle}
                    >
                      Archived Appliances
                    </AppText>

                    <View
                      style={[
                        styles.sectionLine,
                        {
                          backgroundColor:
                            colors.border,
                        },
                      ]}
                    />
                  </View>

                  {isLoadingCustoms &&
                  showArchivedStates ? (
                    <EmptyState
                      title="Loading Archived Appliances"
                      description="Fetching your archived appliances…"
                      icon="sync-outline"
                      style={styles.customState}
                    />
                  ) : filteredArchivedAppliances.length >
                    0 ? (
                    <View style={styles.grid}>
                      {filteredArchivedAppliances.map(
                        (appliance) => (
                          <ApplianceBox
                            key={appliance.id}
                            name={appliance.name}
                            wattage={appliance.watts}
                            color={colors.primary}
                            imageSource={
                              appliance.imageUrl
                                ? {
                                    uri: appliance.imageUrl,
                                  }
                                : undefined
                            }
                            selectable={false}
                            isCustom
                            archiveVariant="unarchive"
                            menuOpen={
                              openMenuId ===
                              appliance.id
                            }
                            onMenuToggle={() =>
                              handleBoxMenuToggle(
                                appliance.id,
                              )
                            }
                            onEdit={() =>
                              openCustomEditor(
                                appliance,
                              )
                            }
                            onDelete={() =>
                              handleCustomDelete(
                                appliance.id,
                              )
                            }
                            onArchive={() =>
                              handleCustomUnarchive(
                                appliance.id,
                              )
                            }
                          />
                        ),
                      )}
                    </View>
                  ) : showArchivedStates ? (
                    <EmptyState
                      title="No Archived Appliances"
                      description="Nothing archived yet. Archived customs will appear here."
                      icon="archive-outline"
                      style={styles.customState}
                    />
                  ) : null}
                </View>

                {/* No Archived Search Results */}
                {normalizedArchiveSearch.length > 0 &&
                  filteredArchivedAppliances.length ===
                    0 && (
                    <View style={styles.noResults}>
                      <Ionicons
                        name="search-outline"
                        size={28}
                        color={
                          colors.textSecondary
                        }
                      />

                      <AppText
                        variant="caption"
                        style={styles.noResultsText}
                      >
                        {`No archived appliances found for "${archiveSearchText.trim()}"`}
                      </AppText>
                    </View>
                  )}
              </>
            ) : null}
          </ScrollView>

          {/* Footer: Layer 1 = selection actions, Layer 2 = viewer count + back */}
          {layer === 2 ? (
            <View style={styles.footer}>
              <View style={styles.selectedInfo}>
                <View
                  style={styles.selectedGroup}
                  accessibilityRole="text"
                  accessibilityLabel={`${archivedCount} appliances archived`}
                >
                  <Ionicons
                    name="archive-outline"
                    size={17}
                    color={colors.headerContent}
                  />

                  <AppText
                    variant="caption"
                    style={styles.selectedText}
                  >
                    {archivedCount} appliance
                    {archivedCount !== 1 ? "s" : ""}{" "}
                    archived
                  </AppText>
                </View>
              </View>

              <View style={styles.footerButtons}>
                <Pressable
                  onPress={closeArchiveLayer}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Back to appliances"
                >
                  <AppText
                    variant="caption"
                    style={styles.actionText}
                  >
                    Back
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.footer}>
            <View style={styles.selectedInfo}>
              <View
                style={styles.selectedGroup}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color={colors.headerContent}
                />

                <AppText
                  variant="caption"
                  style={styles.selectedText}
                >
                  {selected.length} appliance
                  {selected.length !== 1
                    ? "s"
                    : ""}{" "}
                  selected
                </AppText>
              </View>

              <View
                style={styles.selectedGroup}
                accessibilityRole="text"
                accessibilityLabel={`${archivedCount} appliances archived`}
              >
                <Ionicons
                  name="archive-outline"
                  size={17}
                  color={colors.headerContent}
                />

                <AppText
                  variant="caption"
                  style={styles.selectedText}
                >
                  {archivedCount} appliance
                  {archivedCount !== 1 ? "s" : ""}{" "}
                  archived
                </AppText>
              </View>
            </View>

            <View style={styles.footerButtons}>
              <Pressable
                onPress={handleSelectAll}
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Select all appliances"
              >
                <AppText
                  variant="caption"
                  style={styles.resetText}
                >
                  Select All
                </AppText>
              </Pressable>

              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <AppText
                  variant="caption"
                  style={styles.resetText}
                >
                  Reset
                </AppText>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={isLoadingCustoms || isSaving}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.buttonPressed,
                  (isLoadingCustoms || isSaving) &&
                    styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isSaving
                    ? "Saving appliance selection"
                    : isLoadingCustoms
                      ? "Loading custom appliances"
                      : "Save appliance selection"
                }
              >
                <AppText
                  variant="caption"
                  style={styles.actionText}
                >
                  {isSaving
                    ? "Saving..."
                    : isLoadingCustoms
                      ? "Loading..."
                      : isReset
                        ? "Save"
                        : "Add"}
                </AppText>
              </Pressable>
            </View>
            </View>
          )}
        </View>

        <CustomApplianceModal
          visible={addModalVisible}
          name={customName}
          watts={customWatts}
          error={customError}
          onNameChange={(text) => {
            setCustomName(text);
            setCustomError("");
          }}
          onWattsChange={(text) => {
            const value = text.replace(
              /[^\d.-]/g,
              "",
            );

            setCustomWatts(value);
            setCustomError("");
          }}
          onCancel={handleAddCancel}
          onAdd={handleCustomAdd}
          wattsValid={customWattsValid}
          photoPreview={formPhotoPreview}
          photoBusy={photoBusy}
          onPhotoPress={() =>
            setPhotoPickerVisible(true)
          }
        />

        <CustomApplianceModal
          visible={editModalVisible}
          mode="edit"
          name={customName}
          watts={customWatts}
          error={customError}
          onNameChange={(text) => {
            setCustomName(text);
            setCustomError("");
          }}
          onWattsChange={(text) => {
            const value = text.replace(
              /[^\d.-]/g,
              "",
            );

            setCustomWatts(value);
            setCustomError("");
          }}
          onCancel={handleEditCancel}
          onAdd={handleCustomAdd}
          onSave={handleCustomUpdate}
          wattsValid={customWattsValid}
          photoPreview={formPhotoPreview}
          photoBusy={photoBusy}
          onPhotoPress={() =>
            setPhotoPickerVisible(true)
          }
        />

        <MediaPickerModal
          visible={photoPickerVisible}
          hasPhoto={formPhotoPreview !== null}
          onSelect={handlePhotoSelect}
          onRemove={handlePhotoRemove}
          onClose={() => setPhotoPickerVisible(false)}
        />
      </View>
    </Modal>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },

  modal: {
    height: "92%",
    backgroundColor: colors.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerBackground,
  },

  title: {
    fontSize: Typography.heading,
    fontWeight: "700",
    color: colors.headerContent,
  },

  closeButton: {
    width: Touch.target,
    height: Touch.target,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: colors.background,
  },

  advisory: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: Radius.md,
    padding: 13,
    marginBottom: Spacing.lg,
  },

  advisoryRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  advisoryText: {
    flex: 1,
    marginLeft: 10,
  },

  advisoryTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 20,
  },

  advisoryDescription: {
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 3,
    fontSize: 14,
  },

  customSection: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.lg,
  },

  section: {
    marginBottom: Spacing.lg,
  },

  sectionTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 20,
  },

  sectionHeader: {
    alignSelf: "flex-start",
    marginTop: 3,
    marginBottom: Spacing.md,
  },

  sectionLine: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    marginTop: 2,
  },

  // Loading/empty state card for the custom section. Matches
  // the custom appliance box outer height (boxCustom 234) so
  // both share one silhouette, plus breathing room before the
  // next section header (stacks with the section margin).
  customState: {
    minHeight: 234,
    marginBottom: Spacing.md,
  },

  customButton: {
    minHeight: Control.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.primary,
    borderRadius: Radius.md,
  },

  customButtonText: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 14,
  },

  customButtonHalf: {
    flex: 1,
  },

  archiveRowButton: {
    flex: 1,
    minHeight: Control.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: Radius.md,
  },

  archiveRowButtonText: {
    flexShrink: 1,
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },

  grid: applianceCardGrid,

  searchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  searchBoxFlex: {
    flex: 1,
  },

  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
    gap: 8,
  },

  noResultsText: {
    color: colors.textSecondary,
    textAlign: "center",
  },

  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.headerBackground,
    backgroundColor: colors.headerBackground,
  },

  selectedInfo: {
    minHeight: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 8,
  },

  selectedGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  selectedText: {
    color: colors.headerContent,
    fontSize: 14,
  },

  footerButtons: {
    flexDirection: "row",
    gap: 8,
  },

  resetButton: {
    flex: 1,
    minHeight: Control.button,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: colors.primarySoft,
  },

  resetText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },

  actionButton: {
    flex: 1,
    minHeight: Control.button,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: colors.primarySoft,
  },

  actionText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },

  pressed: {
    opacity: 0.7,
  },

  buttonPressed: {
    backgroundColor: colors.glass.whiteStrong,
    opacity: 1,
  },

  // Thin full-spread success strip pinned directly below the
  // header (outside the scroll padding). Frozen white + frozen
  // dark-green ink so it stays readable in both themes, same
  // convention as the frozen badge scales in colors.ts. Height
  // hugs one caption line: no minHeight, single-line ellipsis.
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.lg,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },

  successBannerText: {
    flex: 1,
    color: "#14532D",
    fontWeight: "600",
  },
});