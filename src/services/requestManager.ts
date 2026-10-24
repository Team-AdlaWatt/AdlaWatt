// ============================================================
// REQUEST MANAGER
//
// Centralized request coalescing and deduplication to prevent
// redundant database/API calls across the app. Multiple callers
// requesting the same resource simultaneously share the same
// in-flight promise.
// ============================================================

type RequestKey = string;

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestManager {
  private inFlight = new Map<RequestKey, InFlightRequest<unknown>>();

  /**
   * Execute a request with deduplication. If an identical request
   * is already in-flight, return the shared promise.
   */
  async execute<T>(
    key: RequestKey,
    factory: () => Promise<T>,
    options?: {
      /** Force a new request even if one is in-flight */
      force?: boolean;
      /** Maximum age of in-flight request to consider reusable (ms) */
      maxAge?: number;
    }
  ): Promise<T> {
    const { force = false, maxAge = 30000 } = options ?? {};

    if (!force) {
      const existing = this.inFlight.get(key) as InFlightRequest<T> | undefined;
      if (existing) {
        const age = Date.now() - existing.timestamp;
        if (age < maxAge) {
          return existing.promise;
        }
        // Stale in-flight request, remove it
        this.inFlight.delete(key);
      }
    }

    const promise = factory().finally(() => {
      // Remove from in-flight map when completed
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Check if a request is currently in-flight
   */
  isInFlight(key: RequestKey): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Cancel/clear a specific request
   */
  clear(key: RequestKey): void {
    this.inFlight.delete(key);
  }

  /**
   * Clear all in-flight requests
   */
  clearAll(): void {
    this.inFlight.clear();
  }

  /**
   * Generate a key for user-scoped requests
   */
  static userKey(userId: string, resource: string, params?: string): string {
    return `${resource}:user:${userId}${params ? `:${params}` : ""}`;
  }

  /**
   * Generate a key for location-scoped requests
   */
  static locationKey(resource: string, lat: number, lon: number): string {
    // Round to 4 decimal places for consistency
    const latKey = lat.toFixed(4);
    const lonKey = lon.toFixed(4);
    return `${resource}:loc:${latKey},${lonKey}`;
  }
}

export const requestManager = new RequestManager();
