import React from "react";
import renderer, { act } from "react-test-renderer";

import { useLoadDetection } from "@/hooks/useLoadDetection";

(globalThis as {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

type ProbeProps = {
  loadW: number | null;
  enabled?: boolean;
};

const createHarness = (
  onConfirmed: () => void,
) => {
  let tree:
    | renderer.ReactTestRenderer
    | undefined;

  const Probe = ({
    loadW,
    enabled = true,
  }: ProbeProps) => {
    useLoadDetection({
      loadW,
      enabled,
      onConfirmed,
    });

    return null;
  };

  return {
    render: (props: ProbeProps) => {
      act(() => {
        tree = renderer.create(
          React.createElement(Probe, props),
        );
      });
    },
    rerender: (props: ProbeProps) => {
      act(() => {
        tree?.update(
          React.createElement(Probe, props),
        );
      });
    },
    unmount: () => {
      act(() => {
        tree?.unmount();
      });
    },
  };
};

describe("useLoadDetection", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("does not confirm at or below 7 W", () => {
    const onConfirmed = jest.fn();
    const harness = createHarness(onConfirmed);

    harness.render({ loadW: 7 });
    jest.setSystemTime(31_000);
    harness.rerender({ loadW: 6.9 });

    expect(onConfirmed).not.toHaveBeenCalled();
    harness.unmount();
  });

  test("confirms only after absolute load is sustained", () => {
    const onConfirmed = jest.fn();
    const harness = createHarness(onConfirmed);

    harness.render({ loadW: 7.1 });
    jest.setSystemTime(29_999);
    harness.rerender({ loadW: 7.2 });
    expect(onConfirmed).not.toHaveBeenCalled();

    jest.setSystemTime(30_000);
    harness.rerender({ loadW: 7.3 });
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    harness.unmount();
  });

  test("does not rearm while load stays above 7 W", () => {
    const onConfirmed = jest.fn();
    const harness = createHarness(onConfirmed);

    harness.render({ loadW: 8 });
    jest.setSystemTime(31_000);
    harness.rerender({ loadW: 8.1 });
    expect(onConfirmed).toHaveBeenCalledTimes(1);

    harness.rerender({
      loadW: 8.2,
      enabled: false,
    });
    jest.setSystemTime(80_000);
    harness.rerender({
      loadW: 8.3,
      enabled: true,
    });
    jest.setSystemTime(120_000);
    harness.rerender({ loadW: 8.5 });

    expect(onConfirmed).toHaveBeenCalledTimes(1);
    harness.unmount();
  });

  test("rearms after load recovers near baseline for the dwell period", () => {
    const onConfirmed = jest.fn();
    const harness = createHarness(onConfirmed);

    harness.render({ loadW: 8 });
    jest.setSystemTime(31_000);
    harness.rerender({ loadW: 8.1 });
    expect(onConfirmed).toHaveBeenCalledTimes(1);

    jest.setSystemTime(70_000);
    harness.rerender({ loadW: 7 });
    jest.setSystemTime(99_999);
    harness.rerender({ loadW: 6.9 });
    expect(onConfirmed).toHaveBeenCalledTimes(1);

    jest.setSystemTime(100_000);
    harness.rerender({ loadW: 6.8 });
    jest.setSystemTime(100_001);
    harness.rerender({ loadW: 8 });

    jest.setSystemTime(131_000);
    harness.rerender({ loadW: 8.1 });

    expect(onConfirmed).toHaveBeenCalledTimes(2);
    harness.unmount();
  });
});
