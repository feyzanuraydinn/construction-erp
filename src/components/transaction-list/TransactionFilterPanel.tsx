import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { AmountInput } from '../ui/AmountInput';
import type { TransactionList } from '../../hooks/useTransactionList';
import type { OptionList } from './options';
import { cn } from '../../utils/cn';

interface TransactionFilterPanelProps {
  list: TransactionList;
  categoryOptions: OptionList;
  extraActive?: boolean;
  onClear?: () => void;
  className?: string;
}

const labelClass = 'text-sm text-gray-500 dark:text-gray-400';

export function TransactionFilterPanel({
  list,
  categoryOptions,
  extraActive = false,
  onClear,
  className = '',
}: TransactionFilterPanelProps) {
  const { t } = useTranslation();
  const { ui, dispatch } = list;
  if (!ui.showFilters) return null;
  const active =
    extraActive ||
    !!(
      ui.filterType ||
      ui.filterCategory ||
      ui.filterMinAmount ||
      ui.filterMaxAmount ||
      ui.filterStartDate ||
      ui.filterEndDate
    );
  const clear = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
    onClear?.();
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 pt-3 border-t dark:border-gray-700',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <label className={labelClass}>{t('shared.filters.categoryLabel')}</label>
        <Select
          options={categoryOptions}
          value={ui.filterCategory}
          onChange={(e) => dispatch({ type: 'SET_FILTER', filterCategory: e.target.value })}
          placeholder={t('common.all')}
          className="w-40"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className={labelClass}>{t('shared.filters.startDateLabel')}</label>
        <Input
          type="date"
          value={ui.filterStartDate}
          onChange={(e) => dispatch({ type: 'SET_FILTER', filterStartDate: e.target.value })}
          className="w-40"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className={labelClass}>{t('shared.filters.endDateLabel')}</label>
        <Input
          type="date"
          value={ui.filterEndDate}
          onChange={(e) => dispatch({ type: 'SET_FILTER', filterEndDate: e.target.value })}
          className="w-40"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className={labelClass}>{t('shared.filters.minAmountLabel')}</label>
        <AmountInput
          value={ui.filterMinAmount}
          onValueChange={(value) => dispatch({ type: 'SET_FILTER', filterMinAmount: value })}
          aria-label={t('shared.filters.minAmountLabel')}
          placeholder="0"
          className="w-28"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className={labelClass}>{t('shared.filters.maxAmountLabel')}</label>
        <AmountInput
          value={ui.filterMaxAmount}
          onValueChange={(value) => dispatch({ type: 'SET_FILTER', filterMaxAmount: value })}
          aria-label={t('shared.filters.maxAmountLabel')}
          placeholder="∞"
          className="w-28"
        />
      </div>
      {active && (
        <Button variant="ghost-danger" size="xs" onClick={clear}>
          {t('shared.clearFilters')}
        </Button>
      )}
    </div>
  );
}
