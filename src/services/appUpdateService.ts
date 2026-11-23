import { Platform } from "react-native";

export type AppUpdateResult =
  | "downloaded"
  | "up_to_date"
  | "unavailable";

interface UpdatesModule {
  checkForUpdateAsync(): Promise<{
    isAvailable: boolean;
  }>;
  fetchUpdateAsync(): Promise<{ isNew: boolean }>;
}

interface ReloadableUpdatesModule
  extends UpdatesModule {
  reloadAsync(): Promise<void>;
}

let inFlight: Promise<AppUpdateResult> | null = null;
let reloadInFlight: Promise<void> | null = null;

export async function checkAndFetchUpdate(
  updates: UpdatesModule,
): Promise<AppUpdateResult> {
  const { isAvailable } =
    await updates.checkForUpdateAsync();

  if (!isAvailable) {
    return "up_to_date";
  }

  const { isNew } = await updates.fetchUpdateAsync();

  return isNew ? "downloaded" : "up_to_date";
}

export async function checkFetchApplyUpdate(
  updates: ReloadableUpdatesModule,
): Promise<AppUpdateResult> {
  const result = await checkAndFetchUpdate(updates);

  if (result === "downloaded") {
    await updates.reloadAsync();
  }

  return result;
}

function canUseUpdates(): boolean {
  return !__DEV__ && Platform.OS !== "web";
}

export function checkForAppUpdate(): Promise<AppUpdateResult> {
  if (!canUseUpdates()) {
    return Promise.resolve("unavailable");
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = import("expo-updates")
    .then((Updates) =>
      checkAndFetchUpdate(Updates),
    )
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function checkFetchApplyAppUpdate(): Promise<AppUpdateResult> {
  if (!canUseUpdates()) {
    return Promise.resolve("unavailable");
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = import("expo-updates")
    .then((Updates) =>
      checkFetchApplyUpdate(Updates),
    )
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function applyDownloadedAppUpdate(): Promise<void> {
  if (!canUseUpdates()) {
    return Promise.resolve();
  }

  if (reloadInFlight) {
    return reloadInFlight;
  }

  reloadInFlight = import("expo-updates")
    .then((Updates) => Updates.reloadAsync())
    .finally(() => {
      reloadInFlight = null;
    });

  return reloadInFlight;
}
