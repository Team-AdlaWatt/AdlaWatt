// ============================================================
// REQUEST TIMEOUT GUARD
//
// Supabase reads have no client-side deadline. On a stalled
// network (venue Wi-Fi, dead hotspot) the promise never
// settles, so screens spin forever instead of falling back to
// cache / empty state. Race the operation against a timer so
// the UI always unblocks. The underlying fetch is left to the
// transport; only our await is released.
// ============================================================

export const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  message = "Request timed out.",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new TimeoutError(message));
    }, timeoutMs);

    Promise.resolve(operation).then(
      (value) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
