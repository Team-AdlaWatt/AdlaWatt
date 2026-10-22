// ============================================================
// ELECTRONICS CATALOG (code copy of SQL §7 inserts)
// ============================================================
//
// Single source for predefined electronics. Readers
// (ElectronicsModal, electronics screen, recommendations,
// notifications) import from here — never from a component
// file. Display stays "min-maxW" to keep parseWattageRange +
// validators working. Keys are namespaced catalog: and must
// never be renamed after release (DB rows reference them).
// ============================================================

export type CatalogItem = {
  key: string;
  name: string;
  wattMin: number;
  wattMax: number;
  display: string;
  uiArea: string;
};

export const catalogDisplay = (
  min: number,
  max: number,
): string => `${min}-${max}W`;

export const GIVEN_CATALOG: CatalogItem[] = [
  // General
  { key: "catalog:general:led-light-bulb", name: "LED Light Bulb", wattMin: 3, wattMax: 18, display: catalogDisplay(3, 18), uiArea: "General" },
  { key: "catalog:general:stand-fan", name: "Stand Fan", wattMin: 35, wattMax: 75, display: catalogDisplay(35, 75), uiArea: "General" },
  { key: "catalog:general:exhaust-fan", name: "Exhaust Fan", wattMin: 10, wattMax: 45, display: catalogDisplay(10, 45), uiArea: "General" },
  { key: "catalog:general:wifi-router", name: "Wi-Fi Router", wattMin: 5, wattMax: 20, display: catalogDisplay(5, 20), uiArea: "General" },
  { key: "catalog:general:smartphone-fast-charger", name: "Smartphone Fast Charger", wattMin: 10, wattMax: 33, display: catalogDisplay(10, 33), uiArea: "General" },
  { key: "catalog:general:rechargeable-emergency-light", name: "Rechargeable Emergency Light", wattMin: 3, wattMax: 15, display: catalogDisplay(3, 15), uiArea: "General" },
  // Living Area
  { key: "catalog:living:led-smart-tv", name: "LED Smart TV (32 to 43 inch)", wattMin: 30, wattMax: 80, display: catalogDisplay(30, 80), uiArea: "Living Area" },
  { key: "catalog:living:digital-tv-set-top-box", name: "Digital TV Set-Top Box", wattMin: 5, wattMax: 15, display: catalogDisplay(5, 15), uiArea: "Living Area" },
  { key: "catalog:living:portable-bluetooth-speaker", name: "Portable Bluetooth Speaker", wattMin: 3, wattMax: 20, display: catalogDisplay(3, 20), uiArea: "Living Area" },
  { key: "catalog:living:desk-fan", name: "Desk Fan", wattMin: 25, wattMax: 45, display: catalogDisplay(25, 45), uiArea: "Living Area" },
  { key: "catalog:living:mini-led-projector", name: "Mini LED Projector", wattMin: 20, wattMax: 80, display: catalogDisplay(20, 80), uiArea: "Living Area" },
  // Bedroom
  { key: "catalog:bedroom:clip-fan", name: "Clip Fan", wattMin: 10, wattMax: 40, display: catalogDisplay(10, 40), uiArea: "Bedroom" },
  { key: "catalog:bedroom:rechargeable-handheld-fan", name: "Rechargeable Handheld Fan", wattMin: 2, wattMax: 10, display: catalogDisplay(2, 10), uiArea: "Bedroom" },
  { key: "catalog:bedroom:tablet-charger", name: "Tablet Charger", wattMin: 10, wattMax: 30, display: catalogDisplay(10, 30), uiArea: "Bedroom" },
  { key: "catalog:bedroom:led-night-light", name: "LED Night Light", wattMin: 0.5, wattMax: 5, display: catalogDisplay(0.5, 5), uiArea: "Bedroom" },
  { key: "catalog:bedroom:electric-mosquito-swatter", name: "Electric Mosquito Swatter", wattMin: 1, wattMax: 5, display: catalogDisplay(1, 5), uiArea: "Bedroom" },
  // Kitchen Area
  { key: "catalog:kitchen:small-inverter-refrigerator", name: "Small Inverter Refrigerator", wattMin: 40, wattMax: 120, display: catalogDisplay(40, 120), uiArea: "Kitchen Area" },
  { key: "catalog:kitchen:small-rice-cooker", name: "Small Rice Cooker", wattMin: 200, wattMax: 500, display: catalogDisplay(200, 500), uiArea: "Kitchen Area" },
  { key: "catalog:kitchen:mini-electric-multi-cooker", name: "Mini Electric Multi-Cooker", wattMin: 300, wattMax: 700, display: catalogDisplay(300, 700), uiArea: "Kitchen Area" },
  { key: "catalog:kitchen:basic-kitchen-blender", name: "Basic Kitchen Blender", wattMin: 200, wattMax: 500, display: catalogDisplay(200, 500), uiArea: "Kitchen Area" },
  { key: "catalog:kitchen:tabletop-cold-water-dispenser", name: "Tabletop Cold Water Dispenser", wattMin: 50, wattMax: 100, display: catalogDisplay(50, 100), uiArea: "Kitchen Area" },
  { key: "catalog:kitchen:rechargeable-water-dispenser-pump", name: "Rechargeable Water Dispenser Pump", wattMin: 1, wattMax: 5, display: catalogDisplay(1, 5), uiArea: "Kitchen Area" },
  // Work/Study Area
  { key: "catalog:work:laptop-charger", name: "Laptop Charger", wattMin: 30, wattMax: 65, display: catalogDisplay(30, 65), uiArea: "Work/Study Area" },
  { key: "catalog:work:led-study-desk-lamp", name: "LED Study Desk Lamp", wattMin: 3, wattMax: 12, display: catalogDisplay(3, 12), uiArea: "Work/Study Area" },
  { key: "catalog:work:basic-inkjet-printer", name: "Basic Inkjet Printer", wattMin: 10, wattMax: 30, display: catalogDisplay(10, 30), uiArea: "Work/Study Area" },
  { key: "catalog:work:power-bank-charger", name: "Power Bank Charger", wattMin: 10, wattMax: 30, display: catalogDisplay(10, 30), uiArea: "Work/Study Area" },
  { key: "catalog:work:wireless-earbuds-charging-case", name: "Wireless Earbuds Charging Case", wattMin: 2, wattMax: 5, display: catalogDisplay(2, 5), uiArea: "Work/Study Area" },
  // Bathroom Area
  { key: "catalog:bath:twin-tub-washing-machine", name: "Twin-Tub Washing Machine", wattMin: 120, wattMax: 400, display: catalogDisplay(120, 400), uiArea: "Bathroom Area" },
  { key: "catalog:bath:rechargeable-hair-clipper", name: "Rechargeable Hair Clipper", wattMin: 3, wattMax: 10, display: catalogDisplay(3, 10), uiArea: "Bathroom Area" },
];

