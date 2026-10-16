// ============================================================
// ADLAWATT REPORT HANDOFF (external app, Android)
//
// Exports never end inside AdlaWatt and never open a share sheet.
// The built cache file is upgraded to a FileProvider content://
// URI and launched with ACTION_VIEW plus a read grant, so the
// phone's own PDF/CSV app is what displays it. When more than one
// app can handle the MIME type Android shows its own "Open with"
// chooser — that chooser belongs to the OS, not to AdlaWatt.
//
// Android-only by design: expo-intent-launcher has no iOS
// implementation, so this module must only ever be imported on
// Android. The caller (analytics.tsx) guards the import, which
// keeps the native module out of the iOS bundle path entirely.
// iOS keeps using the system preview in reportPrint.ts.
// ============================================================

import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

import type { ReportFile } from "@/services/reportPrint";

// ============================================================
// CONSTANTS
// ============================================================

// Intent.FLAG_GRANT_READ_URI_PERMISSION. Without it the receiving
// app cannot read the content:// URI we hand it and opens on a
// permission error instead of rendering the report.
export const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;

// Intent.ACTION_VIEW
export const ACTION_VIEW = "android.intent.action.VIEW";

// ============================================================
// HANDOFF
// ============================================================

/**
 * Hands a built report to whatever app on the device handles its
 * MIME type.
 *
 * expo-file-system's own FileProvider already maps the cache
 * directory (`<cache-path name="cached_expo_files" path="." />`),
 * which is exactly where the report files are written, so the
 * content:// URI resolves without any extra native config.
 *
 * @param file Local `file://` report built by buildReportPdfFile
 * or buildReportCsvFile.
 * @returns The content:// URI that was handed over, so callers
 * (and tests) can assert on the exact handoff target.
 */
export const openReportWithSystemApp = async (
  file: ReportFile,
): Promise<string> => {
  const contentUri =
    await FileSystem.getContentUriAsync(file.uri);

  await IntentLauncher.startActivityAsync(
    ACTION_VIEW,
    {
      data: contentUri,
      type: file.mimeType,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    },
  );

  return contentUri;
};
