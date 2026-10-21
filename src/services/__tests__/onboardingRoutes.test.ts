import {
  resolveOnboardingAwareRoute,
} from "@/services/auth";

// ============================================================
// ROUTE RESOLVER (first-run onboarding gate)
//
// Contract: only users.onboarding_completed === true reaches
// the dashboard; everything else (false, missing flag) lands
// on /onboarding. Admin bypasses onboarding entirely, and
// call sites pass true when the profile read itself failed
// so a transient error never strands the user on the panel.
// ============================================================

describe("resolveOnboardingAwareRoute", () => {
  it("routes first-time household users to onboarding", () => {
    expect(
      resolveOnboardingAwareRoute("household", false),
    ).toBe("/onboarding");
  });

  it("routes onboarded household users to the dashboard", () => {
    expect(
      resolveOnboardingAwareRoute("household", true),
    ).toBe("/dashboard");
  });

  it("shows onboarding when the flag is missing", () => {
    expect(
      resolveOnboardingAwareRoute("household", undefined),
    ).toBe("/onboarding");
  });

  it("never onboards admin accounts", () => {
    expect(
      resolveOnboardingAwareRoute("admin", false),
    ).toBe("/admin");
    expect(
      resolveOnboardingAwareRoute("admin", true),
    ).toBe("/admin");
  });

  it("falls back to onboarding for unknown roles", () => {
    expect(
      resolveOnboardingAwareRoute(null, false),
    ).toBe("/onboarding");
    expect(
      resolveOnboardingAwareRoute(undefined, true),
    ).toBe("/dashboard");
  });
});
