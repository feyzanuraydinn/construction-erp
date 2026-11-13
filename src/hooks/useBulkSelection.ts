import { useCallback, useEffect } from 'react';
import { useSelection } from './useSelection';
import { useBulkDelete } from './useBulkDelete';

interface UseBulkSelectionOptions {
  visibleItems: readonly { id: number }[];
  deleteFn: (id: number) => Promise<unknown>;
  entityKey: string;
  successKey?: string;
  onDeleted: () => void;
}

export function useBulkSelection({
  visibleItems,
  deleteFn,
  entityKey,
  successKey,
  onDeleted,
}: UseBulkSelectionOptions) {
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection, keepOnly } =
    useSelection();

  useEffect(() => {
    keepOnly(visibleItems.map((item) => item.id));
  }, [visibleItems, keepOnly]);

  const {
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    handleBulkDelete: deleteIds,
  } = useBulkDelete({
    deleteFn,
    entityKey,
    successKey,
    onSuccess: () => {
      clearSelection();
      onDeleted();
    },
  });

  const handleBulkDelete = useCallback(() => deleteIds(selectedIds), [deleteIds, selectedIds]);

  return {
    selectedIds,
    handleSelectAll,
    handleSelectOne,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    handleBulkDelete,
  };
}
