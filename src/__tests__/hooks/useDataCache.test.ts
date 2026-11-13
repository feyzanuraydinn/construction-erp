import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useDataCache,
  invalidateCachePattern,
  clearAllCache,
  createCacheKey,
  type CacheKey,
} from '../../hooks/useDataCache';

const keys = new Map<string, CacheKey<unknown>>();
function key(name: string): CacheKey<unknown> {
  const existing = keys.get(name);
  if (existing) return existing;
  const created = createCacheKey<unknown>(name);
  keys.set(name, created);
  return created;
}

beforeEach(() => {
  clearAllCache();
  vi.restoreAllMocks();
});

describe('useDataCache', () => {
  it('should fetch data on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });

    const { result } = renderHook(() => useDataCache(key('test-key-1'), fetcher));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual({ items: [1, 2, 3] });
    expect(result.current.error).toBeNull();
  });

  it('should return cached data for same key without re-fetching', async () => {
    const fetcher = vi.fn().mockResolvedValue('cached-value');

    const { result, unmount } = renderHook(() => useDataCache(key('test-key-2'), fetcher));

    await waitFor(() => {
      expect(result.current.data).toBe('cached-value');
    });

    expect(fetcher).toHaveBeenCalledOnce();

    unmount();

    const { result: result2 } = renderHook(() => useDataCache(key('test-key-2'), fetcher));

    expect(result2.current.data).toBe('cached-value');
  });

  it('should handle fetch errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDataCache(key('error-key'), fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should handle non-Error thrown values', async () => {
    const fetcher = vi.fn().mockRejectedValue('string error');

    const { result } = renderHook(() => useDataCache(key('non-error-key'), fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Unknown error');
  });

  it('should refresh data when refresh is called', async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`data-${callCount}`);
    });

    const { result } = renderHook(() => useDataCache(key('refresh-key'), fetcher));

    await waitFor(() => {
      expect(result.current.data).toBe('data-1');
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toBe('data-2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should invalidate cache when invalidate is called', async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`data-${callCount}`);
    });

    const { result } = renderHook(() => useDataCache(key('inv-key'), fetcher));

    await waitFor(() => {
      expect(result.current.data).toBe('data-1');
    });

    act(() => {
      result.current.invalidate();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('data-2');
    });
  });

  it('should return isStale=false when cache is fresh', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');

    const { result } = renderHook(() => useDataCache(key('stale-key'), fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isStale).toBe(false);
  });

  it('should start with loading=false if cache already exists', async () => {
    const fetcher = vi.fn().mockResolvedValue('first');

    const { unmount } = renderHook(() => useDataCache(key('preloaded-key'), fetcher));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledOnce();
    });

    unmount();

    const { result } = renderHook(() => useDataCache(key('preloaded-key'), fetcher));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('first');
  });
});

describe('invalidate', () => {
  it('should trigger re-fetch for a specific cache key', async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`val-${callCount}`);
    });

    const { result } = renderHook(() => useDataCache(key('global-inv-key'), fetcher));

    await waitFor(() => {
      expect(result.current.data).toBe('val-1');
    });

    act(() => {
      result.current.invalidate();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('val-2');
    });
  });

  it('should not affect other cache keys', async () => {
    const fetcher1 = vi.fn().mockResolvedValue('a');
    const fetcher2 = vi.fn().mockResolvedValue('b');

    const { result: r1 } = renderHook(() => useDataCache(key('key-a'), fetcher1));
    const { result: r2 } = renderHook(() => useDataCache(key('key-b'), fetcher2));

    await waitFor(() => {
      expect(r1.current.data).toBe('a');
      expect(r2.current.data).toBe('b');
    });

    act(() => {
      r1.current.invalidate();
    });

    expect(fetcher2).toHaveBeenCalledOnce();
  });
});

describe('invalidateCachePattern', () => {
  it('should invalidate cache keys matching a regex pattern', async () => {
    let count1 = 0;
    let count2 = 0;
    const fetcher1 = vi.fn().mockImplementation(() => {
      count1++;
      return Promise.resolve(`company-${count1}`);
    });
    const fetcher2 = vi.fn().mockImplementation(() => {
      count2++;
      return Promise.resolve(`project-${count2}`);
    });

    const { result: r1 } = renderHook(() => useDataCache(key('company:list'), fetcher1));
    const { result: r2 } = renderHook(() => useDataCache(key('project:list'), fetcher2));

    await waitFor(() => {
      expect(r1.current.data).toBe('company-1');
      expect(r2.current.data).toBe('project-1');
    });

    act(() => {
      invalidateCachePattern('^company:');
    });

    await waitFor(() => {
      expect(r1.current.data).toBe('company-2');
    });

    expect(fetcher2).toHaveBeenCalledOnce();
  });
});

describe('clearAllCache', () => {
  it('should clear all cached entries and trigger re-fetches', async () => {
    let count = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      count++;
      return Promise.resolve(`clear-${count}`);
    });

    const { result } = renderHook(() => useDataCache(key('clear-key'), fetcher));

    await waitFor(() => {
      expect(result.current.data).toBe('clear-1');
    });

    act(() => {
      clearAllCache();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('clear-2');
    });
  });
});
