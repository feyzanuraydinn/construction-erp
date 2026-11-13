import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatDate } from '../../../utils/formatters';
import { categoryLabel } from '../../../utils/categories';
import type { Category } from '../../../types';
import type { PrintFilters } from '../../../hooks/useTransactionList';
import { cn } from '../../../utils/cn';

function buildFilterDescription(
  filters: PrintFilters,
  categories: Category[],
  t: TFunction
): string[] {
  const parts: string[] = [];
  if (filters.type) {
    parts.push(
      t('print.filterType', {
        value: t(`enums.transactionType.${filters.type}`, { defaultValue: filters.type }),
      })
    );
  }
  const category = filters.category_id
    ? categories.find((c) => String(c.id) === filters.category_id)
    : undefined;
  if (category) parts.push(t('print.filterCategory', { value: categoryLabel(t, category.name) }));
  if (filters.startDate)
    parts.push(t('print.filterStartDate', { value: formatDate(filters.startDate) }));
  if (filters.endDate) parts.push(t('print.filterEndDate', { value: formatDate(filters.endDate) }));
  return parts;
}

interface PrintFilterSummaryProps {
  filters: PrintFilters;
  categories: Category[];
  className?: string;
}

export function PrintFilterSummary({ filters, categories, className }: PrintFilterSummaryProps) {
  const { t } = useTranslation();
  const parts = buildFilterDescription(filters, categories, t);
  if (parts.length === 0) return null;
  return (
    <div className={cn('mb-4 p-3 bg-gray-50 rounded border text-sm', className)}>
      <span className="font-medium">{t('print.appliedFilters')} </span>
      {parts.join(' | ')}
    </div>
  );
}
