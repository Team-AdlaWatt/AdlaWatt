// ============================================================
// MEMORY CACHE
//
// In-memory TTL-based cache for frequently accessed data.
// Faster than AsyncStorage with automatic expiration.
// ============================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Get cached data if valid (not expired)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Get data with stale-while-revalidate support
   * Returns cached data even if stale, along with staleness info
   */
  getStale<T>(key: string, maxStaleMs: number = 300000): {
    data: T | null;
    isStale: boolean;
    isExpired: boolean;
  } {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return { data: null, isStale: true, isExpired: true };
    }

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.ttl;
    const isStale = age > entry.ttl * 0.5 || isExpired; // Consider stale at 50% of TTL

    if (isExpired && age > maxStaleMs) {
      this.cache.delete(key);
      return { data: null, isStale: true, isExpired: true };
    }

    // Return data even if expired but within maxStaleMs
    return { data: entry.data, isStale, isExpired };
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete specific key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

export const memoryCache = new MemoryCache();

// Common TTL values
export const CACHE_TTL = {
  MONITORING: 30000, // 30 seconds
  WEATHER: 600000, // 10 minutes
  FORECAST: 10800000, // 3 hours
  ANALYTICS: 300000, // 5 minutes
  USER_DATA: 600000, // 10 minutes
};
