import React from "react";
import { AppState } from "react-native";
import renderer, { act } from "react-test-renderer";

import AppUpdateGuard from "@/components/updates/AppUpdateGuard.native";
import { useConnectivity } from "@/hooks/useConnectivity";
import {
  applyDownloadedAppUpdate,
  checkFetchApplyAppUpdate,
  checkForAppUpdate,
} from "@/services/appUpdateService";

(globalThis as {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/constants/appUpdates", () => ({
  OTA_UPDATE_APPLY_MODE: "next-launch",
}));

jest.mock("@/hooks/useConnectivity", () => ({
  useConnectivity: jest.fn(),
}));

jest.mock("@/services/appUpdateService", () => ({
  applyDownloadedAppUpdate: jest.fn(),
  checkFetchApplyAppUpdate: jest.fn(),
  checkForAppUpdate: jest.fn(),
}));

jest.mock(
  "@/components/updates/NativeUpdateReloader",
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

const mockUseConnectivity =
  useConnectivity as unknown as jest.Mock;
const mockCheckFetchApply =
  checkFetchApplyAppUpdate as unknown as jest.Mock;
const mockCheckForAppUpdate =
  checkForAppUpdate as unknown as jest.Mock;
const mockApplyDownloaded =
  applyDownloadedAppUpdate as unknown as jest.Mock;

describe("AppUpdateGuard legacy mode", () => {
  beforeEach(() => {
    (AppState as unknown as {
      currentState: string;
    }).currentState = "active";
    mockUseConnectivity.mockReturnValue({
      connected: true,
    });
    mockCheckFetchApply.mockResolvedValue(
      "downloaded",
    );
    mockCheckForAppUpdate.mockResolvedValue(
      "downloaded",
    );
    mockApplyDownloaded.mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses the original next-launch check without reloading", async () => {
    let tree:
      | renderer.ReactTestRenderer
      | undefined;

    await act(async () => {
      tree = renderer.create(
        React.createElement(AppUpdateGuard),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCheckForAppUpdate).toHaveBeenCalledTimes(
      1,
    );
    expect(mockCheckFetchApply).not.toHaveBeenCalled();
    expect(mockApplyDownloaded).not.toHaveBeenCalled();

    act(() => {
      tree?.unmount();
    });
  });
});
