import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  loadVibrationSetting,
  saveVibrationSetting,
} from "@/services/settings";

const VIBRATION_KEY = "adlawatt.vibration.v1";

describe("vibration settings", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("defaults vibration to ON when unset", async () => {
    await expect(
      loadVibrationSetting(),
    ).resolves.toBe(true);
  });

  it("persists OFF and back ON", async () => {
    await saveVibrationSetting(false);
    await expect(
      loadVibrationSetting(),
    ).resolves.toBe(false);

    await saveVibrationSetting(true);
    await expect(
      loadVibrationSetting(),
    ).resolves.toBe(true);
  });

  it("treats stored false strings as OFF", async () => {
    await AsyncStorage.setItem(VIBRATION_KEY, "false");

    await expect(
      loadVibrationSetting(),
    ).resolves.toBe(false);
  });

  it("treats unknown stored values as ON", async () => {
    await AsyncStorage.setItem(
      VIBRATION_KEY,
      "banana",
    );

    await expect(
      loadVibrationSetting(),
    ).resolves.toBe(true);
  });
});
