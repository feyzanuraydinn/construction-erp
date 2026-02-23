import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useDataCache,
  invalidateCache,
  invalidateCachePattern,
  clearAllCache,
} from '../../hooks/useDataCache';

// Clear the global cache between tests
beforeEach(() => {
  clearAllCache();
  vi.restoreAllMocks();
});

describe('useDataCache', () => {
  it('should fetch data on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });

    const { result } = renderHook(() =>
      useDataCache('test-key-1', fetcher)
    );

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

    const { result, unmount } = renderHook(() =>
      useDataCache('test-key-2', fetcher, { ttl: 60000 })
    );

    await waitFor(() => {
      expect(result.current.data).toBe('cached-value');
    });

    expect(fetcher).toHaveBeenCalledOnce();

    unmount();

    // Re-render with same key — should use cache
    const { result: result2 } = renderHook(() =>
      useDataCache('test-key-2', fetcher, { ttl: 60000 })
    );

    // data should come from cache immediately
    expect(result2.current.data).toBe('cached-value');
  });

  it('should handle fetch errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useDataCache('error-key', fetcher)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should handle non-Error thrown values', async () => {
    const fetcher = vi.fn().mockRejectedValue('string error');

    const { result } = renderHook(() =>
      useDataCache('non-error-key', fetcher)
    );

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

    const { result } = renderHook(() =>
      useDataCache('refresh-key', fetcher)
    );

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

    const { result } = renderHook(() =>
      useDataCache('inv-key', fetcher)
    );

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

    const { result } = renderHook(() =>
      useDataCache('stale-key', fetcher, { ttl: 60000 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isStale).toBe(false);
  });

  it('should start with loading=false if cache already exists', async () => {
    const fetcher = vi.fn().mockResolvedValue('first');

    // First render populates cache
    const { unmount } = renderHook(() =>
      useDataCache('preloaded-key', fetcher, { ttl: 60000 })
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledOnce();
    });

    unmount();

    // Second render should not be loading since cache exists
    const { result } = renderHook(() =>
      useDataCache('preloaded-key', fetcher, { ttl: 60000 })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('first');
  });
});

describe('invalidateCache', () => {
  it('should trigger re-fetch for a specific cache key', async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`val-${callCount}`);
    });

    const { result } = renderHook(() =>
      useDataCache('global-inv-key', fetcher)
    );

    await waitFor(() => {
      expect(result.current.data).toBe('val-1');
    });

    act(() => {
      invalidateCache('global-inv-key');
    });

    await waitFor(() => {
      expect(result.current.data).toBe('val-2');
    });
  });

  it('should not affect other cache keys', async () => {
    const fetcher1 = vi.fn().mockResolvedValue('a');
    const fetcher2 = vi.fn().mockResolvedValue('b');

    const { result: r1 } = renderHook(() => useDataCache('key-a', fetcher1));
    const { result: r2 } = renderHook(() => useDataCache('key-b', fetcher2));

    await waitFor(() => {
      expect(r1.current.data).toBe('a');
      expect(r2.current.data).toBe('b');
    });

    act(() => {
      invalidateCache('key-a');
    });

    // fetcher2 should not be called again
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

    const { result: r1 } = renderHook(() => useDataCache('company:list', fetcher1));
    const { result: r2 } = renderHook(() => useDataCache('project:list', fetcher2));

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

    // project should not be re-fetched
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

    const { result } = renderHook(() => useDataCache('clear-key', fetcher));

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
