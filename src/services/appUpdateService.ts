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

let inFlight: Promise<AppUpdateResult> | null = null;

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

export function checkForAppUpdate(): Promise<AppUpdateResult> {
  if (__DEV__ || Platform.OS === "web") {
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
