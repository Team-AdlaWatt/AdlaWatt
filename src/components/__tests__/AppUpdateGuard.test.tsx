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
  () => {
    const ReactModule =
      jest.requireActual<typeof import("react")>("react");

    const MockNativeUpdateReloader = ({
      onPending,
    }: {
      onPending: () => void;
    }) => {
      ReactModule.useEffect(() => {
        onPending();
      }, [onPending]);

      return null;
    };

    return {
      __esModule: true,
      default: MockNativeUpdateReloader,
    };
  },
);

const mockUseConnectivity =
  useConnectivity as unknown as jest.Mock;
const mockCheckFetchApply =
  checkFetchApplyAppUpdate as unknown as jest.Mock;
const mockCheckForAppUpdate =
  checkForAppUpdate as unknown as jest.Mock;
const mockApplyDownloaded =
  applyDownloadedAppUpdate as unknown as jest.Mock;

describe("AppUpdateGuard", () => {
  beforeEach(() => {
    (AppState as unknown as {
      currentState: string;
    }).currentState = "active";
    mockUseConnectivity.mockReturnValue({
      connected: true,
    });
    mockCheckFetchApply.mockResolvedValue(
      "up_to_date",
    );
    mockCheckForAppUpdate.mockResolvedValue(
      "up_to_date",
    );
    mockApplyDownloaded.mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test("checks on mount and every 15 minutes", async () => {
    jest.useFakeTimers();
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

    expect(mockCheckFetchApply).toHaveBeenCalledTimes(
      1,
    );

    act(() => {
      jest.advanceTimersByTime(15 * 60 * 1000);
    });

    expect(mockCheckFetchApply).toHaveBeenCalledTimes(
      2,
    );

    act(() => {
      tree?.unmount();
    });
  });

  test("does not check while offline", () => {
    mockUseConnectivity.mockReturnValue({
      connected: false,
    });
    let tree:
      | renderer.ReactTestRenderer
      | undefined;

    act(() => {
      tree = renderer.create(
        React.createElement(AppUpdateGuard),
      );
    });

    expect(mockCheckFetchApply).not.toHaveBeenCalled();

    act(() => {
      tree?.unmount();
    });
  });

  test("applies updates reported by the native pending watcher", () => {
    let tree:
      | renderer.ReactTestRenderer
      | undefined;

    act(() => {
      tree = renderer.create(
        React.createElement(AppUpdateGuard),
      );
    });

    expect(mockApplyDownloaded).toHaveBeenCalledTimes(
      1,
    );

    act(() => {
      tree?.unmount();
    });
  });
});
