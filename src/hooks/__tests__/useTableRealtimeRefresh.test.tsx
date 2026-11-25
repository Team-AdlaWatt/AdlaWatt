import React from "react";

import {
  act,
  create,
} from "react-test-renderer";

import {
  getAuthenticatedUserSafe,
} from "@/lib/supabase";
import {
  subscribeResilientChannel,
} from "@/services/realtimeResubscribe";
import {
  useTableRealtimeRefresh,
} from "@/hooks/useTableRealtimeRefresh";

jest.mock("@/lib/supabase", () => ({
  getAuthenticatedUserSafe: jest.fn(),
}));

jest.mock("@/services/realtimeResubscribe", () => ({
  subscribeResilientChannel: jest.fn(),
}));

const mockGetUser =
  getAuthenticatedUserSafe as jest.Mock;

const mockSubscribe =
  subscribeResilientChannel as jest.Mock;

function Probe({
  onRefresh,
}: {
  onRefresh: () => void;
}) {
  useTableRealtimeRefresh({
    table: "electronics",
    topic: "test-electronics",
    onRefresh,
    debounceMs: 100,
  });

  return null;
}

describe("useTableRealtimeRefresh", () => {
  let listener: () => void;
  let stop: jest.Mock;
  let config: {
    topic: string;
    label: string;
    build: (base: unknown) => unknown;
    isAlive: () => boolean;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    listener = () => {};
    stop = jest.fn();
    mockGetUser.mockResolvedValue({
      id: "user-1",
    });

    mockSubscribe.mockImplementation(
      (options: typeof config) => {
        config = options;

        const base: { on: jest.Mock } = {
          on: jest.fn(
            (
              _event: string,
              _filter: unknown,
              callback: () => void,
            ) => {
              listener = callback;
              return base;
            },
          ),
        };

        options.build(base);
        return { stop };
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("subscribes with a user-scoped table filter", async () => {
    let root: ReturnType<typeof create> | null = null;

    await act(async () => {
      root = create(
        React.createElement(Probe, {
          onRefresh: jest.fn(),
        }),
      );
    });

    expect(config.topic).toBe(
      "test-electronics-user-1",
    );
    expect(config.label).toBe(
      "test-electronics",
    );
    expect(config.isAlive()).toBe(true);

    expect(
      mockSubscribe,
    ).toHaveBeenCalledTimes(1);

    act(() => {
      root?.unmount();
    });
  });

  test("coalesces a burst of changes into one refresh", async () => {
    const onRefresh = jest.fn();
    let root: ReturnType<typeof create> | null = null;

    await act(async () => {
      root = create(
        React.createElement(Probe, { onRefresh }),
      );
    });

    await act(async () => {
      listener();
      listener();
      listener();
      jest.advanceTimersByTime(100);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      root?.unmount();
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
