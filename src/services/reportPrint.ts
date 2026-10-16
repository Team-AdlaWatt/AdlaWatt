// ============================================================
// ADLAWATT NATIVE REPORT EXPORT (expo-print HTML + file handoff)
//
// Builds the local report file and opens the system chooser on
// it. Saving into the public Download folder is a separate step
// (see reportStorage.ts) so this module stays a pure renderer.
//
// Real-file export for Android/iOS. The web path keeps using
// the jsPDF template in analyticsService.ts; native renders a
// separate HTML template through expo-print because jsPDF has
// no file output on native. Both templates are fed by the same
// prepareReportData() source so the data never diverges — only
// the presentation forks.
//
// Charts are intentionally excluded (would need view-capture
// plumbing); the PDF carries KPIs + data tables, and the CSV
// carries the complete untruncated dataset.
// ============================================================

import { Asset } from "expo-asset";
import {
  File,
  Paths,
} from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import {
  formatNumber,
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
  const { summary } = reportData;

  const totalRows =
    reportData.monitoringRows.length;

  const shownRows =
    reportData.monitoringRows.slice(
      0,
      PRINT_MAX_ROWS,
    );

  const truncated =
    totalRows > PRINT_MAX_ROWS;

  const kpi = (
    label: string,
    value: string,
  ): string => `
    <div class="kpi">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div class="kpi-value">${escapeHtml(value)}</div>
    </div>`;

  const tableRows = shownRows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.recordedAt)}</td>
        <td>${escapeHtml(row.batteryLevel)}</td>
        <td>${escapeHtml(row.batteryStatus)}</td>
        <td>${escapeHtml(row.solarInput)}</td>
        <td>${escapeHtml(row.currentLoad)}</td>
        <td>${escapeHtml(row.deviceStatus)}</td>
        <td>${escapeHtml(row.batteryTemperature)}</td>
        <td>${escapeHtml(row.solarTemperature)}</td>
        <td>${escapeHtml(row.solarTimer)}</td>
        <td>${escapeHtml(row.solarVoltage)}</td>
        <td>${escapeHtml(row.solarCurrent)}</td>
        <td>${escapeHtml(row.totalEnergy)}</td>
      </tr>`,
    )
    .join("");

  // Derived analytics, rendered from the shared ReportKpi list so
  // the native PDF shows the same metrics as the web PDF + CSV.
  const kpiRows = reportData.kpis
    .map((entry) =>
      kpi(
        entry.label,
        entry.unit
          ? `${entry.value} ${entry.unit}`
          : entry.value,
      ),
    )
    .join("");

  // Chart-aligned per-bucket aggregates, from the same
  // ReportPeriodRow list the CSV exports.
  const periodRows = reportData.periods
    .map(
      (period) => `
      <tr>
        <td>${escapeHtml(period.periodLabel)}</td>
        <td>${period.sampleCount}</td>
        <td>${formatNumber(period.avgBatteryLevel)}</td>
        <td>${formatNumber(period.minBatteryLevel)}</td>
        <td>${formatNumber(period.maxBatteryLevel)}</td>
        <td>${formatNumber(period.energyInputWh)}</td>
        <td>${formatNumber(period.energyOutputWh)}</td>
        <td>${formatNumber(period.netEnergyWh)}</td>
        <td>${formatNumber(period.solarCoveragePct)}</td>
        <td>${formatNumber(period.uptimePct)}</td>
        <td>${period.unsafeSampleCount}</td>
        <td>${formatNumber(period.sunHours)}</td>
      </tr>`,
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
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .kpi { background: ${PRINT_BACKGROUND}; border-radius: 8px; padding: 8px 12px; min-width: 140px; flex: 1; }
  .kpi-label { font-size: 10px; color: ${PRINT_MUTED}; text-transform: uppercase; }
  .kpi-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 6px; }
  thead { display: table-header-group; }
  th { background: ${PRINT_PRIMARY}; color: #ffffff; padding: 5px 4px; text-align: left; }
  td { padding: 4px; border-bottom: 1px solid #e5e0cf; }
  tr:nth-child(even) td { background: ${PRINT_BACKGROUND}; }
  .footnote { font-size: 10px; color: ${PRINT_MUTED}; margin-top: 8px; }
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

  <div class="section-title">Summary</div>
  <div class="kpi-grid">
    ${kpi("Monitoring records", String(summary.sampleCount))}
    ${kpi("Avg battery", `${formatNumber(summary.averageBatteryLevel)}%`)}
    ${kpi("Min battery", `${formatNumber(summary.minimumBatteryLevel)}%`)}
    ${kpi("Max battery", `${formatNumber(summary.maximumBatteryLevel)}%`)}
    ${kpi("Avg solar", `${formatNumber(summary.averageSolarInput)} W`)}
    ${kpi("Max solar", `${formatNumber(summary.maximumSolarInput)} W`)}
    ${kpi("Avg load", `${formatNumber(summary.averageCurrentLoad)} W`)}
    ${kpi("Max load", `${formatNumber(summary.maximumCurrentLoad)} W`)}
    ${kpi("Avg batt temp", `${formatNumber(summary.averageBatteryTemperature)} C`)}
    ${kpi("Max batt temp", `${formatNumber(summary.maximumBatteryTemperature)} C`)}
    ${kpi("Energy in", `${formatNumber(summary.totalEnergyInputWh)} Wh`)}
    ${kpi("Energy out", `${formatNumber(summary.totalEnergyOutputWh)} Wh`)}
    ${kpi("Device", summary.latestDeviceStatus)}
    ${kpi("Time remaining", summary.latestTimeRemaining)}
  </div>

  <div class="section-title">Key Metrics</div>
  <div class="kpi-grid">
    ${kpiRows}
  </div>

  <div class="section-title">Aggregated Periods</div>
  <table>
    <thead>
      <tr>
        <th>Period</th>
        <th>Samples</th>
        <th>Avg Batt %</th>
        <th>Min %</th>
        <th>Max %</th>
        <th>Energy In Wh</th>
        <th>Energy Out Wh</th>
        <th>Net Wh</th>
        <th>Coverage %</th>
        <th>Uptime %</th>
        <th>Unsafe</th>
        <th>Sun h</th>
      </tr>
    </thead>
    <tbody>${periodRows}</tbody>
  </table>

  <div class="section-title">Monitoring History</div>
  <table>
    <thead>
      <tr>
        <th>Recorded At</th>
        <th>Battery %</th>
        <th>Battery</th>
        <th>Solar W</th>
        <th>Load W</th>
        <th>Device</th>
        <th>Battery C</th>
        <th>Solar C</th>
        <th>Sol Timer</th>
        <th>Sol V</th>
        <th>Sol A</th>
        <th>Total Wh</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  ${
    truncated
      ? `<div class="footnote">Showing first ${PRINT_MAX_ROWS} of ${totalRows} records — see the CSV export for the complete dataset.</div>`
      : `<div class="footnote">${totalRows} records in this period.</div>`
  }

  <div class="footer">AdlaWatt Analytics Report | ${escapeHtml(formatReportDate(reportData.range.start))} - ${escapeHtml(formatReportDate(reportData.range.end))} | ${escapeHtml(reportData.frequency)} Report</div>
</body>
</html>`;
};