export const CATALOG_BY_KEY = new Map(
  GIVEN_CATALOG.map((item) => [item.key, item]),
);

export const CATALOG_BY_NAME = new Map(
  GIVEN_CATALOG.map((item) => [
    item.name.trim().toLowerCase(),
    item,
  ]),
);

export const CUSTOM_AREA = "Custom Electronics";

export type ElectronicsLevel = "low" | "moderate" | "high";

export const levelFromWatts = (
  watts: number,
): ElectronicsLevel =>
  watts <= 240 ? "low" : watts <= 480 ? "moderate" : "high";

export type ElectronicsRow = {
  app_id: string;
  electronics_name: string;
  type?: string | null;
  catalog_key?: string | null;
  wattage_min?: number | string | null;
  wattage_max?: number | string | null;
  selection?: boolean | null;
  archive?: boolean | null;
  user_id?: string | null;
  image_url?: string | null;
};

export type ResolvedElectronics = {
  id: string;
  name: string;
  source: "catalog" | "custom";
  wattMin: number;
  wattMax: number;
  display: string;
  area: string;
  level: ElectronicsLevel;
  selected: boolean;
  appId?: string | null;
  imageUrl?: string | null;
};

export function resolveRow(
  row: ElectronicsRow,
): ResolvedElectronics | null {
  const catalogKey =
    row.catalog_key?.trim() || null;

  if (row.type === "given" || catalogKey) {
    const byKey = catalogKey
      ? CATALOG_BY_KEY.get(catalogKey)
      : undefined;
    const byName = CATALOG_BY_NAME.get(
      row.electronics_name.trim().toLowerCase(),
    );
    const item = byKey ?? byName;

    if (!item) {
      return null;
    }

    return {
      id: item.key,
      name: item.name,
      source: "catalog",
      wattMin: item.wattMin,
      wattMax: item.wattMax,
      display: item.display,
      area: item.uiArea,
      level: levelFromWatts(item.wattMax),
      selected: row.selection ?? true,
      appId: row.app_id ?? null,
    };
  }

  const colMinRaw = Number(row.wattage_min);
  const colMaxRaw = Number(row.wattage_max);
  const colMin =
    Number.isFinite(colMinRaw) && colMinRaw > 0
      ? colMinRaw
      : null;
  const colMax =
    Number.isFinite(colMaxRaw) && colMaxRaw > 0
      ? colMaxRaw
      : null;

  if (
    colMin === null ||
    colMax === null ||
    colMax < colMin
  ) {
    return null;
  }

  return {
    id: String(row.app_id),
    name: row.electronics_name,
    source: "custom",
    wattMin: colMin,
    wattMax: colMax,
    display: catalogDisplay(colMin, colMax),
    area: CUSTOM_AREA,
    level: levelFromWatts(colMax),
    selected: row.selection ?? false,
    appId: row.app_id ?? null,
    imageUrl:
      typeof row.image_url === "string"
        ? row.image_url
        : null,
  };
}

