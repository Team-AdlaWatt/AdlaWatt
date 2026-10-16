// Report storage tests.
//
// This is the only export branch that touches a real user
// folder, so the contract worth locking is: ask for the folder
// once, reuse the persisted grant afterwards, replace a
// same-named document instead of letting SAF number it, and
// return null (share-sheet fallback) on any failure — an export
// must never be blocked by a missing folder grant.

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as FileSystem from "expo-file-system/legacy";

import {
  REPORT_DOWNLOAD_DIRECTORY_KEY,
  saveReportFileToDownloads,
} from "@/services/reportStorage";

jest.mock("expo-file-system/legacy", () => ({
  EncodingType: {
    UTF8: "utf8",
    Base64: "base64",
  },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  StorageAccessFramework: {
    getUriForDirectoryInRoot: jest.fn(
      (folder: string) =>
        `saf://tree/root/${folder}`,
    ),
    requestDirectoryPermissionsAsync:
      jest.fn(),
    readDirectoryAsync: jest.fn(),
    createFileAsync: jest.fn(),
  },
}));

const saf =
  FileSystem.StorageAccessFramework as unknown as {
    getUriForDirectoryInRoot: jest.Mock;
    requestDirectoryPermissionsAsync: jest.Mock;
    readDirectoryAsync: jest.Mock;
    createFileAsync: jest.Mock;
  };

const readAsStringAsync =
  FileSystem.readAsStringAsync as unknown as jest.Mock;

const writeAsStringAsync =
  FileSystem.writeAsStringAsync as unknown as jest.Mock;

// A real SAF tree URI for Download/AdlaWatt, the folder the
// app steers users to.
const GRANTED_DIRECTORY =
  "content://com.android.externalstorage.documents/tree/primary%3ADownload%2FAdlaWatt";

const CHILD_URI = `${GRANTED_DIRECTORY}/document/primary%3ADownload%2FAdlaWatt%2Fadlawatt_daily_report_2026-10-16.csv`;

const FILENAME =
  "adlawatt_daily_report_2026-10-16.csv";

const SOURCE_URI = `file:///cache/${FILENAME}`;

const save = () =>
  saveReportFileToDownloads(
    SOURCE_URI,
    FILENAME,
    "text/csv",
  );

describe("saveReportFileToDownloads", () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    await AsyncStorage.clear();

    saf.readDirectoryAsync.mockResolvedValue(
      [],
    );
    saf.createFileAsync.mockResolvedValue(
      CHILD_URI,
    );
    readAsStringAsync.mockResolvedValue(
      "YmFzZTY0",
    );
    writeAsStringAsync.mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("asks for a folder once and persists the grant", async () => {
    saf.requestDirectoryPermissionsAsync.mockResolvedValue(
      {
        granted: true,
        directoryUri: GRANTED_DIRECTORY,
      },
    );

    const result = await save();

    // Picker opens on Download so the user only has to name or
    // pick the subfolder.
    expect(
      saf.getUriForDirectoryInRoot,
    ).toHaveBeenCalledWith("Download");

    expect(
      saf.createFileAsync,
    ).toHaveBeenCalledWith(
      GRANTED_DIRECTORY,
      FILENAME,
      "text/csv",
    );

    // Base64 in and out: identical bytes for CSV and PDF.
    expect(
      writeAsStringAsync,
    ).toHaveBeenCalledWith(
      CHILD_URI,
      "YmFzZTY0",
      {
        encoding: "base64",
      },
    );

    expect(result).toEqual({
      filename: FILENAME,
      folderLabel: "Download/AdlaWatt",
      uri: CHILD_URI,
    });

    expect(
      await AsyncStorage.getItem(
        REPORT_DOWNLOAD_DIRECTORY_KEY,
      ),
    ).toBe(GRANTED_DIRECTORY);
  });

  test("reuses the persisted grant without prompting", async () => {
    await AsyncStorage.setItem(
      REPORT_DOWNLOAD_DIRECTORY_KEY,
      GRANTED_DIRECTORY,
    );

    const result = await save();

    expect(
      saf.requestDirectoryPermissionsAsync,
    ).not.toHaveBeenCalled();

    expect(result?.folderLabel).toBe(
      "Download/AdlaWatt",
    );
  });

  test("returns null when the folder prompt is declined", async () => {
    saf.requestDirectoryPermissionsAsync.mockResolvedValue(
      {
        granted: false,
      },
    );

    expect(await save()).toBeNull();

    expect(
      saf.createFileAsync,
    ).not.toHaveBeenCalled();

    expect(
      writeAsStringAsync,
    ).not.toHaveBeenCalled();
  });

  test("replaces the same-named document instead of numbering it", async () => {
    await AsyncStorage.setItem(
      REPORT_DOWNLOAD_DIRECTORY_KEY,
      GRANTED_DIRECTORY,
    );

    saf.readDirectoryAsync.mockResolvedValue([
      // Unrelated sibling: must not be mistaken for a match.
      `${GRANTED_DIRECTORY}/document/primary%3ADownload%2FAdlaWatt%2Fb_${FILENAME}`,
      CHILD_URI,
    ]);

    const result = await save();

    expect(
      saf.createFileAsync,
    ).not.toHaveBeenCalled();

    expect(
      writeAsStringAsync,
    ).toHaveBeenCalledWith(
      CHILD_URI,
      "YmFzZTY0",
      {
        encoding: "base64",
      },
    );

    expect(result?.uri).toBe(CHILD_URI);
  });

  test("re-asks when the persisted grant went stale", async () => {
    await AsyncStorage.setItem(
      REPORT_DOWNLOAD_DIRECTORY_KEY,
      "content://stale/tree/primary%3ADownload%2FGone",
    );

    saf.readDirectoryAsync
      .mockRejectedValueOnce(
        new Error("permission revoked"),
      )
      .mockResolvedValue([]);

    saf.requestDirectoryPermissionsAsync.mockResolvedValue(
      {
        granted: true,
        directoryUri: GRANTED_DIRECTORY,
      },
    );

    const result = await save();

    expect(
      saf.requestDirectoryPermissionsAsync,
    ).toHaveBeenCalledTimes(1);

    expect(result?.folderLabel).toBe(
      "Download/AdlaWatt",
    );

    expect(
      await AsyncStorage.getItem(
        REPORT_DOWNLOAD_DIRECTORY_KEY,
      ),
    ).toBe(GRANTED_DIRECTORY);
  });

  test("returns null when the write fails", async () => {
    await AsyncStorage.setItem(
      REPORT_DOWNLOAD_DIRECTORY_KEY,
      GRANTED_DIRECTORY,
    );

    writeAsStringAsync.mockRejectedValue(
      new Error("No space left on device"),
    );

    expect(await save()).toBeNull();
  });

  test("returns null when the folder picker is unavailable", async () => {
    // iOS/web have no StorageAccessFramework: the call throws and
    // the caller falls back to the share sheet.
    saf.requestDirectoryPermissionsAsync.mockRejectedValue(
      new Error("unavailable"),
    );

    expect(await save()).toBeNull();
  });
});
