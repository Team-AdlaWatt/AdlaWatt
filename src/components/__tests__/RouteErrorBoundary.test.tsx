import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import RouteErrorBoundary from "@/components/ui/RouteErrorBoundary";

(globalThis as {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/hooks/useAppColors", () => ({
  useAppColors: () => ({
    background: "#ffffff",
    cardBorder: "#dddddd",
    glass: { white: "#ffffff" },
    onPrimary: "#ffffff",
    primary: "#123456",
    text: "#111111",
    textSecondary: "#666666",
  }),
}));

jest.mock("@/components/ui/AppText", () => {
  const ReactModule =
    jest.requireActual<typeof import("react")>("react");
  const { Text: MockText } = jest.requireActual<
    typeof import("react-native")
  >("react-native");

  return {
    __esModule: true,
    default: (
      props: React.ComponentProps<typeof Text> & {
        children?: React.ReactNode;
      },
    ) =>
      ReactModule.createElement(
        MockText,
        props,
        props.children,
      ),
  };
});

describe("RouteErrorBoundary", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test("shows a fallback and recovers on retry", () => {
    let shouldThrow = true;

    const UnstableScreen = () => {
      if (shouldThrow) {
        throw new Error("chart crash");
      }

      return React.createElement(
        Text,
        null,
        "recovered",
      );
    };

    let tree:
      | renderer.ReactTestRenderer
      | undefined;

    act(() => {
      tree = renderer.create(
        React.createElement(
          RouteErrorBoundary,
          null,
          React.createElement(UnstableScreen),
        ),
      );
    });

    expect(
      JSON.stringify(tree?.toJSON()),
    ).toContain("common.routeErrorTitle");

    const retry = tree
      ?.root.findByProps({
        testID: "route-error-retry",
      });

    act(() => {
      shouldThrow = false;
      retry?.props.onPress();
    });

    expect(
      JSON.stringify(tree?.toJSON()),
    ).toContain("recovered");
  });
});
