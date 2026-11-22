import React from "react";
import renderer, { act } from "react-test-renderer";

import BatteryEnergyHighlight from "@/components/recommendation/BatteryEnergyHighlight";
import { BATTERY_CAPACITY_WH } from "@/constants/battery";
import { computeBatteryEnergy } from "@/services/batteryEnergy";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: {
        time?: string;
        watts?: number;
      },
    ) =>
      options?.watts !== undefined
        ? `${key}:${options.watts}`
        : options?.time
          ? `${key}:${options.time}`
          : key,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/hooks/useAppColors", () => ({
  useAppColors: () => ({
    border: "#D8D2C2",
    error: "#EF4444",
    onPrimary: "#FFFFFF",
    onSurface: "#1C1B1F",
    onSurfaceMuted: "#747775",
    primary: "#00805A",
    primaryWash: "#EEF7F3",
    surface: "#FFFFFF",
    warning: "#F59E0B",
  }),
}));

jest.mock("@/components/ui/AppText", () => {
  const ReactModule =
    jest.requireActual<typeof import("react")>(
      "react",
    );
  const { Text } = jest.requireActual<
    typeof import("react-native")
  >("react-native");

  return {
    __esModule: true,
    default: (
      props: Record<string, unknown>,
    ) => {
      const { children, ...rest } = props;

      return ReactModule.createElement(
        Text,
        rest as never,
        children as React.ReactNode,
      );
    },
  };
});

(globalThis as {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const now = 1_700_000_000_000;

test("renders live draw, ETR, and the red/green energy split", () => {
  const snapshot = computeBatteryEnergy({
    wattHours: BATTERY_CAPACITY_WH,
    deviceOnline: true,
    lastUpdated: now,
    now,
  });

  let tree:
    | renderer.ReactTestRenderer
    | undefined;

  act(() => {
    tree = renderer.create(
      <BatteryEnergyHighlight
        snapshot={snapshot}
        liveNetLoadW={20}
        projectedDrainWh={
          snapshot.usableCapacityWh / 2
        }
        remainingAfterLoadWh={
          snapshot.usableCapacityWh / 4
        }
        timeRemainingLabel="1h 30m"
      />,
    );
  });

  const json = JSON.stringify(tree?.toJSON());

  expect(json).toContain(
    "batteryEnergy.liveDraw:20",
  );
  expect(json).toContain(
    "batteryEnergy.timeRemaining:1h 30m",
  );
  expect(json).toContain('"width":"50%"');
  expect(json).toContain('"width":"25%"');
  expect(json).toContain("#EF4444");
});
