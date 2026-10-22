import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";

import {
  GIVEN_CATALOG,
  resolveRow,
  levelFromWatts,
  type ElectronicsRow,
  type ResolvedElectronics,
} from "@/constants/electronicsCatalog";

// v5 schema select: user picks only. Catalog wattage/area
// come from GIVEN_CATALOG in code, never from these columns.
// Both givens and customs carry wattage_min/max (numeric).
const COLUMNS =
  "app_id, electronics_name, type, catalog_key, wattage_min, wattage_max, selection, archive, user_id, image_url";

type DbRow = Record<string, unknown>;

const toElectronicsRow = (row: DbRow): ElectronicsRow => ({
  app_id: String(row.app_id ?? ""),
  electronics_name: String(row.electronics_name ?? ""),
  type:
    typeof row.type === "string" ? row.type : null,
  catalog_key:
    typeof row.catalog_key === "string"
      ? row.catalog_key
      : null,
  wattage_min:
    row.wattage_min === null || row.wattage_min === undefined
      ? null
      : (row.wattage_min as number | string),
  wattage_max:
    row.wattage_max === null || row.wattage_max === undefined
      ? null
      : (row.wattage_max as number | string),
  selection:
    typeof row.selection === "boolean"
      ? row.selection
      : null,
  archive:
    typeof row.archive === "boolean"
      ? row.archive
      : null,
  user_id:
    typeof row.user_id === "string"
      ? row.user_id
      : null,
  image_url:
    typeof row.image_url === "string"
      ? row.image_url
      : null,
});

// Whole list for the modal: full catalog + user's customs.
// Catalog selected state comes from DB picks by catalog_key.
export function buildDisplayElectronics(
  rows: ElectronicsRow[],
): ResolvedElectronics[] {
  const pickedKeys = new Set(
    rows
      .filter((row) => row.catalog_key)
      .map((row) => row.catalog_key as string),
  );
  const pickedNames = new Set(
    rows.map((row) =>
      row.electronics_name.trim().toLowerCase(),
    ),
  );

  const catalog: ResolvedElectronics[] = GIVEN_CATALOG.map(
    (item) => {
      const picked =
        pickedKeys.has(item.key) ||
        pickedNames.has(
          item.name.trim().toLowerCase(),
        );
      const match = rows.find(
        (row) =>
          row.catalog_key === item.key ||
          row.electronics_name.trim().toLowerCase() ===
            item.name.trim().toLowerCase(),
      );

      return {
        id: item.key,
        name: item.name,
        source: "catalog" as const,
        wattMin: item.wattMin,
        wattMax: item.wattMax,
        display: item.display,
        area: item.uiArea,
        level: levelFromWatts(item.wattMax),
        selected: match ? (match.selection ?? picked) : picked,
        appId: match?.app_id ?? null,
      };
    },
  );

  const customs = rows
    .filter((row) => {
      if (row.type === "custom") {
        return true;
      }

      // Defensive: rows without catalog_key that are not
      // givens and whose name is not in the catalog.
      if (!row.catalog_key && row.type !== "given") {
        const name = row.electronics_name
          .trim()
          .toLowerCase();
        return !GIVEN_CATALOG.some(
          (item) =>
            item.name.trim().toLowerCase() === name,
        );
      }

      return false;
    })
    .map(resolveRow)
    .filter(
      (item): item is ResolvedElectronics => item !== null,
    );

  return [...catalog, ...customs];
}

const fetchRows = async (): Promise<ElectronicsRow[]> => {
  const user = await getAuthenticatedUserSafe();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("electronics")
    .select(COLUMNS)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  return ((data ?? []) as DbRow[]).map(toElectronicsRow);
};

// Modal list: catalog + customs with selection state.
export async function loadElectronics(): Promise<
  ResolvedElectronics[]
> {
  return buildDisplayElectronics(await fetchRows());
}

// Readers: only currently selected (catalog picks +
// selected customs).
export async function fetchSelectedElectronics(): Promise<
  ResolvedElectronics[]
> {
  const rows = await fetchRows();

  return rows
    .filter((row) => {
      if (row.catalog_key) {
        return true;
      }

      if (row.type === "given") {
        return row.selection === true;
      }

      return (
        row.type === "custom" && row.selection === true
      );
    })
    .map(resolveRow)
    .filter(
      (item): item is ResolvedElectronics => item !== null,
    )
    .filter((item) => {
      if (item.source === "catalog") {
        return true;
      }

      return item.selected;
    });
}
