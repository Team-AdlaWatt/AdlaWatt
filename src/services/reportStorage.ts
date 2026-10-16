// ============================================================
// ADLAWATT REPORT STORAGE (Android public Download folder)
//
// Exports used to stop at the app's private cache plus the
// share sheet, so a saved report never showed up in a file
// manager. This module copies the built report file into a
// folder the user can actually open, through the Storage
// Access Framework:
//
//   - the first export opens the system folder picker once,
//   - Android persists that grant natively
//     (takePersistableUriPermission), so it survives restarts,
//   - every export after that writes silently, reusing the
//     same document when the file already exists.
//
// SAF is the only JS-reachable route to the public Download
// folder: expo-file-system has no MediaStore writer, and
// Android 11+ refuses to grant the Download root itself, so
// the picker opens on Download and the user creates or picks
// a subfolder (typically Download/AdlaWatt).
//
// Declining the prompt is not an error: the function returns
// null and the caller falls back to the share sheet, so an
// export can never be blocked by a missing folder grant.
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as FileSystem from "expo-file-system/legacy";

// ============================================================
// CONSTANTS
// ============================================================

// Persisted SAF tree URI: written once per install and
// revalidated before every export.
export const REPORT_DOWNLOAD_DIRECTORY_KEY =
  "adlawatt.reportDownloadDir.v1";

export interface ReportSaveResult {
  /** Final document name, e.g. adlawatt_daily_report_2026-10-16.pdf */
  filename: string;
  /** Human-readable destination, e.g. "Download/AdlaWatt". */
  folderLabel: string;
  /** SAF content:// URI of the written document. */
  uri: string;
}

// ============================================================
// FOLDER LABEL
// ============================================================

// SAF tree URIs encode the granted path as the volume plus the
// folder chain: "…/tree/primary%3ADownload%2FAdlaWatt" is the
// folder "Download/AdlaWatt" on the primary volume. Decoded and
// volume-stripped that reads exactly like the row the user sees
// in their file manager.
const decodeFolderLabel = (
  directoryUri: string,
): string => {
  try {
    const decoded =
      decodeURIComponent(directoryUri);

    const marker = "/tree/";

    const index =
      decoded.indexOf(marker);

    const path =
      (index >= 0
        ? decoded.slice(
            index + marker.length,
          )
        : decoded
      ).replace(/^[^:]+:/, "");

    return path || directoryUri;
  } catch {
    // Malformed escape: the raw URI is the honest fallback.
    return directoryUri;
  }
};

// ============================================================
// DIRECTORY (one-time grant, then silent)
// ============================================================

const resolveDownloadDirectory =
  async (): Promise<string | null> => {
    const saf =
      FileSystem.StorageAccessFramework;

    const persisted =
      await AsyncStorage.getItem(
        REPORT_DOWNLOAD_DIRECTORY_KEY,
      ).catch(
        () => null,
      );

    if (persisted) {
      try {
        // The grant can go stale (app reinstall, folder
        // deleted, the per-app permission cap). A cheap listing
        // proves it still resolves before we write to it.
        await saf.readDirectoryAsync(
          persisted,
        );

        return persisted;
      } catch {
        // Stale — fall through and ask again.
      }
    }

    const permission =
      await saf.requestDirectoryPermissionsAsync(
        saf.getUriForDirectoryInRoot(
          "Download",
        ),
      );

    if (!permission.granted) {
      return null;
    }

    try {
      await AsyncStorage.setItem(
        REPORT_DOWNLOAD_DIRECTORY_KEY,
        permission.directoryUri,
      );
    } catch {
      // Best-effort: without persistence the picker simply
      // repeats next export — the save itself still works.
    }

    return permission.directoryUri;
  };

// ============================================================
// EXISTING CHILD
// ============================================================

// SAF appends " (1)" to a colliding document, so re-exporting
// the same report twice in one day would litter the folder with
// numbered copies. Matches the exact child name instead of a
// suffix test — "b_report.csv".endsWith("_report.csv") is true,
// which would rewrite the wrong file.
const findExistingChild = async (
  directoryUri: string,
  filename: string,
): Promise<string | null> => {
  const children =
    await FileSystem.StorageAccessFramework.readDirectoryAsync(
      directoryUri,
    );

  const wanted =
    filename.toLowerCase();

  for (const child of children) {
    try {
      const name =
        decodeURIComponent(child)
          .split("/")
          .pop() ?? "";

      if (
        name.toLowerCase() === wanted
      ) {
        return child;
      }
    } catch {
      // Malformed entry: skip it.
    }
  }

  return null;
};

// ============================================================
// SAVE
// ============================================================

/**
 * Copies a locally built report file into the granted download
 * folder.
 *
 * Returns null when the folder prompt was declined, when SAF is
 * unavailable (iOS/web have no equivalent), or when the write
 * fails — callers treat null as "fall back to the share sheet".
 *
 * @param sourceUri Local `file://` copy of the report.
 * @param filename Document name to write, extension included.
 * @param mimeType MIME type the file manager should resolve it to.
 */
export const saveReportFileToDownloads =
  async (
    sourceUri: string,
    filename: string,
    mimeType: string,
  ): Promise<ReportSaveResult | null> => {
    try {
      const directoryUri =
        await resolveDownloadDirectory();

      if (!directoryUri) {
        return null;
      }

      const saf =
        FileSystem.StorageAccessFramework;

      const existing =
        await findExistingChild(
          directoryUri,
          filename,
        );

      const fileUri =
        existing ??
        (await saf.createFileAsync(
          directoryUri,
          filename,
          mimeType,
        ));

      // Base64 in and out keeps the bytes identical for both
      // formats: writeAsStringAsync() decodes base64 before
      // writing, and utf8 would corrupt the PDF.
      const base64 =
        await FileSystem.readAsStringAsync(
          sourceUri,
          {
            encoding:
              FileSystem.EncodingType.Base64,
          },
        );

      await FileSystem.writeAsStringAsync(
        fileUri,
        base64,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        },
      );

      return {
        filename,
        folderLabel: decodeFolderLabel(
          directoryUri,
        ),
        uri: fileUri,
      };
    } catch (error) {
      console.warn(
        "Report could not be saved to the download folder:",
        error instanceof Error
          ? error.message
          : error,
      );

      return null;
    }
  };
