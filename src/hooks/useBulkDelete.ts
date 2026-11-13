import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

interface UseBulkDeleteOptions {
  deleteFn: (id: number) => Promise<unknown>;
  entityKey: string;
  successKey?: string;
  onSuccess: () => void;
}

export function useBulkDelete({
  deleteFn,
  entityKey,
  successKey,
  onSuccess,
}: UseBulkDeleteOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const handleBulkDelete = useCallback(
    async (selectedIds: Set<number>) => {
      if (selectedIds.size === 0) return;
      try {
        const idsArray = Array.from(selectedIds);
        let successCount = 0;
        let errorCount = 0;

        for (const id of idsArray) {
          try {
            await deleteFn(id);
            successCount++;
          } catch (err) {
            console.warn(`Bulk delete: failed to delete id=${id}`, err);
            errorCount++;
          }
        }

        setBulkDeleteConfirm(false);

        if (errorCount === 0) {
          toast.success(t(successKey ?? `${entityKey}.bulkDeleteSuccess`, { count: successCount }));
        } else if (successCount === 0) {
          toast.error(t('common.bulkDeleteError'));
        } else {
          toast.warning(
            t(`${entityKey}.bulkDeletePartial`, { success: successCount, error: errorCount })
          );
        }

        onSuccess();
      } catch (error) {
        console.error('Bulk delete error:', error);
        toast.error(t('common.bulkDeleteError'));
      }
    },
    [deleteFn, entityKey, successKey, onSuccess, t, toast]
  );

  return { bulkDeleteConfirm, setBulkDeleteConfirm, handleBulkDelete };
}
