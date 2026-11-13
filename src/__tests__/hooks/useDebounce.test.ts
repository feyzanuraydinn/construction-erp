import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../../hooks/useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should not update value before delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'updated', delay: 500 });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('initial');
  });

  it('should update value after delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should reset timer when value changes rapidly', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'first', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({ value: 'second', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('initial');

    rerender({ value: 'third', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('third');
  });

  it('should work with different delay values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 1000 },
    });

    rerender({ value: 'updated', delay: 1000 });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 0 },
    });

    rerender({ value: 'updated', delay: 0 });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });

  it('should work with object values', () => {
    const initialObj = { name: 'test' };
    const updatedObj = { name: 'updated' };

    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: initialObj, delay: 500 },
    });

    expect(result.current).toBe(initialObj);

    rerender({ value: updatedObj, delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(updatedObj);
  });

  it('should work with null values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial' as string | null, delay: 500 },
    });

    rerender({ value: null, delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(null);
  });

  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'updated', delay: 500 });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
