import { useReducer, useMemo, useCallback, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { usePaginatedItems } from './usePagination';
import { useTransactionDeletion } from './useTransactionDeletion';
import { useTransactionExport } from './useTransactionExport';
import { useTransactionAllocations } from './useTransactionAllocations';
import { useFilteredTransactions } from './transaction-list/useFilteredTransactions';
import {
  EMPTY_LIST_FILTERS,
  listFilterKey,
  type TransactionListFilters,
} from './transaction-list/transactionListFilters';
import type { TransactionWithDetails } from '../types';

export interface PrintFilters {
  type: string;
  category_id: string;
  startDate: string;
  endDate: string;
}

export interface TransactionListUIState extends TransactionListFilters {
  showFilters: boolean;
  modalOpen: boolean;
  editingTransaction: TransactionWithDetails | null;
  viewingTransaction: TransactionWithDetails | null;
  printModalOpen: boolean;
  printPreviewOpen: boolean;
  printFilters: PrintFilters;
  exportPreviewOpen: boolean;
  exportFilters: PrintFilters;
}

export type TransactionListAction =
  | {
      type: 'SET_FILTER';
      filterType?: string;
      filterCategory?: string;
      filterMinAmount?: string;
      filterMaxAmount?: string;
      filterStartDate?: string;
      filterEndDate?: string;
    }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'TOGGLE_FILTERS' }
  | { type: 'OPEN_NEW_TRANSACTION' }
  | { type: 'EDIT_TRANSACTION'; transaction: TransactionWithDetails }
  | { type: 'VIEW_TRANSACTION'; transaction: TransactionWithDetails }
  | { type: 'CLOSE_MODAL' }
  | { type: 'CLOSE_VIEW' }
  | { type: 'OPEN_PRINT_MODAL' }
  | { type: 'CLOSE_PRINT_MODAL' }
  | { type: 'OPEN_PRINT_PREVIEW' }
  | { type: 'CLOSE_PRINT_PREVIEW' }
  | { type: 'SET_PRINT_FILTER'; filters: Partial<PrintFilters> }
  | { type: 'OPEN_EXPORT_PREVIEW' }
  | { type: 'CLOSE_EXPORT_PREVIEW' }
  | { type: 'SET_EXPORT_FILTER'; filters: Partial<PrintFilters> };

const EMPTY_PRINT_FILTERS: PrintFilters = { type: '', category_id: '', startDate: '', endDate: '' };

const initialUIState: TransactionListUIState = {
  ...EMPTY_LIST_FILTERS,
  showFilters: false,
  modalOpen: false,
  editingTransaction: null,
  viewingTransaction: null,
  printModalOpen: false,
  printPreviewOpen: false,
  printFilters: EMPTY_PRINT_FILTERS,
  exportPreviewOpen: false,
  exportFilters: EMPTY_PRINT_FILTERS,
};

export function transactionListReducer(
  state: TransactionListUIState,
  action: TransactionListAction
): TransactionListUIState {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        filterType: action.filterType ?? state.filterType,
        filterCategory: action.filterCategory ?? state.filterCategory,
        filterMinAmount: action.filterMinAmount ?? state.filterMinAmount,
        filterMaxAmount: action.filterMaxAmount ?? state.filterMaxAmount,
        filterStartDate: action.filterStartDate ?? state.filterStartDate,
        filterEndDate: action.filterEndDate ?? state.filterEndDate,
      };
    case 'CLEAR_FILTERS':
      return { ...state, ...EMPTY_LIST_FILTERS };
    case 'TOGGLE_FILTERS':
      return { ...state, showFilters: !state.showFilters };
    case 'OPEN_NEW_TRANSACTION':
      return { ...state, modalOpen: true, editingTransaction: null };
    case 'EDIT_TRANSACTION':
      return { ...state, modalOpen: true, editingTransaction: action.transaction };
    case 'VIEW_TRANSACTION':
      return { ...state, viewingTransaction: action.transaction };
    case 'CLOSE_MODAL':
      return { ...state, modalOpen: false, editingTransaction: null };
    case 'CLOSE_VIEW':
      return { ...state, viewingTransaction: null };
    case 'OPEN_PRINT_MODAL':
      return { ...state, printModalOpen: true };
    case 'CLOSE_PRINT_MODAL':
      return { ...state, printModalOpen: false };
    case 'OPEN_PRINT_PREVIEW':
      return { ...state, printModalOpen: false, printPreviewOpen: true };
    case 'CLOSE_PRINT_PREVIEW':
      return { ...state, printPreviewOpen: false };
    case 'SET_PRINT_FILTER':
      return { ...state, printFilters: { ...state.printFilters, ...action.filters } };
    case 'OPEN_EXPORT_PREVIEW':
      return { ...state, exportPreviewOpen: true, exportFilters: EMPTY_PRINT_FILTERS };
    case 'CLOSE_EXPORT_PREVIEW':
      return { ...state, exportPreviewOpen: false };
    case 'SET_EXPORT_FILTER':
      return { ...state, exportFilters: { ...state.exportFilters, ...action.filters } };
    default:
      return state;
  }
}

