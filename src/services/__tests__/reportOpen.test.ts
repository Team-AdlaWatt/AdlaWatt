// External report handoff tests (Android).
//
// Locks the exit path the export flow depends on: AdlaWatt never
// renders the report itself and never opens a share chooser. The
// built file must be upgraded from file:// to a FileProvider
// content:// URI and launched with ACTION_VIEW carrying a read
// grant and the report's own MIME type.

import {
  ACTION_VIEW,
  FLAG_GRANT_READ_URI_PERMISSION,
  openReportWithSystemApp,
} from "@/services/reportOpen";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

// expo-file-system maps the cache directory under the
// `cached_expo_files` name, so a cache file resolves to this shape.
// Shared by the mock and the assertions so they cannot drift.
const mockContentUriFor = (uri: string) =>
  `content://com.teamadlawatt.adlawatt.FileSystemFileProvider/cached_expo_files/${uri
    .split("/")
    .pop()}`;

jest.mock("expo-file-system/legacy", () => ({
  getContentUriAsync: jest.fn(
    async (uri: string) =>
      mockContentUriFor(uri),
  ),
}));

jest.mock("expo-intent-launcher", () => ({
  startActivityAsync: jest.fn(async () => ({
    resultCode: -1,
  })),
}));

describe("openReportWithSystemApp", () => {
  const pdf = {
    uri: "file:///cache/adlawatt_daily_report.pdf",
    filename: "adlawatt_daily_report.pdf",
    mimeType: "application/pdf",
  };

  const csv = {
    uri: "file:///cache/adlawatt_daily_report.csv",
    filename: "adlawatt_daily_report.csv",
    mimeType: "text/csv",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("upgrades file:// to a content:// URI before handing it over", async () => {
    const contentUri =
      await openReportWithSystemApp(pdf);

    expect(
      FileSystem.getContentUriAsync,
    ).toHaveBeenCalledWith(pdf.uri);

    expect(contentUri).toBe(
      mockContentUriFor(pdf.uri),
    );
  });

  test("launches ACTION_VIEW with the report MIME type and a read grant", async () => {
    await openReportWithSystemApp(pdf);

    expect(
      IntentLauncher.startActivityAsync,
    ).toHaveBeenCalledWith(ACTION_VIEW, {
      data: mockContentUriFor(pdf.uri),
      type: "application/pdf",
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  });

  test("a CSV takes the same external path — never an in-app viewer", async () => {
    await openReportWithSystemApp(csv);

    expect(
      IntentLauncher.startActivityAsync,
    ).toHaveBeenCalledWith(
      ACTION_VIEW,
      expect.objectContaining({
        data: mockContentUriFor(csv.uri),
        type: "text/csv",
        flags: FLAG_GRANT_READ_URI_PERMISSION,
      }),
    );
  });

  test("the read grant flag is the real Intent constant", () => {
    expect(
      FLAG_GRANT_READ_URI_PERMISSION,
    ).toBe(0x00000001);
  });

  test("never uses a share action", async () => {
    await openReportWithSystemApp(pdf);

    for (const call of (
      IntentLauncher.startActivityAsync as jest.Mock
    ).mock.calls) {
      expect(call[0]).not.toBe(
        "android.intent.action.SEND",
      );
    }
  });
});
