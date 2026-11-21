// ============================================================
// ADLAWATT NATIVE REPORT EXPORT (expo-print HTML + direct open)
//
// Builds the local report file and hands it off for opening.
// AdlaWatt never renders the PDF or the CSV itself: on Android
// the built file goes to an external app through ACTION_VIEW
// (see reportOpen.ts), and iOS falls back to the system document
// preview. No share sheet is involved at any point. Saving into
// the public Download folder is a separate step (see
// reportStorage.ts) so this module stays a pure renderer.
//
// Real-file export for Android/iOS. The web path keeps using
// the jsPDF template in analyticsService.ts; native renders a
// separate HTML template through expo-print because jsPDF has
// no file output on native. Both templates are fed by the same
// prepareReportData() source so the data never diverges — only
// the presentation forks.
//
// Charts are intentionally excluded (would need view-capture
// plumbing); both exports carry the same three card-aligned
// sections: Solar, Load, and Battery.
// ============================================================

import { Asset } from "expo-asset";
import {
  File,
  Paths,
} from "expo-file-system";
import * as Print from "expo-print";

import {
  formatReportDate,
  generateAdlaWattCsv,
  getCsvReportFilename,
  getPdfReportFilename,
  type AnalyticsReportData,
} from "@/services/analyticsService";

// ============================================================
// CONSTANTS
// ============================================================

// Monitoring table rows rendered into the PDF. A full history
// range can hold thousands of 5-minute snapshots — rendering
// all of them into one HTML document will OOM printToFileAsync
// on low-end devices. The CSV export always carries the complete
// dataset; the PDF shows the head of the range plus a footnote.
export const PRINT_MAX_ROWS = 500;

const PRINT_PRIMARY = "#00A86B";
const PRINT_SECONDARY = "#FFBF00";
const PRINT_BACKGROUND = "#F0EAD6";
const PRINT_TEXT = "#1F2937";
const PRINT_MUTED = "#6B7280";

// ============================================================
// HTML ESCAPING
// ============================================================

// Report values come from device statuses and sensor readings.
// Escaped before interpolation so a stray "<" can never break
// the table layout.
const escapeHtml = (
  value: unknown,
): string => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

// ============================================================
// LOGO
// ============================================================

// Bundled logo as a base64 data URL for <img> embedding.
// Degrades to null (header renders without the logo) when the
// asset cannot be resolved — mirrors the jsPDF fallback.
const loadLogoDataUrl = async (): Promise<string | null> => {
  try {
    const asset = Asset.fromModule(
      require("@/assets/images/adlawatt-logo.png"),
    );

    await asset.downloadAsync();

    const uri =
      asset.localUri ??
      asset.uri;

    if (!uri) {
      return null;
    }

    const base64 =
      await new File(
        uri,
      ).base64();

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn(
      "Report logo could not be loaded:",
      error instanceof Error
        ? error.message
        : error,
    );

    return null;
  }
};

// ============================================================
// HTML TEMPLATE
// ============================================================

