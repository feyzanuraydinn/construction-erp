import type { TFunction } from 'i18next';
import { isPositiveTransaction } from './transactionHelpers';
import { amountInTry } from './money';
import type { CategoryBreakdown, TransactionWithDetails } from '../types';
import type { InvoiceType } from './transactionKinds';

export const UNCATEGORIZED = 'Diğer';
export const MAX_BREAKDOWN_SLICES = 8;
const OTHER_SLICE_COLOR = '#94a3b8';

export const DEFAULT_DOCUMENT_CATEGORY: Record<InvoiceType, string> = {
  invoice_in: 'Diğer Gider',
  invoice_out: 'Diğer Gelir',
};

export function categoryLabel(t: TFunction, name: string | null | undefined): string {
  if (!name || name === UNCATEGORIZED) return t('analytics.other');
  return t(`categories.${name}`, name);
}

export function expenseTotalsByCategory(
  t: TFunction,
  transactions: TransactionWithDetails[]
): Record<string, number> {
  return transactions
    .filter((tx) => !isPositiveTransaction(tx.type))
    .reduce<Record<string, number>>((acc, tx) => {
      const name = categoryLabel(t, tx.category_name);
      acc[name] = (acc[name] || 0) + amountInTry(tx);
      return acc;
    }, {});
}

export function labelBreakdown(
  t: TFunction,
  data: CategoryBreakdown[],
  maxSlices: number = Infinity
): CategoryBreakdown[] {
  const sorted = data
    .map((item) => ({ ...item, category: categoryLabel(t, item.category) }))
    .sort((a, b) => b.total - a.total);
  if (sorted.length <= maxSlices) return sorted;
  const top = sorted.slice(0, maxSlices - 1);
  const otherTotal = sorted.slice(maxSlices - 1).reduce((sum, item) => sum + item.total, 0);
  return [...top, { category: t('analytics.other'), total: otherTotal, color: OTHER_SLICE_COLOR }];
}
