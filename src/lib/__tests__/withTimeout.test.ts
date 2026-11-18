import {
  TimeoutError,
  withTimeout,
} from "@/lib/withTimeout";

describe("withTimeout", () => {
  test("resolves when the operation settles first", async () => {
    await expect(
      withTimeout(
        Promise.resolve("ok"),
        50,
      ),
    ).resolves.toBe("ok");
  });

  test("propagates the operation error", async () => {
    await expect(
      withTimeout(
        Promise.reject(new Error("boom")),
        50,
      ),
    ).rejects.toThrow("boom");
  });

  test("rejects with TimeoutError when the timer wins", async () => {
    await expect(
      withTimeout(
        new Promise(() => {}),
        5,
        "stalled",
      ),
    ).rejects.toThrow(TimeoutError);

    await expect(
      withTimeout(
        new Promise(() => {}),
        5,
        "stalled",
      ),
    ).rejects.toThrow("stalled");
  });
});
