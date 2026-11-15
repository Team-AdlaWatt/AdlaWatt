import { Routes } from "@/constants/routes";
import {
  shouldShowVibrationGuidance,
  type VibrationGuidanceGateInput,
} from "@/utils/vibrationGuidance";

const base: VibrationGuidanceGateInput = {
  platformOS: "ios",
  appState: "active",
  pathname: "/dashboard/home",
  guidanceEnabled: true,
  vibrationEnabled: true,
  introSeen: false,
  source: "sync",
  shownThisSession: false,
};

const gate = (
  overrides: Partial<VibrationGuidanceGateInput> = {},
) =>
  shouldShowVibrationGuidance({
    ...base,
    ...overrides,
  });

describe("shouldShowVibrationGuidance", () => {
  it("shows the intro on a first sync buzz", () => {
    expect(gate()).toBe(true);
  });

  it("shows on a new alert even after the intro", () => {
    expect(
      gate({ introSeen: true, source: "insert" }),
    ).toBe(true);
  });

  it("hides a stale sync buzz after the intro", () => {
    expect(
      gate({ introSeen: true, source: "sync" }),
    ).toBe(false);
  });

  it("never shows on web", () => {
    expect(
      gate({
        platformOS: "web",
        introSeen: true,
        source: "insert",
      }),
    ).toBe(false);
  });

  it("never shows while the app is not active", () => {
    expect(
      gate({ appState: "background" }),
    ).toBe(false);
  });

  it("suppresses on Notifications and Menu", () => {
    expect(
      gate({ pathname: Routes.NOTIFICATIONS }),
    ).toBe(false);

    expect(
      gate({ pathname: Routes.MENU }),
    ).toBe(false);
  });

  it("respects both preference switches", () => {
    expect(
      gate({ guidanceEnabled: false }),
    ).toBe(false);

    expect(
      gate({ vibrationEnabled: false }),
    ).toBe(false);
  });

  it("shows at most once per app session", () => {
    expect(
      gate({ shownThisSession: true }),
    ).toBe(false);
  });
});
