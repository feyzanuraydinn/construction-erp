export interface TransactionListFilters {
  filterType: string;
  filterCategory: string;
  filterMinAmount: string;
  filterMaxAmount: string;
  filterStartDate: string;
  filterEndDate: string;
}

export const EMPTY_LIST_FILTERS: TransactionListFilters = {
  filterType: '',
  filterCategory: '',
  filterMinAmount: '',
  filterMaxAmount: '',
  filterStartDate: '',
  filterEndDate: '',
};

export function listFilterKey(filters: TransactionListFilters): string {
  return JSON.stringify([
    filters.filterType,
    filters.filterCategory,
    filters.filterMinAmount,
    filters.filterMaxAmount,
    filters.filterStartDate,
    filters.filterEndDate,
  ]);
}
