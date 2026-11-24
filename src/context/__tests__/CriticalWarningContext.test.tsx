import React from "react";

import { act, create } from "react-test-renderer";

import {
  CriticalWarningProvider,
  useCriticalWarning,
} from "@/context/CriticalWarningContext";
import { useMonitoringContext } from "@/context/MonitoringContext";
import { computeBatteryEnergy } from "@/services/batteryEnergy";
import { deriveProtectionState } from "@/services/batteryProtection";

jest.mock("@/context/MonitoringContext", () => ({
  useMonitoringContext: jest.fn(),
}));

jest.mock("@/services/batteryEnergy", () => ({
  ENERGY_RECOVERY_RATIO: 0.15,
  computeBatteryEnergy: jest.fn(),
}));

jest.mock("@/services/batteryProtection", () => ({
  deriveProtectionState: jest.fn(),
}));

const mockUseMonitoringContext =
  useMonitoringContext as jest.Mock;
const mockComputeBatteryEnergy =
  computeBatteryEnergy as jest.Mock;
const mockDeriveProtectionState =
  deriveProtectionState as jest.Mock;

const energy = {
  status: "normal",
  totalWh: 100,
  reserveWh: 20,
  usableWh: 10,
  usableCapacityWh: 80,
  usablePercent: 12.5,
  consumedWh: 70,
};

function Probe({
  onActive,
}: {
  onActive: (active: boolean) => void;
}) {
  onActive(useCriticalWarning().active);
  return null;
}

describe("CriticalWarningProvider DB freshness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockComputeBatteryEnergy.mockReturnValue(energy);
    mockDeriveProtectionState.mockReturnValue({
      level: "critical",
      titleKey: "critical",
      bodyKey: "critical",
    });
  });

  test("clears an active critical warning when the DB row becomes stale", () => {
    mockUseMonitoringContext.mockReturnValue({
      monitoring: {
        battery_level: 10,
        voltage: 11,
        watt_hours: 30,
        current_load: 200,
        dod_status: "Safe",
      },
      deviceOnline: true,
      dbReadingFresh: true,
    });

    let active = false;
    let renderer: ReturnType<typeof create> | null = null;

    act(() => {
      renderer = create(
        React.createElement(
          CriticalWarningProvider,
          null,
          React.createElement(Probe, {
            onActive: (value) => {
              active = value;
            },
          }),
        ),
      );
    });

    expect(active).toBe(true);

    mockUseMonitoringContext.mockReturnValue({
      monitoring: {
        battery_level: 10,
        voltage: 11,
        watt_hours: 30,
        current_load: 200,
        dod_status: "Safe",
      },
      deviceOnline: true,
      dbReadingFresh: false,
    });

    act(() => {
      renderer?.update(
        React.createElement(
          CriticalWarningProvider,
          null,
          React.createElement(Probe, {
            onActive: (value) => {
              active = value;
            },
          }),
        ),
      );
    });

    expect(active).toBe(false);
  });
});
