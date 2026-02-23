import { useState, useReducer, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts, usePagination, paginateArray, invalidateCachePattern } from './index';
import { exportToCSV, formatRecordsForExport, transactionColumns } from '../utils/exportUtils';
import type { TransactionWithDetails, PaymentAllocationWithDetails } from '../types';

// ==================== SHARED PRINT FILTERS ====================

export interface PrintFilters {
  type: string;
  category_id: string;
  startDate: string;
  endDate: string;
}

// ==================== SHARED UI STATE ====================

export interface TransactionListUIState {
  // Filters
  filterType: string;
  filterCategory: string;
  filterMinAmount: string;
  filterMaxAmount: string;
  filterStartDate: string;
  filterEndDate: string;
  showFilters: boolean;
  // Transaction modal
  modalOpen: boolean;
  editingTransaction: TransactionWithDetails | null;
  // View modal
  viewingTransaction: TransactionWithDetails | null;
  // Delete confirm
  deleteConfirm: TransactionWithDetails | null;
  // Print
  printModalOpen: boolean;
  printPreviewOpen: boolean;
  printFilters: PrintFilters;
  // Bulk selection
  selectedIds: Set<number>;
  bulkDeleteConfirm: boolean;
}

export type TransactionListAction =
  | { type: 'SET_FILTER'; filterType?: string; filterCategory?: string; filterMinAmount?: string; filterMaxAmount?: string; filterStartDate?: string; filterEndDate?: string }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'TOGGLE_FILTERS' }
  | { type: 'OPEN_NEW_TRANSACTION' }
  | { type: 'EDIT_TRANSACTION'; transaction: TransactionWithDetails }
  | { type: 'VIEW_TRANSACTION'; transaction: TransactionWithDetails }
  | { type: 'CLOSE_MODAL' }
  | { type: 'CLOSE_VIEW' }
  | { type: 'CONFIRM_DELETE'; transaction: TransactionWithDetails }
  | { type: 'CANCEL_DELETE' }
  | { type: 'OPEN_PRINT_MODAL' }
  | { type: 'CLOSE_PRINT_MODAL' }
  | { type: 'OPEN_PRINT_PREVIEW' }
  | { type: 'CLOSE_PRINT_PREVIEW' }
  | { type: 'SET_PRINT_FILTER'; filters: Partial<PrintFilters> }
  | { type: 'TOGGLE_SELECT'; id: number; checked?: boolean }
  | { type: 'SELECT_ALL'; ids: number[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'OPEN_BULK_DELETE' }
  | { type: 'CANCEL_BULK_DELETE' };

const initialUIState: TransactionListUIState = {
  filterType: '',
  filterCategory: '',
  filterMinAmount: '',
  filterMaxAmount: '',
  filterStartDate: '',
  filterEndDate: '',
  showFilters: false,
  modalOpen: false,
  editingTransaction: null,
  viewingTransaction: null,
  deleteConfirm: null,
  printModalOpen: false,
  printPreviewOpen: false,
  printFilters: { type: '', category_id: '', startDate: '', endDate: '' },
  selectedIds: new Set(),
  bulkDeleteConfirm: false,
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
      return {
        ...state,
        filterType: '',
        filterCategory: '',
        filterMinAmount: '',
        filterMaxAmount: '',
        filterStartDate: '',
        filterEndDate: '',
      };
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
    case 'CONFIRM_DELETE':
      return { ...state, deleteConfirm: action.transaction };
    case 'CANCEL_DELETE':
      return { ...state, deleteConfirm: null };
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
    case 'TOGGLE_SELECT': {
      const newIds = new Set(state.selectedIds);
      const shouldSelect = action.checked !== undefined ? action.checked : !newIds.has(action.id);
      if (shouldSelect) newIds.add(action.id);
      else newIds.delete(action.id);
      return { ...state, selectedIds: newIds };
    }
    case 'SELECT_ALL':
      return { ...state, selectedIds: new Set(action.ids) };
    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: new Set() };
    case 'OPEN_BULK_DELETE':
      return { ...state, bulkDeleteConfirm: true };
    case 'CANCEL_BULK_DELETE':
      return { ...state, bulkDeleteConfirm: false };
    default:
      return state;
  }
}

// ==================== HOOK OPTIONS ====================

interface UseTransactionListOptions {
  transactions: TransactionWithDetails[];
  loadData: () => void;
  /** Extra filter function for page-specific filters (e.g. filterCompanyId on ProjectDetail) */
  extraFilter?: (tx: TransactionWithDetails, ui: TransactionListUIState) => boolean;
  /** Export filename prefix */
  exportPrefix?: string;
  /** Initial page size */
  pageSize?: number;
}

// ==================== HOOK ====================

