import { useState, useCallback } from 'react';

export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleSelectAll = useCallback((ids: number[], checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  }, []);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
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

  return { selectedIds, setSelectedIds, handleSelectAll, handleSelectOne, clearSelection };
}
