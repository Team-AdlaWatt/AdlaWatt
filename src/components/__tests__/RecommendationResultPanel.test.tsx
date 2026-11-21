import React from "react";
import renderer, { act } from "react-test-renderer";

import RecommendationResultPanel from "@/components/recommendation/RecommendationResultPanel";
import {
  evaluateSelection,
} from "@/services/recommendationSelection";
import type { BatteryStateInput } from "@/services/recommendation";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: {
        label?: string;
        max?: number;
      },
    ) =>
      options?.label
        ? `${key}:${options.label}`
        : options?.max
          ? `${key}:${options.max}`
          : key,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/hooks/useAppColors", () => ({
  useAppColors: () => ({
    border: "#D8D2C2",
    elevated: "#FFFFFF",
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

const battery: BatteryStateInput = {
  soc: 80,
  voltage: 12.6,
  remainingWh: 600,
  dod: "Safe",
  lastUpdated: Date.now(),
};

test("renders the combined verdict, reason, and metrics", () => {
  const result = evaluateSelection(
    battery,
    [
      {
        id: "catalog:general:led-light-bulb",
        name: "LED Light Bulb",
        watts: "3-18W",
        area: "General",
      },
    ],
    { alternativesLimit: 0 },
  );

  let tree:
    | renderer.ReactTestRenderer
    | undefined;

  act(() => {
    tree = renderer.create(
      <RecommendationResultPanel
        result={result}
      />,
    );
  });

  const json = JSON.stringify(tree?.toJSON());

  expect(json).toContain(
    "recommendationResult.status.ready",
  );
  expect(json).toContain(
    "recommendationResult.reason.recommended",
  );
  expect(json).toContain(
    "recommendationResult.remainingBattery",
  );
  expect(json).toContain(
    "recommendationResult.estimatedRuntime",
  );
});
