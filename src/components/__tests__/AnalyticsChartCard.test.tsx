import React from "react";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

import AnalyticsChartCard from "@/components/AnalyticsChartCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/hooks/useAppColors", () => ({
  useAppColors: () => ({
    border: "#D8D2C2",
    cardBorder: "#D8D2C2",
    glass: { white: "#FFFFFF" },
    headerBackground: "#0B7A55",
    headerContent: "#FFFFFF",
    primary: "#00805A",
    scrimFaint: "rgba(0, 0, 0, 0.04)",
    textSecondary: "#6B7280",
  }),
}));

jest.mock("@/services/analyticsService", () => ({
  FREQUENCIES: ["Daily", "Weekly", "Monthly", "Yearly"],
}));

jest.mock("@/components/ui/SlidingToggle", () => ({
  SlidingToggle: "SlidingToggle",
}));

jest.mock("@/components/ui/AppText", () => {
  const ReactModule =
    jest.requireActual<typeof import("react")>("react");
  const { Text: RNText } = jest.requireActual<
    typeof import("react-native")
  >("react-native");

  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      const { children, ...rest } = props;

      return ReactModule.createElement(
        RNText,
        rest as never,
        children as React.ReactNode,
      );
    },
  };
});

describe("AnalyticsChartCard", () => {
  it("renders chart children immediately without placeholder copy", () => {
    let testRenderer!: renderer.ReactTestRenderer;

    act(() => {
      testRenderer = renderer.create(
        <AnalyticsChartCard
          title="Solar Energy"
          subtitle="Energy collected per period."
          icon="sunny-outline"
        >
          <Text testID="chart-frame">chart frame</Text>
        </AnalyticsChartCard>,
      );
    });

    const tree = testRenderer.root;
    const rendered = JSON.stringify(testRenderer.toJSON());

    expect(
      tree.findByProps({ testID: "chart-frame" }),
    ).toBeTruthy();
    expect(rendered).not.toContain(
      "Waiting for graph and chart data...",
    );
    expect(rendered).not.toContain(
      "No data for this range",
    );
    expect(
      tree.findAll(
        (node) => String(node.type) === "SlidingToggle",
      ),
    ).toHaveLength(0);
  });

  it("renders a per-card frequency toggle when props are supplied", () => {
    let testRenderer!: renderer.ReactTestRenderer;
    const onFrequencyChange = jest.fn();

    act(() => {
      testRenderer = renderer.create(
        <AnalyticsChartCard
          title="Solar Energy"
          subtitle="Average solar input in watts."
          icon="sunny-outline"
          frequency="Weekly"
          onFrequencyChange={onFrequencyChange}
        >
          <Text testID="chart-frame">chart frame</Text>
        </AnalyticsChartCard>,
      );
    });

    const toggles =
      testRenderer.root.findAll(
        (node) => String(node.type) === "SlidingToggle",
      );

    expect(toggles).toHaveLength(1);
    expect(toggles[0].props.value).toBe("Weekly");
    expect(
      toggles[0].props.options.map(
        (option: { value: string }) => option.value,
      ),
    ).toEqual([
      "Daily",
      "Weekly",
      "Monthly",
      "Yearly",
    ]);

    act(() => {
      toggles[0].props.onChange("Yearly");
    });
    expect(onFrequencyChange).toHaveBeenCalledWith(
      "Yearly",
    );
  });
});
