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

  it("shows on re-enable from Preferences after the intro", () => {
    expect(
      gate({
        pathname: Routes.PREFERENCES,
        introSeen: true,
        shownThisSession: true,
        source: "reenable",
      }),
    ).toBe(true);
  });

  it("still hides re-enable when guidance or vibration is off", () => {
    expect(
      gate({
        guidanceEnabled: false,
        source: "reenable",
      }),
    ).toBe(false);

    expect(
      gate({
        vibrationEnabled: false,
        source: "reenable",
      }),
    ).toBe(false);
  });

  it("still hides re-enable on web or in the background", () => {
    expect(
      gate({
        platformOS: "web",
        source: "reenable",
      }),
    ).toBe(false);

    expect(
      gate({
        appState: "background",
        source: "reenable",
      }),
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

  it("suppresses on Notifications, Menu, and Preferences", () => {
    expect(
      gate({ pathname: Routes.NOTIFICATIONS }),
    ).toBe(false);

    expect(
      gate({ pathname: Routes.MENU }),
    ).toBe(false);

    expect(
      gate({ pathname: Routes.PREFERENCES }),
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