export const buildReportHtml = (
  reportData: AnalyticsReportData,
  logoDataUrl: string | null,
): string => {
  const sectionsHtml = reportData.sections
    .map(
      (section) => `
    <div class="section-title">${escapeHtml(section.title)}</div>
    <table>
      <thead>
        <tr>
          ${section.headers
            .map(
              (header) =>
                `<th>${escapeHtml(header)}</th>`,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${section.rows
          .slice(0, PRINT_MAX_ROWS)
          .map(
            (row) => `
        <tr>
          ${row
            .map(
              (value) =>
                `<td>${escapeHtml(value)}</td>`,
            )
            .join("")}
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: ${PRINT_TEXT}; background: #ffffff; margin: 0; padding: 24px; }
  .header { background: ${PRINT_PRIMARY}; color: #ffffff; border-radius: 10px; padding: 18px 20px; display: flex; align-items: center; }
  .header img { height: 44px; margin-right: 14px; }
  .header h1 { font-size: 22px; margin: 0; }
  .header p { font-size: 12px; margin: 4px 0 0; opacity: 0.9; }
  .accent { height: 4px; background: ${PRINT_SECONDARY}; border-radius: 0 0 10px 10px; margin: -2px 0 16px; }
  .section-title { font-size: 15px; font-weight: bold; color: ${PRINT_PRIMARY}; margin: 20px 0 10px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 6px; }
  thead { display: table-header-group; }
  th { background: ${PRINT_PRIMARY}; color: #ffffff; padding: 5px 4px; text-align: left; }
  td { padding: 4px; border-bottom: 1px solid #e5e0cf; }
  tr:nth-child(even) td { background: ${PRINT_BACKGROUND}; }
  .footer { font-size: 10px; color: ${PRINT_MUTED}; margin-top: 20px; border-top: 1px solid #e5e0cf; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    ${logoDataUrl ? `<img src="${logoDataUrl}" />` : ""}
    <div>
      <h1>${escapeHtml(reportData.reportTitle)}</h1>
      <p>${escapeHtml(reportData.reportSubtitle)}</p>
    </div>
  </div>
  <div class="accent"></div>
  ${sectionsHtml}
  <div class="footer">AdlaWatt Analytics Report | ${escapeHtml(formatReportDate(reportData.range.start))} - ${escapeHtml(formatReportDate(reportData.range.end))} | ${escapeHtml(reportData.frequency)} Report</div>
</body>
</html>`;
};

// ============================================================
// REPORT FILE
//
// A built report plus what the library's copy of the report
// file is called: the local URI the viewer reads or previews,
// the name shown in the UI, and the mime type that decides
// which viewer the file gets.
// ============================================================

export interface ReportFile {
  /** Local `file://` copy in the cache directory. */
  uri: string;
  filename: string;
  mimeType: string;
}

// ============================================================
// OPEN HELPERS
// ============================================================

/**
 * Opens a built report in the platform's own viewer.
 *
 * This is the non-Android fallback only. Android never uses it:
 * there the report is handed to an external app through
 * ACTION_VIEW (see reportOpen.ts) so AdlaWatt does not render it.
 *
 * @param file Local `file://` report built by buildReportPdfFile.
 */
export const openReportPdfFile = async (
  file: ReportFile,
): Promise<void> => {
  await Print.printAsync({ uri: file.uri });
};

// ============================================================
// PDF EXPORT (NATIVE)
// ============================================================

export const buildReportPdfFile = async (
  reportData: AnalyticsReportData,
): Promise<ReportFile> => {
  const logoDataUrl =
    await loadLogoDataUrl();

  const html = buildReportHtml(
    reportData,
    logoDataUrl,
  );

  const { uri } =
    await Print.printToFileAsync({
      html,
    });

  // Rename to the report filename so the saved copy arrives
  // with a meaningful name instead of a print-temp name.
  const filename =
    getPdfReportFilename(reportData);

  const target = new File(
    Paths.cache,
    filename,
  );

  let localUri = uri;

  try {
    // SDK57: File copy is async — await so the saved file
    // exists before it is read back for the save or the viewer.
    await new File(uri).copy(target);

    localUri = target.uri;
  } catch (error) {
    console.warn(
      "Report rename failed, using print output directly:",
      error instanceof Error
        ? error.message
        : error,
    );
  }

  return {
    uri: localUri,
    filename,
    mimeType: "application/pdf",
  };
};

// ============================================================
// CSV EXPORT (NATIVE)
// ============================================================

export const buildReportCsvFile = async (
  reportData: AnalyticsReportData,
): Promise<ReportFile> => {
  const csv = generateAdlaWattCsv(
    reportData,
  );

  const filename =
    getCsvReportFilename(reportData);

  const file = new File(
    Paths.cache,
    filename,
  );

  // SDK57: File write is async — await so the CSV is
  // flushed before it is read back for the save.
  await file.write(csv);

  return {
    uri: file.uri,
    filename,
    mimeType: "text/csv",
  };
};
