import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFilter } from 'react-icons/fi';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { TRANSACTION_TYPES } from '../../utils/constants';
import { PageActions, BulkDeleteAction } from '../shared/PageActions';
import type { TransactionList } from '../../hooks/useTransactionList';
import { cn } from '../../utils/cn';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';

interface TransactionPageActionsProps {
  list: TransactionList;
  printOptions?: boolean;
  className?: string;
}

export function TransactionPageActions({
  list,
  printOptions = false,
  className,
}: TransactionPageActionsProps) {
  const { t } = useTranslation();
  const { dispatch } = list;
  return (
    <PageActions
      className={className}
      onExport={() => dispatch({ type: 'OPEN_EXPORT_PREVIEW' })}
      onShare={list.handleShare}
      onPrint={printOptions ? () => dispatch({ type: 'OPEN_PRINT_MODAL' }) : list.handlePrint}
      onNew={() => dispatch({ type: 'OPEN_NEW_TRANSACTION' })}
      newLabel={t('shared.newTransaction')}
    />
  );
}

export function TransactionBulkDelete({
  list,
  className,
}: {
  list: TransactionList;
  className?: string;
}) {
  const { t } = useTranslation();
  const count = list.deletion.selectedIds.size;
  return (
    <BulkDeleteAction
      className={className}
      count={count}
      label={t('shared.bulkDelete.buttonLabel', { count })}
      onClick={() => list.deletion.setBulkDeleteConfirm(true)}
      divider="before"
    />
  );
}

export function TransactionQuickFilters({
  list,
  children,
  className,
}: {
  list: TransactionList;
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const typeOptions = useTranslatedOptions(TRANSACTION_TYPES);
  const { ui, dispatch } = list;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={ui.showFilters ? 'primary' : 'ghost'}
        size="icon"
        icon={FiFilter}
        onClick={() => dispatch({ type: 'TOGGLE_FILTERS' })}
        aria-label={t('common.filter')}
      />
      <Select
        options={typeOptions}
        value={ui.filterType}
        onChange={(e) => dispatch({ type: 'SET_FILTER', filterType: e.target.value })}
        placeholder={t('shared.filters.allTypes')}
        className="w-36"
      />
      {children}
    </div>
  );
}