export const CATALOG_IMAGES: Record<string, number> = {
  "catalog:general:led-light-bulb": require("@/assets/images/appliances/bulb.png"),
  "catalog:general:stand-fan": require("@/assets/images/appliances/stand-fan.png"),
  "catalog:general:exhaust-fan": require("@/assets/images/appliances/green-exhaust-fan.png"),
  "catalog:general:wifi-router": require("@/assets/images/appliances/router.png"),
  "catalog:general:smartphone-fast-charger": require("@/assets/images/appliances/green-charger.png"),
  "catalog:general:rechargeable-emergency-light": require("@/assets/images/appliances/green-emergency-light.png"),
  "catalog:living:led-smart-tv": require("@/assets/images/appliances/led-tv.png"),
  "catalog:living:digital-tv-set-top-box": require("@/assets/images/appliances/tv-box.png"),
  "catalog:living:portable-bluetooth-speaker": require("@/assets/images/appliances/speaker.png"),
  "catalog:living:mini-led-projector": require("@/assets/images/appliances/mini-projector.png"),
  "catalog:living:desk-fan": require("@/assets/images/appliances/desk-fan.png"),
  "catalog:bedroom:clip-fan": require("@/assets/images/appliances/clip-fan.png"),
  "catalog:bedroom:tablet-charger": require("@/assets/images/appliances/charger.png"),
  "catalog:bedroom:led-night-light": require("@/assets/images/appliances/night-light.png"),
  "catalog:bedroom:electric-mosquito-swatter": require("@/assets/images/appliances/swatter.png"),
  "catalog:bedroom:rechargeable-handheld-fan": require("@/assets/images/appliances/handheld-fan.png"),
  "catalog:kitchen:small-inverter-refrigerator": require("@/assets/images/appliances/refrigerator.png"),
  "catalog:kitchen:small-rice-cooker": require("@/assets/images/appliances/rice-cooker.png"),
  "catalog:kitchen:mini-electric-multi-cooker": require("@/assets/images/appliances/multi-cooker.png"),
  "catalog:kitchen:basic-kitchen-blender": require("@/assets/images/appliances/blender.png"),
  "catalog:kitchen:tabletop-cold-water-dispenser": require("@/assets/images/appliances/water-dispenser.png"),
  "catalog:kitchen:rechargeable-water-dispenser-pump": require("@/assets/images/appliances/water-dispenser-pump.png"),
  "catalog:work:laptop-charger": require("@/assets/images/appliances/laptop-charger.png"),
  "catalog:work:led-study-desk-lamp": require("@/assets/images/appliances/desk-lamp.png"),
  "catalog:work:basic-inkjet-printer": require("@/assets/images/appliances/printer.png"),
  "catalog:work:power-bank-charger": require("@/assets/images/appliances/power-bank-charger.png"),
  "catalog:work:wireless-earbuds-charging-case": require("@/assets/images/appliances/earbuds-charging-case.png"),
  "catalog:bath:twin-tub-washing-machine": require("@/assets/images/appliances/washing-machine.png"),
  "catalog:bath:rechargeable-hair-clipper": require("@/assets/images/appliances/hair-clipper.png"),
};

// Aliases for callers that use the new naming.
export const GIVEN_ELECTRONICS = GIVEN_CATALOG;
export const ELECTRONICS_BY_KEY = CATALOG_BY_KEY;
export const ELECTRONICS_BY_NAME = CATALOG_BY_NAME;
