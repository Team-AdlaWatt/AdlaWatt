import React from "react";

import {
  act,
  create,
} from "react-test-renderer";

import { usePullToRefresh } from "@/hooks/usePullToRefresh";

// Probe harness: renders the hook and exposes its latest
// return value to the test body.
function probe(
  loader: () => Promise<void>,
) {
  let latest: ReturnType<
    typeof usePullToRefresh
  > | null = null;

  function Probe() {
    latest = usePullToRefresh(loader);

    return null;
  }

  let root: ReturnType<
    typeof create
  > | null = null;

  act(() => {
    root = create(
      React.createElement(Probe),
    );
  });

  return {
    get: () => {
      if (!latest) {
        throw new Error(
          "hook did not render",
        );
      }

      return latest;
    },
    unmount: () => {
      root?.unmount();
    },
  };
}

describe("usePullToRefresh", () => {
  test("starts idle with no spinner", () => {
    const loader = jest.fn(
      async () => {},
    );
    const harness = probe(loader);

    expect(
      harness.get().refreshing,
    ).toBe(false);

    harness.unmount();
  });

  test("pins the spinner for the whole fetch, then clears", async () => {
    let release!: () => void;

    const gate = new Promise<void>(
      (resolve) => {
        release = resolve;
      },
    );
    const loader = jest.fn(
      () => gate,
    );
    const harness = probe(loader);

    act(() => {
      harness.get().onRefresh();
    });

    expect(loader).toHaveBeenCalledTimes(1);
    expect(
      harness.get().refreshing,
    ).toBe(true);

    await act(async () => {
      release();
      await gate;
    });

    expect(
      harness.get().refreshing,
    ).toBe(false);

    harness.unmount();
  });

  test("repeat pulls during a fetch collapse into one call", async () => {
    let release!: () => void;

    const gate = new Promise<void>(
      (resolve) => {
        release = resolve;
      },
    );
    const loader = jest.fn(
      () => gate,
    );
    const harness = probe(loader);

    act(() => {
      harness.get().onRefresh();
      harness.get().onRefresh();
      harness.get().onRefresh();
    });

    expect(loader).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await gate;
    });

    harness.unmount();
  });

  test("no cooldown: a new pull works right after the last one finishes", async () => {
    const loader = jest.fn(
      async () => {},
    );
    const harness = probe(loader);

    await act(async () => {
      harness.get().onRefresh();
    });

    await act(async () => {
      harness.get().onRefresh();
    });

    expect(loader).toHaveBeenCalledTimes(2);
    expect(
      harness.get().refreshing,
    ).toBe(false);

    harness.unmount();
  });

  test("a failed fetch still clears the spinner", async () => {
    const loader = jest.fn(
      async () => {
        throw new Error("offline");
      },
    );
    const harness = probe(loader);

    await act(async () => {
      harness.get().onRefresh();
    });

    expect(
      harness.get().refreshing,
    ).toBe(false);

    harness.unmount();
  });
});
