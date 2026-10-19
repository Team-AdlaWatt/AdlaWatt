// Battery reference constant unit tests.
//
// The recommendation engine, the battery gauge, and the
// appliance wattage caps all read these values, so they are
// pinned here to catch accidental drift. The capacity was
// raised from 720 Wh to 756 Wh; 756 is now the basis.

import {
  BATTERY_CAPACITY_WH,
  BATTERY_MAX_APPLIANCE_W,
  BATTERY_RESERVE_WH,
  BATTERY_USABLE_WH,
} from "@/constants/battery";

describe("battery reference constants", () => {
  test("capacity is the 756 Wh bank basis", () => {
    expect(BATTERY_CAPACITY_WH).toBe(756);
  });

  test("reserve is the 20% floor", () => {
    expect(BATTERY_RESERVE_WH).toBe(151.2);
    expect(BATTERY_RESERVE_WH).toBeCloseTo(
      BATTERY_CAPACITY_WH * 0.2,
      6,
    );
  });

  test("usable is the 80% window", () => {
    expect(BATTERY_USABLE_WH).toBe(604.8);
  });

  test("reserve + usable equals the full capacity", () => {
    expect(
      BATTERY_RESERVE_WH + BATTERY_USABLE_WH,
    ).toBeCloseTo(BATTERY_CAPACITY_WH, 6);
  });

  test("appliance cap equals the capacity", () => {
    expect(BATTERY_MAX_APPLIANCE_W).toBe(
      BATTERY_CAPACITY_WH,
    );
  });
});
