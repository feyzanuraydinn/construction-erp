import { useState, useCallback } from 'react';

export function useSelection<T = number>(initial: readonly T[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(() => new Set(initial));

  const handleSelectAll = useCallback((ids: readonly T[], checked: boolean) => {
    setSelectedIds(checked ? new Set(ids) : new Set());
  }, []);

  const handleSelectOne = useCallback((id: T, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const keepOnly = useCallback((ids: readonly T[]) => {
    const visible = new Set(ids);
    setSelectedIds((prev) => {
      const kept = new Set([...prev].filter((id) => visible.has(id)));
      return kept.size === prev.size ? prev : kept;
    });
  }, []);

  return { selectedIds, handleSelectAll, handleSelectOne, clearSelection, keepOnly };
}
