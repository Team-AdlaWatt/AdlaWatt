import React from "react";
import renderer, { act } from "react-test-renderer";

import NativeUpdateReloader from "@/components/updates/NativeUpdateReloader";
import { useUpdates } from "expo-updates";

(globalThis as {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("expo-updates", () => ({
  useUpdates: jest.fn(),
  reloadAsync: jest.fn(),
}));

const mockUseUpdates =
  useUpdates as unknown as jest.Mock;

describe("NativeUpdateReloader", () => {
  beforeEach(() => {
    mockUseUpdates.mockReturnValue({
      isRestarting: false,
      isUpdatePending: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("applies a pending update once", () => {
    const onPending = jest.fn();

    mockUseUpdates.mockReturnValue({
      isRestarting: false,
      isUpdatePending: true,
    });

    let tree:
      | renderer.ReactTestRenderer
      | undefined;

    act(() => {
      tree = renderer.create(
        React.createElement(NativeUpdateReloader, {
          onPending,
        }),
      );
    });

    act(() => {
      tree?.update(
        React.createElement(NativeUpdateReloader, {
          onPending,
        }),
      );
    });

    expect(onPending).toHaveBeenCalledTimes(1);
  });

  test("waits until an update becomes pending", () => {
    const onPending = jest.fn();

    let tree:
      | renderer.ReactTestRenderer
      | undefined;

    act(() => {
      tree = renderer.create(
        React.createElement(NativeUpdateReloader, {
          onPending,
        }),
      );
    });

    expect(onPending).not.toHaveBeenCalled();

    mockUseUpdates.mockReturnValue({
      isRestarting: false,
      isUpdatePending: true,
    });

    act(() => {
      tree?.update(
        React.createElement(NativeUpdateReloader, {
          onPending,
        }),
      );
    });

    expect(onPending).toHaveBeenCalledTimes(1);
  });

  test("does not apply while the app is restarting", () => {
    const onPending = jest.fn();

    mockUseUpdates.mockReturnValue({
      isRestarting: true,
      isUpdatePending: true,
    });

    act(() => {
      renderer.create(
        React.createElement(NativeUpdateReloader, {
          onPending,
        }),
      );
    });

    expect(onPending).not.toHaveBeenCalled();
  });
});