export function useTransactionList({
  transactions,
  loadData,
  extraFilter,
  exportPrefix = 'islemler',
  pageSize = 25,
}: UseTransactionListOptions) {
  const toast = useToast();
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const [ui, dispatch] = useReducer(transactionListReducer, initialUIState);
  const [viewingAllocations, setViewingAllocations] = useState<PaymentAllocationWithDetails[]>([]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNew: () => dispatch({ type: 'OPEN_NEW_TRANSACTION' }),
    onEscape: () => {
      if (ui.modalOpen) {
        dispatch({ type: 'CLOSE_MODAL' });
      }
    },
  });

  // Load allocations when viewing a payment transaction
  useEffect(() => {
    const tx = ui.viewingTransaction;
    if (!tx || (tx.type !== 'payment_in' && tx.type !== 'payment_out')) {
      setViewingAllocations([]);
      return;
    }

    let cancelled = false;
    window.electronAPI.transaction.getAllocationsForPayment(tx.id)
      .then((allocations) => {
        if (!cancelled) setViewingAllocations(allocations);
      })
      .catch(() => {
        if (!cancelled) setViewingAllocations([]);
      });

    return () => { cancelled = true; };
  }, [ui.viewingTransaction]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (ui.filterType && tx.type !== ui.filterType) return false;
      if (ui.filterCategory && tx.category_id !== parseInt(ui.filterCategory)) return false;
      if (ui.filterMinAmount) {
        const min = parseFloat(ui.filterMinAmount);
        if (!isNaN(min) && (tx.amount_try || tx.amount) < min) return false;
      }
      if (ui.filterMaxAmount) {
        const max = parseFloat(ui.filterMaxAmount);
        if (!isNaN(max) && (tx.amount_try || tx.amount) > max) return false;
      }
      if (ui.filterStartDate && tx.date < ui.filterStartDate) return false;
      if (ui.filterEndDate && tx.date > ui.filterEndDate) return false;
      // Extra page-specific filter
      if (extraFilter && !extraFilter(tx, ui)) return false;
      return true;
    });
  }, [transactions, ui.filterType, ui.filterCategory, ui.filterMinAmount, ui.filterMaxAmount, ui.filterStartDate, ui.filterEndDate, extraFilter]);

  // Pagination
  const pagination = usePagination({
    totalItems: filteredTransactions.length,
    initialPageSize: pageSize,
  });

  const paginatedTransactions = useMemo(() => {
    return paginateArray(filteredTransactions, pagination.currentPage, pagination.pageSize);
  }, [filteredTransactions, pagination.currentPage, pagination.pageSize]);

  // Handlers
  const handleDeleteTransaction = useCallback(async () => {
    if (!ui.deleteConfirm) return;
    try {
      await window.electronAPI.transaction.delete(ui.deleteConfirm.id);
      dispatch({ type: 'CANCEL_DELETE' });
      toast.success(t('shared.transactionDeleted'));
      invalidateCachePattern('dashboard:.*');
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('shared.deleteError'));
    }
  }, [ui.deleteConfirm, toast, t, loadData]);

  const handleSelectAll = useCallback(
    (ids: number[], checked: boolean) => {
      if (checked) {
        dispatch({ type: 'SELECT_ALL', ids });
      } else {
        dispatch({ type: 'CLEAR_SELECTION' });
      }
    },
    []
  );

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    dispatch({ type: 'TOGGLE_SELECT', id, checked });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    try {
      await Promise.all(
        Array.from(ui.selectedIds).map((txId) => window.electronAPI.transaction.delete(txId))
      );
      toast.success(t('shared.bulkDeleted', { count: ui.selectedIds.size }));
      dispatch({ type: 'CLEAR_SELECTION' });
      dispatch({ type: 'CANCEL_BULK_DELETE' });
      invalidateCachePattern('dashboard:.*');
      loadData();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(t('shared.bulkDeleteError'));
    }
  }, [ui.selectedIds, toast, t, loadData]);

  const handleSaveTransaction = useCallback(
    (isNew: boolean) => {
      dispatch({ type: 'CLOSE_MODAL' });
      toast.success(isNew ? t('shared.transactionCreated') : t('shared.transactionUpdated'));
      invalidateCachePattern('dashboard:.*');
      loadData();
    },
    [toast, t, loadData]
  );

  const handleExport = useCallback(async () => {
    try {
      const formatted = formatRecordsForExport(transactions, transactionColumns);
      const filename = `${exportPrefix}_${new Date().toISOString().split('T')[0]}`;
      await exportToCSV(exportPrefix, formatted, filename);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('common.exportError'));
    }
  }, [transactions, exportPrefix, toast, t]);

  const handlePrint = useCallback(() => {
    dispatch({ type: 'OPEN_PRINT_PREVIEW' });
  }, []);

  return {
    // State
    ui,
    dispatch,
    printRef,
    viewingAllocations,
    // Filtered & paginated
    filteredTransactions,
    paginatedTransactions,
    pagination,
    // Handlers
    handleDeleteTransaction,
    handleSelectAll,
    handleSelectOne,
    handleBulkDelete,
    handleSaveTransaction,
    handleExport,
    handlePrint,
  };
}
