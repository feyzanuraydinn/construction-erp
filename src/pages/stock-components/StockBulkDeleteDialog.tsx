import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { STOCK_BULK_DELETE_KEYS, type StockBulkSelection, type StockTab } from './stockBulkDelete';

interface StockBulkDeleteDialogProps {
  tab: StockTab;
  selection: StockBulkSelection;
  className?: string;
}

export function StockBulkDeleteDialog({ tab, selection, className }: StockBulkDeleteDialogProps) {
  const { t } = useTranslation();
  const count = selection.selectedIds.size;
  const keys = STOCK_BULK_DELETE_KEYS[tab];
  return (
    <ConfirmDialog
      isOpen={selection.bulkDeleteConfirm}
      onClose={() => selection.setBulkDeleteConfirm(false)}
      onConfirm={selection.handleBulkDelete}
      title={t('stock.bulkDeleteTitle')}
      message={t(keys.message, { count })}
      type="danger"
      confirmText={t(keys.confirm, { count })}
      className={className}
    />
  );
}
