import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useBulkSelection } from './useBulkSelection';
import type { TransactionWithDetails } from '../types';

const deleteTransaction = (id: number) => window.electronAPI.transaction.delete(id);

export function useTransactionDeletion(
  visibleTransactions: TransactionWithDetails[],
  onDeleted: () => void
) {
  const { t } = useTranslation();
  const toast = useToast();
  const [deleting, setDeleting] = useState<TransactionWithDetails | null>(null);
  const selection = useBulkSelection({
    visibleItems: visibleTransactions,
    deleteFn: deleteTransaction,
    entityKey: 'transactions',
    onDeleted,
  });

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await deleteTransaction(deleting.id);
      setDeleting(null);
      toast.success(t('shared.transactionDeleted'));
      onDeleted();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('shared.deleteError'));
    }
  }, [deleting, toast, t, onDeleted]);

  return { ...selection, deleting, setDeleting, confirmDelete };
}

export type TransactionDeletion = ReturnType<typeof useTransactionDeletion>;
