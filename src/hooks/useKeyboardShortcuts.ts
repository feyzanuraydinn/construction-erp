import { useEffect } from 'react';
import { useLatest } from './useLatest';

interface ShortcutHandlers {
  onNew?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useLatest(handlers);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const isTyping =
        target !== null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      const dialogOpen = document.querySelector('[aria-modal="true"]') !== null;

      if (
        event.ctrlKey &&
        (event.code === 'KeyN' || event.key.toLowerCase() === 'n') &&
        !isTyping &&
        !dialogOpen
      ) {
        event.preventDefault();
        event.stopPropagation();
        handlersRef.current.onNew?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handlersRef]);
}
