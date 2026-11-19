import {
  checkAndFetchUpdate,
} from "@/services/appUpdateService";

describe("checkAndFetchUpdate", () => {
  test("skips download when no update is available", async () => {
    const checkForUpdateAsync = jest
      .fn()
      .mockResolvedValue({ isAvailable: false });
    const fetchUpdateAsync = jest.fn();

    await expect(
      checkAndFetchUpdate({
        checkForUpdateAsync,
        fetchUpdateAsync,
      }),
    ).resolves.toBe("up_to_date");

    expect(fetchUpdateAsync).not.toHaveBeenCalled();
  });

  test("downloads an available update", async () => {
    const checkForUpdateAsync = jest
      .fn()
      .mockResolvedValue({ isAvailable: true });
    const fetchUpdateAsync = jest
      .fn()
      .mockResolvedValue({ isNew: true });

    await expect(
      checkAndFetchUpdate({
        checkForUpdateAsync,
        fetchUpdateAsync,
      }),
    ).resolves.toBe("downloaded");

    expect(
      fetchUpdateAsync,
    ).toHaveBeenCalledTimes(1);
  });

  test("treats a stale fetch as up to date", async () => {
    const checkForUpdateAsync = jest
      .fn()
      .mockResolvedValue({ isAvailable: true });
    const fetchUpdateAsync = jest
      .fn()
      .mockResolvedValue({ isNew: false });

    await expect(
      checkAndFetchUpdate({
        checkForUpdateAsync,
        fetchUpdateAsync,
      }),
    ).resolves.toBe("up_to_date");
  });
});