// ============================================================
// REPORT FILE
//
// A built report plus everything the two exit ramps need: the
// Download-folder save reads the bytes, the system chooser
// needs the mime type, dialog title and iOS UTI. Built once
// per export and handed to whichever path runs.
// ============================================================

export interface ReportFile {
  /** Local `file://` copy in the cache directory. */
  uri: string;
  filename: string;
  mimeType: string;
  dialogTitle: string;
  UTI?: string;
}

// ============================================================
// SHARE HELPERS
// ============================================================

const ensureSharingAvailable = async (): Promise<boolean> => {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
};

// Opens the system chooser on a local file. expo-sharing
// rejects non-`file` schemes outright, which is why the saved
// copy in the Download folder is not shared directly — this
// shares the cache copy and the folder keeps its own copy.
export const shareReportFile = async (
  file: ReportFile,
): Promise<void> => {
  if (!(await ensureSharingAvailable())) {
    throw new Error(
      "Sharing is not available on this device.",
    );
  }

  await Sharing.shareAsync(
    file.uri,
    {
      mimeType: file.mimeType,
      dialogTitle: file.dialogTitle,
      UTI: file.UTI,
    },
  );
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

  // Rename to the report filename so the shared file arrives
  // with a meaningful name instead of a print-temp name.
  const filename =
    getPdfReportFilename(reportData);

  const target = new File(
    Paths.cache,
    filename,
  );

  let localUri = uri;

  try {
    // SDK57: File copy is async — await so the share target
    // exists before shareAsync reads it.
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
    dialogTitle:
      "AdlaWatt Analytics Report",
    UTI: ".pdf",
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
    dialogTitle:
      "AdlaWatt Analytics CSV Report",
    UTI: "public.comma-separated-values-text",
  };
};
