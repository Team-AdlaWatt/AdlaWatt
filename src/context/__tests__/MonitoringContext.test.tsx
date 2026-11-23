import React from "react";

import { act, create } from "react-test-renderer";

import {
  MonitoringProvider,
  useMonitoringContext,
} from "@/context/MonitoringContext";
import { useDeviceOnline } from "@/hooks/useDeviceOnline";
import { useMonitoring } from "@/services/monitoringService";

jest.mock("@/services/monitoringService", () => ({
  useMonitoring: jest.fn(),
}));

jest.mock("@/hooks/useDeviceOnline", () => ({
  useDeviceOnline: jest.fn(),
}));

const mockUseMonitoring = useMonitoring as jest.Mock;
const mockUseDeviceOnline =
  useDeviceOnline as jest.Mock;

const baseState = {
  monitoring: {
    last_seen: "2026-11-12T10:00:00.000Z",
    device_status: "Online",
  },
  loading: false,
  stale: false,
  cachedAt: 1,
  error: false,
  refresh: jest.fn(),
};

function Probe({
  onStatus,
}: {
  onStatus: (status: string) => void;
}) {
  onStatus(
    useMonitoringContext().connectionStatus,
  );
  return null;
}

describe("MonitoringProvider connection status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeviceOnline.mockReturnValue(false);
  });

  test("an expired cached row stays in loading until live data arrives", () => {
    mockUseMonitoring.mockReturnValue({
      ...baseState,
      stale: true,
    });

    let status = "";
    act(() => {
      create(
        React.createElement(MonitoringProvider, null,
          React.createElement(Probe, {
            onStatus: (value) => {
              status = value;
            },
          }),
        ),
      );
    });

    expect(status).toBe("loading");
  });

  test("live offline data reports offline", () => {
    mockUseMonitoring.mockReturnValue(baseState);

    let status = "";
    act(() => {
      create(
        React.createElement(MonitoringProvider, null,
          React.createElement(Probe, {
            onStatus: (value) => {
              status = value;
            },
          }),
        ),
      );
    });

    expect(mockUseDeviceOnline).toHaveBeenCalledWith(
      "Online",
    );
    expect(status).toBe("offline");
  });

  test("live online data reports online", () => {
    mockUseMonitoring.mockReturnValue(baseState);
    mockUseDeviceOnline.mockReturnValue(true);

    let status = "";
    act(() => {
      create(
        React.createElement(MonitoringProvider, null,
          React.createElement(Probe, {
            onStatus: (value) => {
              status = value;
            },
          }),
        ),
      );
    });

    expect(status).toBe("online");
  });
});
