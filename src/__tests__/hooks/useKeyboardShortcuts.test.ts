import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts Hook', () => {
  const dispatchKeyEvent = (key: string, ctrlKey = false, metaKey = false) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey,
      metaKey,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  it('should call onNew when Ctrl+N is pressed', () => {
    const onNew = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onNew }));

    dispatchKeyEvent('n', true);
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('should call onEscape when Escape is pressed', () => {
    const onEscape = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onEscape }));

    dispatchKeyEvent('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('should not call onNew without Ctrl key', () => {
    const onNew = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onNew }));

    dispatchKeyEvent('n');
    expect(onNew).not.toHaveBeenCalled();
  });

  it('should not crash when handlers are not provided', () => {
    renderHook(() => useKeyboardShortcuts({}));

    expect(() => {
      dispatchKeyEvent('n', true);
      dispatchKeyEvent('Escape');
    }).not.toThrow();
  });

  it('should cleanup listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const onNew = vi.fn();

    const { unmount } = renderHook(() => useKeyboardShortcuts({ onNew }));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    removeEventListenerSpy.mockRestore();
  });

  it('should use latest handler references', () => {
    const onNew1 = vi.fn();
    const onNew2 = vi.fn();

    const { rerender } = renderHook(
      ({ onNew }) => useKeyboardShortcuts({ onNew }),
      { initialProps: { onNew: onNew1 } }
    );

    dispatchKeyEvent('n', true);
    expect(onNew1).toHaveBeenCalledTimes(1);

    rerender({ onNew: onNew2 });

    dispatchKeyEvent('n', true);
    expect(onNew2).toHaveBeenCalledTimes(1);
    // First handler should not be called again
    expect(onNew1).toHaveBeenCalledTimes(1);
  });
});
