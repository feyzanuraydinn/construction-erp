import { useMemo } from 'react';
import type { TransactionWithDetails } from '../../types';
import { amountInTry } from '../../utils/money';
import type { TransactionListFilters } from './transactionListFilters';

export function useFilteredTransactions(
  transactions: TransactionWithDetails[],
  filters: TransactionListFilters,
  extraFilter?: (tx: TransactionWithDetails) => boolean
): TransactionWithDetails[] {
  return useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.filterType && tx.type !== filters.filterType) return false;
      if (filters.filterCategory && tx.category_id !== parseInt(filters.filterCategory)) {
        return false;
      }
      if (filters.filterMinAmount) {
        const min = parseFloat(filters.filterMinAmount);
        if (!isNaN(min) && amountInTry(tx) < min) return false;
      }
      if (filters.filterMaxAmount) {
        const max = parseFloat(filters.filterMaxAmount);
        if (!isNaN(max) && amountInTry(tx) > max) return false;
      }
      if (filters.filterStartDate && tx.date < filters.filterStartDate) return false;
      if (filters.filterEndDate && tx.date > filters.filterEndDate) return false;
      if (extraFilter && !extraFilter(tx)) return false;
      return true;
    });
  }, [
    transactions,
    filters.filterType,
    filters.filterCategory,
    filters.filterMinAmount,
    filters.filterMaxAmount,
    filters.filterStartDate,
    filters.filterEndDate,
    extraFilter,
  ]);
}