function matchesPrintFilters(tx: TransactionWithDetails, filters: PrintFilters): boolean {
  if (filters.type && tx.type !== filters.type) return false;
  if (filters.category_id && tx.category_id !== parseInt(filters.category_id)) return false;
  if (filters.startDate && tx.date < filters.startDate) return false;
  if (filters.endDate && tx.date > filters.endDate) return false;
  return true;
}

interface UseTransactionListOptions {
  transactions: TransactionWithDetails[];
  loadData: () => void;
  extraFilter?: (tx: TransactionWithDetails) => boolean;
  exportPrefix: string;
}

export function useTransactionList({
  transactions,
  loadData,
  extraFilter,
  exportPrefix,
}: UseTransactionListOptions) {
  const toast = useToast();
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const [ui, dispatch] = useReducer(transactionListReducer, initialUIState);

  const { previewRows, exportTransactions, shareTransactions } = useTransactionExport();
  const viewingAllocations = useTransactionAllocations(ui.viewingTransaction);

  useKeyboardShortcuts({
    onNew: () => dispatch({ type: 'OPEN_NEW_TRANSACTION' }),
  });

  const filteredTransactions = useFilteredTransactions(transactions, ui, extraFilter);

  const deletion = useTransactionDeletion(filteredTransactions, loadData);

  const { pagination, pageItems: paginatedTransactions } = usePaginatedItems(
    filteredTransactions,
    listFilterKey(ui)
  );

  const handleSaveTransaction = useCallback(
    (isNew: boolean) => {
      dispatch({ type: 'CLOSE_MODAL' });
      toast.success(isNew ? t('shared.transactionCreated') : t('shared.transactionUpdated'));
      loadData();
    },
    [toast, t, loadData]
  );

  const exportFilteredTransactions = useMemo(
    () => transactions.filter((tx) => matchesPrintFilters(tx, ui.exportFilters)),
    [transactions, ui.exportFilters]
  );

  const printTransactions = useMemo(
    () => transactions.filter((tx) => matchesPrintFilters(tx, ui.printFilters)),
    [transactions, ui.printFilters]
  );

  const exportPreviewData = useMemo(
    () => previewRows(exportFilteredTransactions),
    [previewRows, exportFilteredTransactions]
  );

  const handleExport = useCallback(
    () => exportTransactions(exportPrefix, exportFilteredTransactions),
    [exportTransactions, exportPrefix, exportFilteredTransactions]
  );
  const handleShare = useCallback(
    () => shareTransactions(exportPrefix, filteredTransactions),
    [shareTransactions, exportPrefix, filteredTransactions]
  );

  const handlePrint = useCallback(() => {
    dispatch({ type: 'OPEN_PRINT_PREVIEW' });
  }, []);

  return {
    ui,
    dispatch,
    printRef,
    viewingAllocations,
    filteredTransactions,
    paginatedTransactions,
    printTransactions,
    pagination,
    exportPreviewData,
    deletion,
    handleSaveTransaction,
    handleExport,
    handleShare,
    handlePrint,
  };
}

export type TransactionList = ReturnType<typeof useTransactionList>;
