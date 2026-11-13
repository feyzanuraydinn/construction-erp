import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLatest } from './useLatest';

interface CacheState<T> {
  data: T | null;
  timestamp: number | null;
  fetching: boolean;
  error: Error | null;
  version: number;
}

export interface CacheKey<T> {
  readonly name: string;
  readonly listeners: Set<() => void>;
  state: CacheState<T>;
  inflight: Promise<void> | null;
}

interface CacheOptions {
  refreshInterval?: number;
}

interface UseDataCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  refresh: () => Promise<void>;
  invalidate: () => void;
}

interface RegisteredKey {
  readonly name: string;
  timestamp: () => number | null;
  reset: (keepData: boolean) => void;
}

const MAX_CACHE_SIZE = 100;
const EMPTY_STATE = { data: null, timestamp: null, fetching: false, error: null, version: 0 };
const registry = new Set<RegisteredKey>();

function update<T>(key: CacheKey<T>, patch: Partial<CacheState<T>>): void {
  key.state = { ...key.state, ...patch };
  key.listeners.forEach((listener) => listener());
}

function markOutdated<T>(key: CacheKey<T>, keepData: boolean): void {
  key.inflight = null;
  update(key, {
    fetching: false,
    timestamp: null,
    version: key.state.version + 1,
    ...(keepData ? {} : { data: null, error: null }),
  });
}

export function createCacheKey<T>(name: string): CacheKey<T> {
  const key: CacheKey<T> = {
    name,
    listeners: new Set(),
    state: { ...EMPTY_STATE },
    inflight: null,
  };
  registry.add({
    name,
    timestamp: () => key.state.timestamp,
    reset: (keepData) => markOutdated(key, keepData),
  });
  return key;
}

function enforceCacheLimit(): void {
  const filled = [...registry].filter((key) => key.timestamp() !== null);
  if (filled.length <= MAX_CACHE_SIZE) return;
  filled
    .sort((a, b) => (a.timestamp() ?? 0) - (b.timestamp() ?? 0))
    .slice(0, filled.length - MAX_CACHE_SIZE)
    .forEach((key) => key.reset(false));
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unknown error');
}

function load<T>(key: CacheKey<T>, fetcher: () => Promise<T>): Promise<void> {
  if (key.inflight) return key.inflight;
  update(key, { fetching: true });
  const request: Promise<void> = fetcher()
    .then((data) => {
      if (key.inflight !== request) return;
      update(key, { data, timestamp: Date.now(), fetching: false, error: null });
      enforceCacheLimit();
    })
    .catch((error: unknown) => {
      if (key.inflight === request) update(key, { fetching: false, error: toError(error) });
    })
    .finally(() => {
      if (key.inflight === request) key.inflight = null;
    });
  key.inflight = request;
  return request;
}

function reload<T>(key: CacheKey<T>, fetcher: () => Promise<T>): Promise<void> {
  key.inflight = null;
  return load(key, fetcher);
}

export function invalidateCachePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  registry.forEach((key) => {
    if (key.timestamp() !== null && regex.test(key.name)) key.reset(true);
  });
}

export function clearAllCache(): void {
  registry.forEach((key) => key.reset(false));
}

export function useDataCache<T>(
  key: CacheKey<T>,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): UseDataCacheReturn<T> {
  const { refreshInterval } = options;
  const subscribe = useCallback(
    (listener: () => void) => {
      key.listeners.add(listener);
      return () => {
        key.listeners.delete(listener);
      };
    },
    [key]
  );
  const state = useSyncExternalStore(subscribe, () => key.state);
  const fetcherRef = useLatest(fetcher);

  useEffect(() => {
    void load(key, () => fetcherRef.current());
  }, [key, state.version, fetcherRef]);

  useEffect(() => {
    if (!refreshInterval) return;
    const intervalId = setInterval(
      () => void load(key, () => fetcherRef.current()),
      refreshInterval
    );
    return () => clearInterval(intervalId);
  }, [key, refreshInterval, fetcherRef]);

  const refresh = useCallback(() => reload(key, () => fetcherRef.current()), [key, fetcherRef]);

  const invalidate = useCallback(() => markOutdated(key, true), [key]);

  return {
    data: state.data,
    loading: state.data === null && state.error === null,
    error: state.error,
    isStale: state.fetching && state.data !== null,
    refresh,
    invalidate,
  };
}
