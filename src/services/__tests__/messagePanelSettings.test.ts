import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  loadMessagePanelIntroSeen,
  loadMessagePanelSetting,
  markMessagePanelIntroSeen,
  saveMessagePanelSetting,
} from "@/services/settings";

const MESSAGE_PANEL_KEY = "adlawatt.messagePanel.v1";
const MESSAGE_PANEL_INTRO_KEY =
  "adlawatt.messagePanel.intro.v1";

describe("message panel settings", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("defaults the guidance switch to ON when unset", async () => {
    await expect(
      loadMessagePanelSetting(),
    ).resolves.toBe(true);
  });

  it("persists OFF and back ON", async () => {
    await saveMessagePanelSetting(false);
    await expect(
      loadMessagePanelSetting(),
    ).resolves.toBe(false);

    await saveMessagePanelSetting(true);
    await expect(
      loadMessagePanelSetting(),
    ).resolves.toBe(true);
  });

  it("treats stored false strings as OFF", async () => {
    await AsyncStorage.setItem(
      MESSAGE_PANEL_KEY,
      "false",
    );

    await expect(
      loadMessagePanelSetting(),
    ).resolves.toBe(false);
  });

  it("treats unknown stored values as ON", async () => {
    await AsyncStorage.setItem(
      MESSAGE_PANEL_KEY,
      "banana",
    );

    await expect(
      loadMessagePanelSetting(),
    ).resolves.toBe(true);
  });

  it("records the intro as not seen by default", async () => {
    await expect(
      loadMessagePanelIntroSeen(),
    ).resolves.toBe(false);
  });

  it("marks the intro seen and keeps it across reads", async () => {
    await markMessagePanelIntroSeen();

    await expect(
      loadMessagePanelIntroSeen(),
    ).resolves.toBe(true);

    await expect(
      AsyncStorage.getItem(
        MESSAGE_PANEL_INTRO_KEY,
      ),
    ).resolves.toBe("1");
  });
});
