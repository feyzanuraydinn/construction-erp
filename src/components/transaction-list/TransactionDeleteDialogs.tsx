import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { deleteTransactionMessage } from '../../utils/transactionHelpers';
import type { TransactionDeletion } from '../../hooks/useTransactionDeletion';

export function TransactionDeleteDialogs({ deletion }: { deletion: TransactionDeletion }) {
  const { t } = useTranslation();
  return (
    <>
      <ConfirmDialog
        isOpen={!!deletion.deleting}
        onClose={() => deletion.setDeleting(null)}
        onConfirm={deletion.confirmDelete}
        title={t('shared.deleteTransaction.title')}
        message={deleteTransactionMessage(t, deletion.deleting, 'shared.deleteTransaction.message')}
        type="danger"
        confirmText={t('common.delete')}
      />
      <ConfirmDialog
        isOpen={deletion.bulkDeleteConfirm}
        onClose={() => deletion.setBulkDeleteConfirm(false)}
        onConfirm={deletion.handleBulkDelete}
        title={t('shared.bulkDelete.title')}
        message={t('shared.bulkDelete.message', { count: deletion.selectedIds.size })}
        type="danger"
        confirmText={t('shared.bulkDelete.confirmText')}
      />
    </>
  );
}
