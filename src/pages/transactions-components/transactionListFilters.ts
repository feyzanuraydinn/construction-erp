import { matchesSearchText } from '../../utils/formatters';
import type { TransactionWithDetails } from '../../types';
import type { TransactionUIFilters } from './TransactionFiltersPanel';

export type ListFilters = Omit<TransactionUIFilters, 'search'>;

export const EMPTY_LIST_FILTERS: ListFilters = {
  scope: '',
  type: '',
  company_id: '',
  project_id: '',
  start_date: '',
  end_date: '',
};

export function matchesFilters(tx: TransactionWithDetails, filters: ListFilters): boolean {
  return (
    (!filters.scope || tx.scope === filters.scope) &&
    (!filters.type || tx.type === filters.type) &&
    (!filters.company_id || tx.company_id === parseInt(filters.company_id)) &&
    (!filters.project_id || tx.project_id === parseInt(filters.project_id)) &&
    (!filters.start_date || tx.date >= filters.start_date) &&
    (!filters.end_date || tx.date <= filters.end_date)
  );
}

export function matchesSearch(tx: TransactionWithDetails, search: string): boolean {
  return matchesSearchText(search, tx.description, tx.company_name, tx.project_name);
}
