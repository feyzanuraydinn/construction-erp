import { useTranslation } from 'react-i18next';
import { FiPlus, FiArrowDownCircle } from 'react-icons/fi';
import { Button } from '../../components/ui/Button';
import { BulkDeleteAction } from '../../components/shared/PageActions';
import { cn } from '../../utils/cn';
import { STOCK_BULK_DELETE_KEYS, type StockBulkSelection, type StockTab } from './stockBulkDelete';

interface StockHeaderActionsProps {
  activeTab: StockTab;
  selection: StockBulkSelection;
  onNewMovement: () => void;
  onNewMaterial: () => void;
  className?: string;
}

export function StockHeaderActions({
  activeTab,
  selection,
  onNewMovement,
  onNewMaterial,
  className,
}: StockHeaderActionsProps) {
  const { t } = useTranslation();
  const count = selection.selectedIds.size;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BulkDeleteAction
        count={count}
        label={t(STOCK_BULK_DELETE_KEYS[activeTab].action, { count })}
        onClick={() => selection.setBulkDeleteConfirm(true)}
        divider="after"
      />
      <Button variant="secondary" icon={FiArrowDownCircle} onClick={onNewMovement}>
        {t('stock.stockMovement')}
      </Button>
      <Button icon={FiPlus} onClick={onNewMaterial}>
        {t('stock.newMaterial')}
      </Button>
    </div>
  );
}
