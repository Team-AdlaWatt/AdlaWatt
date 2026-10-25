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

import {
  Image as ExpoImage,
} from "expo-image";

import ElectronicsBox from "@/components/forms/ElectronicsBox";
import {
  electronicsCardGrid,
} from "@/components/forms/electronicsCard";
import CustomElectronicsModal from "@/components/forms/CustomElectronicsModal";
import MediaPickerModal, {
  type PickedPhoto,
} from "@/components/forms/MediaPickerModal";
import {
  deleteElectronicsPhotoByUrl,
  uploadElectronicsPhoto,
} from "@/services/electronicsPhotoService";
import AppText from "@/components/ui/AppText";
import EmptyState from "@/components/ui/EmptyState";
import SearchBox from "@/components/ui/SearchBox";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";

import {
  BATTERY_CAPACITY_WH,
} from "@/constants/battery";
import { Colors } from "@/constants/colors";
import {
  CATALOG_IMAGES,
  CUSTOM_AREA,
  GIVEN_CATALOG,
  type CatalogItem,
} from "@/constants/electronicsCatalog";
import { logElectronics } from "@/services/activityLogService";
import {
  useAppColors,
  type AppColors,
} from "@/hooks/useAppColors";
import { useScrollToTopController } from "@/hooks/useScrollToTopController";
import {
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { Control, Touch } from "@/constants/sizing";

import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import {
  validateCustomElectronics,
} from "@/lib/customElectronicsValidation";

type Electronics = {
  id: string;
  name: string;
  watts: string;
  area: string;
  // Stored public photo URL. Null/undefined renders the
  // bundled adlawatt icon — the default for every custom.
  imageUrl?: string | null;
};

// Session photo cache: remote custom URLs prefetched once
// per app session (module lifetime), so reopening the modal
// never re-downloads them. expo-image's memory cache holds
// the bitmaps; this set just skips redundant prefetch calls
// when the same URLs load again (reopen, layer-2 refetch).
const prefetchedPhotoUrls = new Set<string>();

function prefetchCustomPhotos(
  items: Electronics[],
): void {
  const fresh = items
    .map((item) => item.imageUrl)
    .filter(
      (url): url is string =>
        typeof url === "string" &&
        url.length > 0 &&
        !prefetchedPhotoUrls.has(url),
    );

  if (fresh.length === 0) {
    return;
  }

  for (const url of fresh) {
    prefetchedPhotoUrls.add(url);
  }

  // Fire-and-forget: rows render from cache when ready;
  // a failed prefetch just falls back to per-row loading.
  void ExpoImage.prefetch(fresh).catch(
    () => {},
  );
}

type ElectronicsModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave?: (electronics: Electronics[]) => void;
  onCustomAdd?: (electronics: Electronics) => void;
  onCustomUpdate?: (
    electronics: Electronics,
  ) => void;
  onCustomDelete?: (id: string) => void;
  selectedElectronics?: Electronics[];
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

/*
 * UI area colors
 */
const areaColors: Record<string, string> = {
  General: Colors.light.areas.general,
  "Living Area": Colors.light.areas.living,
  "Bedroom": Colors.light.areas.bedroom,
  "Kitchen Area": Colors.light.areas.kitchen,
  "Work/Study Area": Colors.light.areas.study,
  "Bathroom Area": Colors.light.areas.bathroom,
};

const getAreaColor = (
  area: string,
  fallback: string,
) =>
  areaColors[area] ?? fallback;

const catalogToElectronics = (
  item: CatalogItem,
): Electronics => ({
  id: item.key,
  name: item.name,
  watts: item.display,
  area: item.uiArea,
});

export default function ElectronicsModal({
  visible,
  onClose,
  selectedElectronics = [],
  onCustomAdd,
  onCustomUpdate,
  onCustomDelete,
  onSave,
}: ElectronicsModalProps) {
  const [selected, setSelected] = useState<
    string[]
  >([]);

  const [electronics, setElectronics] = useState<
    Electronics[]
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

  const [customError, setCustomError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // True while custom electronics are being fetched, so the
  // section can show a loading state instead of flashing empty.
  const [isLoadingCustoms, setIsLoadingCustoms] =
    useState(false);

  const [editingCustom, setEditingCustom] =
    useState<Electronics | null>(null);

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

  // Layer 1 = Add Electronics (catalog + active customs).
  // Layer 2 = Archived viewer (archive=true customs only).
  // Same shell/modal, only the content layer swaps.
  const [layer, setLayer] = useState<1 | 2>(1);

  const [archivedElectronics, setArchivedElectronics] =
    useState<Electronics[]>([]);

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

  const scrollToTop =
    useScrollToTopController(scrollRef);

  const colors = useAppColors();

  const styles = useMemo(
    () => getStyles(colors),
    [colors],
  );

  // Custom section follows the themed brand primary so it
  // stays correct in both light and dark mode.
  const areaColor = (area: string) =>
    area === CUSTOM_AREA
      ? colors.primary
      : getAreaColor(area, colors.border);

  // ============================================================
  // LOAD ELECTRONICS
  // ============================================================
  //
  // Single open wins: `seq` invalidates stale fetches, and the
  // final selection is the UNION of DB state + the prop snapshot
  // taken at open, so a slow/empty fetch can never wipe the
  // parent's selected customs.
  // ============================================================

  const loadElectronics = async (
    propSnapshot: Electronics[],
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
      setElectronics(propCustoms);
      setArchivedElectronics([]);
      setSelected(propIds);
      setArchivedCount(0);
      setIsLoadingCustoms(false);
      return;
    }

    const { data, error } = await supabase
      .from("electronics")
      .select(
        "app_id, electronics_name, type, catalog_key, wattage_min, wattage_max, selection, archive, image_url",
      )
      .eq("user_id", user.id)
      .order("electronics_name");

    if (loadSeq.current !== seq) {
      return;
    }

    if (error) {
      console.error(
        "Failed to load electronics:",
        error.message,
      );
      // Keep the prop snapshot visible instead of flashing
      // empty: selected customs must stay displayed even when
      // the fetch fails.
      const propIds = propSnapshot.map(({ id }) => id);
      const propCustoms = propSnapshot.filter(
        (item) => item.area === CUSTOM_AREA,
      );
      setElectronics((current) => {
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
    const customs: Electronics[] = rows
      .filter(
        (item) =>
          item.type === "custom" &&
          item.archive !== true,
      )
      .map((item) => ({
        id: String(item.app_id),
        name: String(item.electronics_name),
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

    const archived: Electronics[] = rows
      .filter(
        (item) =>
          item.type === "custom" &&
          item.archive === true,
      )
      .map((item) => ({
        id: String(item.app_id),
        name: String(item.electronics_name),
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

    setElectronics(customs);
    setArchivedElectronics(archived);
    setSelected([
      ...new Set([
        ...pickedCatalogKeys,
        ...selectedCustomIds,
        ...propIds,
      ]),
    ]);
    setArchivedCount(archived.length);
    setIsLoadingCustoms(false);

    // Warm the session photo cache the moment URLs are
    // known — rows then paint from memory, no reload flash.
    prefetchCustomPhotos([...customs, ...archived]);

    console.debug(
      `[ElectronicsModal] loaded rows=${rows.length} active=${customs.length} archived=${archived.length}`,
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
      setArchivedElectronics([]);
      setArchivedCount(0);
      setIsLoadingCustoms(false);
      return;
    }

    const { data, error } = await supabase
      .from("electronics")
      .select(
        "app_id, electronics_name, type, catalog_key, wattage_min, wattage_max, selection, archive, image_url",
      )
      .eq("user_id", user.id)
      .eq("type", "custom")
      .eq("archive", true)
      .order("electronics_name");

    if (loadSeq.current !== seq) {
      return;
    }

    if (error) {
      console.error(
        "Failed to load archived electronics:",
        error.message,
      );
      setCustomError(
        "Unable to load archived electronics. Please try again.",
      );
      setIsLoadingCustoms(false);
      return;
    }

    const archived: Electronics[] = (data ?? []).map(
      (item) => ({
        id: String(item.app_id),
        name: String(item.electronics_name),
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
      `[ElectronicsModal] loaded archived=${archived.length}`,
    );

    setArchivedElectronics(archived);
    setArchivedCount(archived.length);
    setIsLoadingCustoms(false);

    prefetchCustomPhotos(archived);
  };

  // ============================================================
  // MODAL STATE
  // ============================================================
  //
  // Deps are [visible] only on purpose. Depending on the
  // `selectedElectronics` array would re-run the loader mid-edit
  // (wiping toggles + search) whenever the parent re-renders
  // with a new array identity. The prop is snapshotted once per
  // open for the immediate paint + DB union above.
  // ============================================================

  useEffect(() => {
    scrollToTop.reset();

    if (visible) {
      const snapshot = selectedElectronics;

      // Immediate paint so selected customs are visible even
      // before the DB fetch resolves. loadElectronics() owns the
      // seq guard, so a slow fetch cannot overwrite a newer open
      // and closing mid-fetch invalidates it.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modal open snapshots selection + resets draft state (intentional UI sync with visible)
      setSelected(snapshot.map(({ id }) => id));
      setDismissedCustomIds([]);
      setSearchText("");
      setArchiveSearchText("");
      setLayer(1);
      setIsSaving(false);

      void loadElectronics(snapshot);

      return;
    }

    loadSeq.current += 1;
    setSelected([]);
    setSearchText("");
    setArchiveSearchText("");
    setLayer(1);
    setOpenMenuId(null);
    setArchivedElectronics([]);
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
  // TOGGLE ELECTRONICS
  // ============================================================

  const toggleElectronics = (id: string) => {
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
    setCustomError("");

    const user = await getAuthenticatedUserSafe();

    if (user) {
      const { error } = await supabase.rpc(
        "reset_appliance_selection",
      );

      if (error) {
        console.error(
          "Reset electronics selection error:",
          error.message,
        );
      }
    }

    setSelected([]);
    setCustomName("");
    setCustomWatts("");
    setEditModalVisible(false);
    setAddModalVisible(false);
    setEditingCustom(null);
    setIsReset(true);
    // Selection-only reset: clear local selection regardless of
    // RPC result so the UI always reflects the reset action.

    logElectronics.selectionReset();
  };

  // ============================================================
  // SAVE ELECTRONICS SELECTION
  // ============================================================

  const handleSave = async () => {
    if (isLoadingCustoms) {
      setCustomError(
        "Still loading your custom electronics items. Please wait a moment and try again.",
      );
      return;
    }

    if (isSaving) {
      return;
    }

    const user = await getAuthenticatedUserSafe();

    if (!user) {
      console.error("No authenticated user.");
      setCustomError("You must be signed in.");
      return;
    }

    setIsSaving(true);
    setCustomError("");

    const selectedSet = new Set(selected);

    if (selectedSet.size === 0) {
      const { error: resetError } = await supabase.rpc(
        "reset_appliance_selection",
      );

      setIsSaving(false);

      if (resetError) {
        console.error(
          "Reset electronics selection error:",
          resetError.message,
        );

        setCustomError("Unable to save electronics selection.");

        return;
      }

      setSelected([]);
      setIsReset(true);
      logElectronics.selectionReset();

      onSave?.([]);
      onClose();
      return;
    }

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
          ...electronics,
          ...selectedElectronics.filter(
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
        "Save electronics selection error:",
        saveError.message,
      );

      setCustomError(
        "Unable to save electronics selection.",
      );

      return;
    }

    const selectedItems = displayElectronics.filter(
      (item) => selected.includes(item.id),
    );

    logElectronics.selectionSaved(selectedItems.length);

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
  // ADD CUSTOM ELECTRONICS
  // ============================================================

  const handleCustomAdd = async () => {
    const validation = validateCustomElectronics(
      customName,
      customWatts,
    );

    if (!validation.valid || !validation.interval) {
      setCustomError(
        validation.message ??
          "Please check the electronics details.",
      );
      return;
    }

    const name = customName.trim();
    const interval = validation.interval;

    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError(
        "You must be signed in to add an electronics item.",
      );
      return;
    }

    const {
      data: duplicate,
      error: duplicateError,
    } = await supabase
      .from("electronics")
      .select("app_id")
      .eq("user_id", user.id)
      .eq("type", "custom")
      .ilike("electronics_name", name)
      .maybeSingle();

    if (duplicateError) {
      console.error(
        "Duplicate electronics check error:",
        duplicateError.message,
      );

      setCustomError(
        "Unable to check electronics item name.",
      );

      return;
    }

    if (duplicate) {
      setCustomError(
        "This electronics item already exists.",
      );
      return;
    }

    // Photo first: a failed upload aborts the add so no
    // row is ever created pointing at a missing object.
    let imageUrl: string | null = null;

    if (customPhotoLocal) {
      setPhotoBusy(true);

      const upload = await uploadElectronicsPhoto(
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
      .from("electronics")
      .insert({
        user_id: user.id,
        electronics_name: name,
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
        "app_id, electronics_name, wattage_min, wattage_max, image_url",
      )
      .single();

    if (error) {
      console.error(
        "Custom electronics error:",
        error.message,
      );

      setCustomError(
        "Unable to add electronics item. Please try again.",
      );

      return;
    }

    const electronics: Electronics = {
      id: String(data.app_id),
      name: String(data.electronics_name),
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

    onCustomAdd?.(electronics);

    logElectronics.added(name, electronics.watts);

    setElectronics((current) => [
      ...current,
      electronics,
    ]);

    setSelected((current) => [
      ...new Set([...current, electronics.id]),
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
  // UPDATE CUSTOM ELECTRONICS
  // ============================================================

  const handleCustomUpdate = async () => {
    if (!editingCustom) return;

    const validation = validateCustomElectronics(
      customName,
      customWatts,
    );

    if (!validation.valid || !validation.interval) {
      setCustomError(
        validation.message ??
          "Please check the electronics details.",
      );
      return;
    }

    const name = customName.trim();
    const interval = validation.interval;

    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError(
        "You must be signed in to update an electronics item.",
      );
      return;
    }

    const {
      data: duplicate,
      error: duplicateError,
    } = await supabase
      .from("electronics")
      .select("app_id")
      .eq("user_id", user.id)
      .eq("type", "custom")
      .ilike("electronics_name", name)
      .neq("app_id", editingCustom.id)
      .maybeSingle();

    if (duplicateError) {
      console.error(
        "Duplicate electronics check error:",
        duplicateError.message,
      );

      setCustomError(
        "Unable to check electronics item name.",
      );

      return;
    }

    if (duplicate) {
      setCustomError(
        "This electronics item already exists.",
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

      const upload = await uploadElectronicsPhoto(
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
      .from("electronics")
      .update({
        electronics_name: name,
        wattage_min: interval.min,
        wattage_max: interval.max,
        image_url: finalImageUrl,
      })
      .eq("app_id", editingCustom.id)
      .eq("user_id", user.id)
      .eq("type", "custom")
      .select(
        "app_id, electronics_name, wattage_min, wattage_max, image_url",
      )
      .single();

    if (error) {
      console.error(
        "Custom electronics update error:",
        error.message,
      );

      setCustomError(
        "Unable to update electronics item. Please try again.",
      );

      return;
    }

    const updated: Electronics = {
      id: String(data.app_id),
      name: String(data.electronics_name),
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
      void deleteElectronicsPhotoByUrl(
        customPhotoOriginalUrl,
      ).catch(() => {});
    }

    setElectronics((current) =>
      current.map((item) =>
        item.id === updated.id
          ? updated
          : item,
      ),
    );

    // Edit works from either layer; keep both lists in sync.
    setArchivedElectronics((current) =>
      current.map((item) =>
        item.id === updated.id
          ? updated
          : item,
      ),
    );

    onCustomUpdate?.(updated);

    logElectronics.updated(name);

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
  // DELETE CUSTOM ELECTRONICS
  // ============================================================

  const handleCustomDelete = async (
    id: string,
  ) => {
    const user = await getAuthenticatedUserSafe();

    if (!user) {
      setCustomError(
        "You must be signed in to delete an electronics item.",
      );
      return;
    }

    const { error } = await supabase
      .from("electronics")
      .delete()
      .eq("app_id", id)
      .eq("user_id", user.id)
      .eq("type", "custom");

    if (error) {
      console.error(
        "Custom electronics delete error:",
        error.message,
      );

      setCustomError(
        "Unable to delete electronics item. Please try again.",
      );

      return;
    }

    const removed =
      electronics.find((item) => item.id === id) ??
      archivedElectronics.find((item) => item.id === id);

    // Deleting the row orphans its photo: remove the stored
    // object best-effort. Never fails the delete itself.
    const removedImageUrl = removed?.imageUrl ?? null;

    if (removedImageUrl) {
      void deleteElectronicsPhotoByUrl(
        removedImageUrl,
      ).catch(() => {});
    }

    const wasArchived = archivedElectronics.some(
      (item) => item.id === id,
    );

    setElectronics((current) =>
      current.filter((item) => item.id !== id),
    );

    setArchivedElectronics((current) =>
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

    logElectronics.removed(
      removed?.name ?? "Custom electronics item",
    );

    onCustomDelete?.(id);
  };

  // ============================================================
  // ARCHIVE CUSTOM ELECTRONICS (Layer 1 -> Layer 2)
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
        "You must be signed in to archive an electronics item.",
      );
      return;
    }

    // The row may be rendered from the prop fallback merge
    // (DB fetch pending) rather than `electronics` state, so look
    // in both places. Otherwise archiving a prop-fallback row
    // would vanish from Layer 1 without ever reaching Layer 2.
    const target =
      electronics.find((item) => item.id === id) ??
      selectedElectronics.find(
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
        "Custom electronics archive error:",
        error.message,
      );

      if (
        error.message.includes("Appliance not found")
      ) {
        setCustomError(
          "Electronics item not found. It may have been deleted.",
        );
      } else if (
        error.message.includes("archive_appliance")
      ) {
        setCustomError(
          "Archive service is not updated. Please apply the v7 database script.",
        );
      } else {
        setCustomError(
          "Unable to archive electronics item. Please try again.",
        );
      }

      return;
    }

    const name =
      target?.name ?? "Custom electronics item";

    const moved: Electronics | null = target ?? null;

    setElectronics((current) =>
      current.filter((item) => item.id !== id),
    );

    if (moved) {
      setArchivedElectronics((current) =>
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

    logElectronics.archived(name);

    setSuccessMessage(
      `${name} archived.`,
    );

    setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  // ============================================================
  // UNARCHIVE CUSTOM ELECTRONICS (Layer 2 -> Layer 1, unticked)
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
        "You must be signed in to unarchive an electronics item.",
      );
      return;
    }

    const target = archivedElectronics.find(
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
        "Custom electronics unarchive error:",
        error.message,
      );

      if (
        error.message.includes("Appliance not found")
      ) {
        setCustomError(
          "Electronics item not found. It may have been deleted.",
        );
      } else if (
        error.message.includes("unarchive_appliance")
      ) {
        setCustomError(
          "Archive service is not updated. Please apply the v7 database script.",
        );
      } else {
        setCustomError(
          "Unable to unarchive electronics item. Please try again.",
        );
      }

      return;
    }

    const name =
      target?.name ?? "Custom electronics item";

    setArchivedElectronics((current) =>
      current.filter((item) => item.id !== id),
    );

    setArchivedCount((current) =>
      Math.max(0, current - 1),
    );

    if (target) {
      setElectronics((current) =>
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

    logElectronics.unarchived(name);

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
  // electronics values, using the exact same layout as adding.
  // ============================================================

  const openCustomEditor = (
    electronics: Electronics,
  ) => {
    setEditingCustom(electronics);
    setCustomName(electronics.name);

    setCustomWatts(
      electronics.watts.replace(/W$/, ""),
    );

    setCustomPhotoLocal(null);
    setCustomPhotoUrl(electronics.imageUrl ?? null);
    setCustomPhotoOriginalUrl(
      electronics.imageUrl ?? null,
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
    "General",
    "Living Area",
    "Bedroom",
    "Kitchen Area",
    "Work/Study Area",
    "Bathroom Area",
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
  // `electronics` state holds DB customs only; prop customs are
  // merged in (minus locally dismissed) so a selected custom
  // stays displayed with the catalog boxes even while the fetch
  // is pending, fails, or filtered the row out.
  // ============================================================

  const propCustomFallback = useMemo(
    () =>
      selectedElectronics.filter(
        (item) =>
          item.area === CUSTOM_AREA &&
          !dismissedCustomIds.includes(item.id),
      ),
    [selectedElectronics, dismissedCustomIds],
  );

  const mergedCustoms = useMemo(() => {
    const byId = new Map<string, Electronics>(
      electronics.map((item) => [item.id, item]),
    );

    for (const item of propCustomFallback) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    return [...byId.values()];
  }, [electronics, propCustomFallback]);

  // Derived each render so React Compiler can memoize it
  // (react-hooks/preserve-manual-memoization). Catalog is
  // module-stable and small; no manual useMemo needed.
  const displayElectronics: Electronics[] = [
    ...GIVEN_CATALOG.map(catalogToElectronics),
    ...mergedCustoms,
  ];

  const filteredElectronics =
    displayElectronics.filter(
      (electronics) =>
        !normalizedSearch ||
        electronics.name
          .toLowerCase()
          .includes(normalizedSearch),
    );

  // Customs visible in the section. Loading/empty states own
  // this list only when not searching; search results keep the
  // previous hide-when-no-match behavior.
  const customElectronics = filteredElectronics.filter(
    (item) => item.area === CUSTOM_AREA,
  );

  const showCustomStates = normalizedSearch === "";

  // ============================================================
  // LAYER 2 (ARCHIVED VIEWER) FILTER
  // ============================================================

  const normalizedArchiveSearch = archiveSearchText
    .trim()
    .toLowerCase();

  const filteredArchivedElectronics =
    archivedElectronics.filter(
      (electronics) =>
        !normalizedArchiveSearch ||
        electronics.name
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
    scrollToTop.reset();
    // Always refetch so Layer 2 reflects the table, not just
    // the optimistic Layer 1 state.
    void loadArchived();
  };

  const closeArchiveLayer = () => {
    setArchiveSearchText("");
    setOpenMenuId(null);
    setLayer(1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollToTop.reset();
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
        accessibilityLabel="Add custom electronics item"
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
        accessibilityLabel={`Archived electronics, ${archivedCount} archived`}
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
  // toggleElectronics — persisted on Save.
  // ============================================================

  const handleSelectAll = () => {
    const target = normalizedSearch
      ? filteredElectronics
      : displayElectronics;

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
                ? "Archived Electronics"
                : "Select Electronics"}
            </AppText>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={
                layer === 2
                  ? "Close Archived Electronics"
                  : "Close Select Electronics"
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
          <View style={styles.contentShell}>
            <ScrollView
              ref={scrollRef}
              style={styles.content}
              contentContainerStyle={
                styles.contentContainer
              }
              showsVerticalScrollIndicator={false}
              onScroll={scrollToTop.reportScroll}
              scrollEventThrottle={16}
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
                      Battery Capacity:{" "}
                      {BATTERY_CAPACITY_WH} Wh
                    </AppText>

                    <AppText
                      variant="caption"
                      style={
                        styles.advisoryDescription
                      }
                    >
                      Select the electronics you want to use
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
                    placeholder="Search electronics..."
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Search electronics"
                  />
                </View>
              </View>
            ) : null}

            {/* Action row Layer 1 only here; Layer 2 renders it
                below its own search box. */}
            {layer === 1 ? renderActionRow() : null}

            {/* Custom Electronics Layer 1 only (header always shows) */}
            {layer === 1 &&
              (showCustomStates ||
                customElectronics.length > 0) && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AppText
                      variant="body"
                      style={styles.sectionTitle}
                    >
                      Custom Electronics
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
                      title="Loading Custom Electronics"
                      description="Fetching your custom electronics…"
                      icon="sync-outline"
                      style={styles.customState}
                    />
                  ) : customElectronics.length > 0 ? (
                    <View style={styles.grid}>
                      {customElectronics.map(
                        (electronics) => {
                          const isSelected =
                            selected.includes(
                              electronics.id,
                            );

                          return (
                            <ElectronicsBox
                              key={electronics.id}
                              name={electronics.name}
                              wattage={electronics.watts}
                              color={
                                colors.primary
                              }
                              imageSource={
                                electronics.imageUrl
                                  ? {
                                      uri: electronics.imageUrl,
                                    }
                                  : undefined
                              }
                              selected={isSelected}
                              isCustom
                              menuOpen={
                                openMenuId ===
                                electronics.id
                              }
                              onMenuToggle={() =>
                                handleBoxMenuToggle(
                                  electronics.id,
                                )
                              }
                              onPress={() =>
                                toggleElectronics(
                                  electronics.id,
                                )
                              }
                              onEdit={() =>
                                openCustomEditor(
                                  electronics,
                                )
                              }
                              onDelete={() =>
                                handleCustomDelete(
                                  electronics.id,
                                )
                              }
                              onArchive={() =>
                                handleCustomArchive(
                                  electronics.id,
                                )
                              }
                            />
                          );
                        },
                      )}
                    </View>
                  ) : showCustomStates ? (
                    <EmptyState
                      title="No Custom Electronics"
                      description="You haven't added any yet. Tap Add Custom above to create one."
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
                  filteredElectronics.filter(
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
                      {items.map((electronics) => {
                        const isSelected =
                          selected.includes(
                            electronics.id,
                          );

                        return (
                          <ElectronicsBox
                            key={electronics.id}
                            name={electronics.name}
                            wattage={electronics.watts}
                            color={areaColor(
                              electronics.area,
                            )}
                            imageSource={
                              CATALOG_IMAGES[
                                electronics.id
                              ]
                            }
                            selected={isSelected}
                            onPress={() =>
                              toggleElectronics(
                                electronics.id,
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
              filteredElectronics.length === 0 && (
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
                    {`No electronics found for "${searchText.trim()}"`}
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
                        Archived Electronics
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
                      accessibilityLabel="Search archived electronics"
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
                      Archived Electronics
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
                      title="Loading Archived Electronics"
                      description="Fetching your archived electronics…"
                      icon="sync-outline"
                      style={styles.customState}
                    />
                  ) : filteredArchivedElectronics.length >
                    0 ? (
                    <View style={styles.grid}>
                      {filteredArchivedElectronics.map(
                        (electronics) => (
                          <ElectronicsBox
                            key={electronics.id}
                            name={electronics.name}
                            wattage={electronics.watts}
                            color={colors.primary}
                            imageSource={
                              electronics.imageUrl
                                ? {
                                    uri: electronics.imageUrl,
                                  }
                                : undefined
                            }
                            selectable={false}
                            isCustom
                            archiveVariant="unarchive"
                            menuOpen={
                              openMenuId ===
                              electronics.id
                            }
                            onMenuToggle={() =>
                              handleBoxMenuToggle(
                                electronics.id,
                              )
                            }
                            onEdit={() =>
                              openCustomEditor(
                                electronics,
                              )
                            }
                            onDelete={() =>
                              handleCustomDelete(
                                electronics.id,
                              )
                            }
                            onArchive={() =>
                              handleCustomUnarchive(
                                electronics.id,
                              )
                            }
                          />
                        ),
                      )}
                    </View>
                  ) : showArchivedStates ? (
                    <EmptyState
                      title="No Archived Electronics"
                      description="Nothing archived yet. Archived customs will appear here."
                      icon="archive-outline"
                      style={styles.customState}
                    />
                  ) : null}
                </View>

                {/* No Archived Search Results */}
                {normalizedArchiveSearch.length > 0 &&
                  filteredArchivedElectronics.length ===
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
                        {`No archived electronics found for "${archiveSearchText.trim()}"`}
                      </AppText>
                    </View>
                  )}
              </>
            ) : null}
            </ScrollView>

            <ScrollToTopButton
              enabled={scrollToTop.enabled}
              onPress={scrollToTop.scrollToTop}
              rightOffset={Spacing.lg}
              bottomOffset={Spacing.md}
            />
          </View>

          {/* Footer: Layer 1 = selection actions, Layer 2 = viewer count + back */}
          {layer === 2 ? (
            <View style={styles.footer}>
              <View style={styles.selectedInfo}>
                <View
                  style={styles.selectedGroup}
                  accessibilityRole="text"
                  accessibilityLabel={`${archivedCount} electronics archived`}
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
                    {archivedCount} electronics
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
                  accessibilityLabel="Back to electronics"
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
                  {selected.length} electronics
                  {selected.length !== 1
                    ? "s"
                    : ""}{" "}
                  selected
                </AppText>
              </View>

              <View
                style={styles.selectedGroup}
                accessibilityRole="text"
                accessibilityLabel={`${archivedCount} electronics archived`}
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
                  {archivedCount} electronics
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
                accessibilityLabel="Select all electronics"
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
                    ? "Saving electronics selection"
                    : isLoadingCustoms
                      ? "Loading custom electronics"
                      : "Save electronics selection"
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

        <CustomElectronicsModal
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
          photoPreview={formPhotoPreview}
          photoBusy={photoBusy}
          onPhotoPress={() =>
            setPhotoPickerVisible(true)
          }
        />

        <CustomElectronicsModal
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

  contentShell: {
    flex: 1,
    position: "relative",
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

  // Loading/empty state card for the custom section only. The
  // fixed height overrides EmptyState's base 90% height so the
  // card cannot stretch during loading. It matches the custom
  // box silhouette (234) plus breathing room before the next
  // section header (stacks with the section margin). Do not use
  // this style for the electronics card grid.
  customState: {
    height: 234,
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

  grid: electronicsCardGrid,

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