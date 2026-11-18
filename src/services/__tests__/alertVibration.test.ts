import { Vibration } from "react-native";

import { getAuthenticatedUserSafe, supabase } from "@/lib/supabase";
import {
  stopAlertVibration,
  subscribeAlertVibration,
  syncAlertVibration,
  type AlertVibrationTrigger,
} from "@/services/alertVibration";
import { loadVibrationSetting } from "@/services/settings";

jest.mock("@/lib/supabase", () => ({
  getAuthenticatedUserSafe: jest.fn(),
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/services/settings", () => ({
  loadVibrationSetting: jest.fn(),
}));

const mockedGetUser = getAuthenticatedUserSafe as jest.Mock;
const mockedFrom = supabase.from as jest.Mock;
const mockedLoadVibrationSetting =
  loadVibrationSetting as jest.Mock;
const vibrateSpy = jest
  .spyOn(Vibration, "vibrate")
  .mockImplementation(() => {});
const cancelSpy = jest
  .spyOn(Vibration, "cancel")
  .mockImplementation(() => {});

const queryWith = (rows: unknown[]) => {
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({
      data: rows,
      error: null,
    }),
  };

  mockedFrom.mockReturnValue(query);
};

afterAll(() => {
  vibrateSpy.mockRestore();
  cancelSpy.mockRestore();
});

describe("syncAlertVibration reenable trigger", () => {
  beforeEach(() => {
    stopAlertVibration();
    jest.clearAllMocks();

    mockedGetUser.mockResolvedValue({ id: "user-1" });
    mockedLoadVibrationSetting.mockResolvedValue(true);
  });

  afterEach(() => {
    stopAlertVibration();
  });

  it("emits the reenable trigger when an unread alert starts a buzz", async () => {
    queryWith([{ notif_id: "alert-1" }]);

    const events: [boolean, AlertVibrationTrigger][] =
      [];
    const unsubscribe = subscribeAlertVibration(
      (active, trigger) => {
        events.push([active, trigger]);
      },
    );

    await syncAlertVibration("reenable");

    expect(events).toEqual([[true, "reenable"]]);
    expect(vibrateSpy).toHaveBeenCalled();
    unsubscribe();
  });

  it("does not start a buzz when there are no unread alerts", async () => {
    queryWith([]);

    const events: [boolean, AlertVibrationTrigger][] =
      [];
    const unsubscribe = subscribeAlertVibration(
      (active, trigger) => {
        events.push([active, trigger]);
      },
    );

    await syncAlertVibration("reenable");

    expect(events).toEqual([[false, "reenable"]]);
    expect(vibrateSpy).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not emit a reenable start when vibration is OFF", async () => {
    mockedLoadVibrationSetting.mockResolvedValue(false);
    queryWith([{ notif_id: "alert-1" }]);

    const events: [boolean, AlertVibrationTrigger][] =
      [];
    const unsubscribe = subscribeAlertVibration(
      (active, trigger) => {
        events.push([active, trigger]);
      },
    );

    await syncAlertVibration("reenable");

    expect(events).toEqual([]);
    expect(vibrateSpy).not.toHaveBeenCalled();
    unsubscribe();
  });
});
