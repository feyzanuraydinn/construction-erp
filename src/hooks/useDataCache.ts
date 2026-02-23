import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  /** Cache duration in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Auto-refresh interval in milliseconds (optional) */
  refreshInterval?: number;
  /** Stale while revalidate - show stale data while fetching fresh (default: true) */
  staleWhileRevalidate?: boolean;
}

interface UseDataCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  refresh: () => Promise<void>;
  invalidate: () => void;
}

// Global cache storage with size limit
const MAX_CACHE_SIZE = 100; // Maximum number of cache entries
const globalCache = new Map<string, CacheEntry<unknown>>();

// Global cache invalidation callbacks
const invalidationCallbacks = new Map<string, Set<() => void>>();

/**
 * Enforce cache size limit using LRU-like eviction (oldest entries first)
 */
function enforceCacheLimit(): void {
  if (globalCache.size <= MAX_CACHE_SIZE) return;

  // Sort entries by timestamp (oldest first) and remove excess
  const entries = Array.from(globalCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);

  const toRemove = entries.slice(0, globalCache.size - MAX_CACHE_SIZE);
  toRemove.forEach(([key]) => {
    globalCache.delete(key);
    invalidationCallbacks.delete(key);
  });
}

/**
 * Register a callback to be called when a cache key is invalidated.
 * Returns a cleanup function that MUST be called on unmount.
 */
function onCacheInvalidate(key: string, callback: () => void): () => void {
  if (!invalidationCallbacks.has(key)) {
    invalidationCallbacks.set(key, new Set());
  }
  invalidationCallbacks.get(key)!.add(callback);

  // Return cleanup function
  return () => {
    const callbacks = invalidationCallbacks.get(key);
    if (callbacks) {
      callbacks.delete(callback);
      // Clean up empty sets to prevent Map from growing unbounded
      if (callbacks.size === 0) {
        invalidationCallbacks.delete(key);
      }
    }
  };
}

/**
 * Invalidate a specific cache key globally
 */
export function invalidateCache(key: string): void {
  globalCache.delete(key);
  invalidationCallbacks.get(key)?.forEach((cb) => cb());
}

/**
 * Invalidate all cache entries matching a pattern
 */
export function invalidateCachePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  const keysToDelete: string[] = [];

  globalCache.forEach((_, key) => {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    globalCache.delete(key);
    invalidationCallbacks.get(key)?.forEach((cb) => cb());
  });
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  // Notify all listeners before clearing
  invalidationCallbacks.forEach((callbacks) => {
    callbacks.forEach((cb) => cb());
  });
  globalCache.clear();
  // Don't clear invalidationCallbacks here — active components still hold refs.
  // They will be cleaned up when components unmount via their cleanup functions.
}

/**
 * Hook for caching data fetched from async functions
 */
export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): UseDataCacheReturn<T> {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    refreshInterval,
    staleWhileRevalidate = true,
  } = options;

  const [data, setData] = useState<T | null>(() => {
    const cached = globalCache.get(key) as CacheEntry<T> | undefined;
    return cached?.data ?? null;
  });
  const [loading, setLoading] = useState<boolean>(!globalCache.has(key));
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(() => {
    const cached = globalCache.get(key);
    if (!cached) return true;
    return Date.now() - cached.timestamp > ttl;
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(
    async (showLoading = true) => {
      const cached = globalCache.get(key) as CacheEntry<T> | undefined;
      const isCacheFresh = cached && Date.now() - cached.timestamp < ttl;

      // If cache is fresh, just use it
      if (isCacheFresh && !showLoading) {
        setData(cached.data);
        setIsStale(false);
        return;
      }

      // If staleWhileRevalidate is enabled and we have cached data, show it immediately
      if (staleWhileRevalidate && cached) {
        setData(cached.data);
        setIsStale(true);
      }

      if (showLoading && !cached) {
        setLoading(true);
      }

      try {
        const freshData = await fetcherRef.current();

        // Update cache
        globalCache.set(key, {
          data: freshData,
          timestamp: Date.now(),
        });

        // Enforce cache size limit
        enforceCacheLimit();

        setData(freshData);
        setIsStale(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Keep showing stale data if available
        if (!cached) {
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [key, ttl, staleWhileRevalidate]
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const intervalId = setInterval(() => {
      fetchData(false);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchData, refreshInterval]);

  // Listen for cache invalidation
  useEffect(() => {
    return onCacheInvalidate(key, () => {
      fetchData(true);
    });
  }, [key, fetchData]);

  const refresh = useCallback(async () => {
    globalCache.delete(key);
    await fetchData(true);
  }, [key, fetchData]);

  const invalidate = useCallback(() => {
    invalidateCache(key);
  }, [key]);

  return {
    data,
    loading,
    error,
    isStale,
    refresh,
    invalidate,
  };
}

/**
 * Hook for caching multiple related data fetches.
 *
 * Uses stable key serialization to avoid infinite re-render loops
 * caused by unstable `fetchers` object references.
 */
export function useMultiDataCache<T extends Record<string, unknown>>(
  keyPrefix: string,
  fetchers: { [K in keyof T]: () => Promise<T[K]> },
  options: CacheOptions = {}
): {
  data: Partial<T>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  // Stabilize keys to avoid re-creating fetchAll on every render
  const fetcherKeys = Object.keys(fetchers) as (keyof T)[];
  const stableKeysStr = fetcherKeys.join(',');
  // fetcherKeys is derived from stableKeysStr, so using stableKeysStr as dep is correct
  const stableKeys = useMemo(() => stableKeysStr.split(',') as (keyof T)[], [stableKeysStr]);

  // Keep fetchers in a ref to avoid dependency instability
  const fetchersRef = useRef(fetchers);
  fetchersRef.current = fetchers;

  const ttl = options.ttl ?? 5 * 60 * 1000;

  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        stableKeys.map(async (key) => {
          const cacheKey = `${keyPrefix}:${String(key)}`;
          const cached = globalCache.get(cacheKey) as CacheEntry<T[keyof T]> | undefined;

          if (cached && Date.now() - cached.timestamp < ttl) {
            return [key, cached.data] as const;
          }

          const freshData = await fetchersRef.current[key]();
          globalCache.set(cacheKey, {
            data: freshData,
            timestamp: Date.now(),
          });

          // Enforce cache size limit
          enforceCacheLimit();

          return [key, freshData] as const;
        })
      );

      const newData = Object.fromEntries(results) as Partial<T>;
      setData(newData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [keyPrefix, stableKeys, ttl]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    stableKeys.forEach((key) => {
      globalCache.delete(`${keyPrefix}:${String(key)}`);
    });
    await fetchAll();
  }, [keyPrefix, stableKeys, fetchAll]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
