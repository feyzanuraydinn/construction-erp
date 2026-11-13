import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoCollapse } from '../../hooks/useAutoCollapse';

const originalWidth = window.innerWidth;

function resizeTo(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  window.dispatchEvent(new Event('resize'));
}

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: originalWidth,
  });
});

describe('useAutoCollapse', () => {
  it('starts collapsed on a narrow window and open on a wide one', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1200,
    });
    expect(renderHook(() => useAutoCollapse(1279)).result.current[0]).toBe(true);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1707,
    });
    expect(renderHook(() => useAutoCollapse(1279)).result.current[0]).toBe(false);
  });

  it('does not flash closed while the window is still hidden', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 0 });
    const { result } = renderHook(() => useAutoCollapse(1279));
    expect(result.current[0]).toBe(false);

    act(() => resizeTo(1707));
    expect(result.current[0]).toBe(false);
  });

  it('collapses once when a hidden window opens on a narrow screen', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 0 });
    const { result } = renderHook(() => useAutoCollapse(1279));

    act(() => resizeTo(1200));

    expect(result.current[0]).toBe(true);
  });

  it('keeps a manual choice until the window crosses the limit', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1707,
    });
    const { result } = renderHook(() => useAutoCollapse(1279));

    act(() => result.current[1](true));
    act(() => resizeTo(1600));
    expect(result.current[0]).toBe(true);

    act(() => resizeTo(1200));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    act(() => resizeTo(1250));
    expect(result.current[0]).toBe(false);

    act(() => resizeTo(1500));
    expect(result.current[0]).toBe(false);
    act(() => resizeTo(1100));
    expect(result.current[0]).toBe(true);
  });
});
