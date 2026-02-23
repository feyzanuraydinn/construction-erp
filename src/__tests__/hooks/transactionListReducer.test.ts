import { describe, it, expect } from 'vitest';
import {
  transactionListReducer,
  type TransactionListUIState,
  type TransactionListAction,
} from '../../hooks/useTransactionList';
import type { TransactionWithDetails } from '../../types';

const initialState: TransactionListUIState = {
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

const mockTransaction = {
  id: 1,
  scope: 'company',
  company_id: 1,
  project_id: null,
  type: 'invoice_out',
  category_id: 1,
  date: '2024-01-15',
  description: 'Test',
  amount: 1000,
  currency: 'TRY',
  exchange_rate: 1,
  amount_try: 1000,
  document_no: 'INV-001',
  linked_invoice_id: null,
  notes: null,
  created_at: '2024-01-15',
  updated_at: '2024-01-15',
  company_name: 'Test Co',
  project_name: null,
  project_code: null,
  category_name: 'General',
  category_color: '#000',
} as TransactionWithDetails;

describe('transactionListReducer', () => {
  describe('Filter actions', () => {
    it('SET_FILTER should update specified filter fields', () => {
      const action: TransactionListAction = {
        type: 'SET_FILTER',
        filterType: 'invoice_out',
        filterMinAmount: '100',
      };
      const result = transactionListReducer(initialState, action);
      expect(result.filterType).toBe('invoice_out');
      expect(result.filterMinAmount).toBe('100');
      // Other filters should remain unchanged
      expect(result.filterCategory).toBe('');
      expect(result.filterMaxAmount).toBe('');
    });

    it('SET_FILTER should preserve existing values for unspecified fields', () => {
      const stateWithFilter = { ...initialState, filterType: 'payment_in' };
      const action: TransactionListAction = {
        type: 'SET_FILTER',
        filterCategory: '5',
      };
      const result = transactionListReducer(stateWithFilter, action);
      expect(result.filterType).toBe('payment_in');
      expect(result.filterCategory).toBe('5');
    });

    it('CLEAR_FILTERS should reset all filter fields', () => {
      const filteredState: TransactionListUIState = {
        ...initialState,
        filterType: 'invoice_out',
        filterCategory: '3',
        filterMinAmount: '100',
        filterMaxAmount: '5000',
        filterStartDate: '2024-01-01',
        filterEndDate: '2024-12-31',
      };
      const result = transactionListReducer(filteredState, { type: 'CLEAR_FILTERS' });
      expect(result.filterType).toBe('');
      expect(result.filterCategory).toBe('');
      expect(result.filterMinAmount).toBe('');
      expect(result.filterMaxAmount).toBe('');
      expect(result.filterStartDate).toBe('');
      expect(result.filterEndDate).toBe('');
    });

    it('TOGGLE_FILTERS should toggle showFilters', () => {
      const result1 = transactionListReducer(initialState, { type: 'TOGGLE_FILTERS' });
      expect(result1.showFilters).toBe(true);
      const result2 = transactionListReducer(result1, { type: 'TOGGLE_FILTERS' });
      expect(result2.showFilters).toBe(false);
    });
  });

  describe('Modal actions', () => {
    it('OPEN_NEW_TRANSACTION should open modal with no editing transaction', () => {
      const result = transactionListReducer(initialState, { type: 'OPEN_NEW_TRANSACTION' });
      expect(result.modalOpen).toBe(true);
      expect(result.editingTransaction).toBeNull();
    });

    it('EDIT_TRANSACTION should open modal with transaction', () => {
      const result = transactionListReducer(initialState, {
        type: 'EDIT_TRANSACTION',
        transaction: mockTransaction,
      });
      expect(result.modalOpen).toBe(true);
      expect(result.editingTransaction).toBe(mockTransaction);
    });

    it('CLOSE_MODAL should close modal and clear editing', () => {
      const openState = { ...initialState, modalOpen: true, editingTransaction: mockTransaction };
      const result = transactionListReducer(openState, { type: 'CLOSE_MODAL' });
      expect(result.modalOpen).toBe(false);
      expect(result.editingTransaction).toBeNull();
    });

    it('VIEW_TRANSACTION should set viewing transaction', () => {
      const result = transactionListReducer(initialState, {
        type: 'VIEW_TRANSACTION',
        transaction: mockTransaction,
      });
      expect(result.viewingTransaction).toBe(mockTransaction);
    });

    it('CLOSE_VIEW should clear viewing transaction', () => {
      const viewingState = { ...initialState, viewingTransaction: mockTransaction };
      const result = transactionListReducer(viewingState, { type: 'CLOSE_VIEW' });
      expect(result.viewingTransaction).toBeNull();
    });
  });

  describe('Delete actions', () => {
    it('CONFIRM_DELETE should set deleteConfirm', () => {
      const result = transactionListReducer(initialState, {
        type: 'CONFIRM_DELETE',
        transaction: mockTransaction,
      });
      expect(result.deleteConfirm).toBe(mockTransaction);
    });

    it('CANCEL_DELETE should clear deleteConfirm', () => {
      const confirmState = { ...initialState, deleteConfirm: mockTransaction };
      const result = transactionListReducer(confirmState, { type: 'CANCEL_DELETE' });
      expect(result.deleteConfirm).toBeNull();
    });
  });

  describe('Print actions', () => {
    it('OPEN_PRINT_MODAL should open print modal', () => {
      const result = transactionListReducer(initialState, { type: 'OPEN_PRINT_MODAL' });
      expect(result.printModalOpen).toBe(true);
    });

    it('CLOSE_PRINT_MODAL should close print modal', () => {
      const result = transactionListReducer(
        { ...initialState, printModalOpen: true },
        { type: 'CLOSE_PRINT_MODAL' }
      );
      expect(result.printModalOpen).toBe(false);
    });

    it('OPEN_PRINT_PREVIEW should close modal and open preview', () => {
      const result = transactionListReducer(
        { ...initialState, printModalOpen: true },
        { type: 'OPEN_PRINT_PREVIEW' }
      );
      expect(result.printModalOpen).toBe(false);
      expect(result.printPreviewOpen).toBe(true);
    });

    it('CLOSE_PRINT_PREVIEW should close preview', () => {
      const result = transactionListReducer(
        { ...initialState, printPreviewOpen: true },
        { type: 'CLOSE_PRINT_PREVIEW' }
      );
      expect(result.printPreviewOpen).toBe(false);
    });

    it('SET_PRINT_FILTER should merge print filters', () => {
      const result = transactionListReducer(initialState, {
        type: 'SET_PRINT_FILTER',
        filters: { type: 'invoice_out', startDate: '2024-01-01' },
      });
      expect(result.printFilters.type).toBe('invoice_out');
      expect(result.printFilters.startDate).toBe('2024-01-01');
      expect(result.printFilters.category_id).toBe('');
    });
  });

  describe('Selection actions', () => {
    it('TOGGLE_SELECT should add id to selection', () => {
      const result = transactionListReducer(initialState, { type: 'TOGGLE_SELECT', id: 1 });
      expect(result.selectedIds.has(1)).toBe(true);
    });

    it('TOGGLE_SELECT should remove id from selection', () => {
      const state = { ...initialState, selectedIds: new Set([1, 2, 3]) };
      const result = transactionListReducer(state, { type: 'TOGGLE_SELECT', id: 2 });
      expect(result.selectedIds.has(2)).toBe(false);
      expect(result.selectedIds.has(1)).toBe(true);
      expect(result.selectedIds.has(3)).toBe(true);
    });

    it('SELECT_ALL should replace selection with provided ids', () => {
      const result = transactionListReducer(initialState, {
        type: 'SELECT_ALL',
        ids: [1, 2, 3, 4],
      });
      expect(result.selectedIds.size).toBe(4);
      expect(result.selectedIds.has(3)).toBe(true);
    });

    it('CLEAR_SELECTION should empty selection', () => {
      const state = { ...initialState, selectedIds: new Set([1, 2, 3]) };
      const result = transactionListReducer(state, { type: 'CLEAR_SELECTION' });
      expect(result.selectedIds.size).toBe(0);
    });
  });

  describe('Bulk delete actions', () => {
    it('OPEN_BULK_DELETE should set bulkDeleteConfirm', () => {
      const result = transactionListReducer(initialState, { type: 'OPEN_BULK_DELETE' });
      expect(result.bulkDeleteConfirm).toBe(true);
    });

    it('CANCEL_BULK_DELETE should clear bulkDeleteConfirm', () => {
      const state = { ...initialState, bulkDeleteConfirm: true };
      const result = transactionListReducer(state, { type: 'CANCEL_BULK_DELETE' });
      expect(result.bulkDeleteConfirm).toBe(false);
    });
  });

  describe('Unknown action', () => {
    it('should return current state for unknown action', () => {
      const result = transactionListReducer(initialState, { type: 'UNKNOWN' } as never);
      expect(result).toBe(initialState);
    });
  });
});
