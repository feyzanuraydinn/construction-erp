import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import '../../i18n';
import { useTransactionList } from '../../hooks/useTransactionList';
import type { TransactionWithDetails } from '../../types';

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

const tx = (id: number, type: TransactionWithDetails['type']): TransactionWithDetails =>
  ({
    id,
    type,
    date: '2026-11-01',
    description: `tx ${id}`,
    amount: 100,
    amount_try: 100,
    currency: 'TRY',
    scope: 'project',
  }) as TransactionWithDetails;

const transactions = [tx(1, 'invoice_out'), tx(2, 'invoice_in'), tx(3, 'invoice_in')];

describe('useTransactionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('drops selected rows that a filter hides, so bulk delete cannot hit them', async () => {
    const { result } = renderHook(() =>
      useTransactionList({ exportPrefix: 'islemler', transactions, loadData: vi.fn() })
    );

    act(() => {
      result.current.deletion.handleSelectOne(1, true);
      result.current.deletion.handleSelectOne(2, true);
    });
    act(() => result.current.dispatch({ type: 'SET_FILTER', filterType: 'invoice_in' }));

    await waitFor(() => expect([...result.current.deletion.selectedIds]).toEqual([2]));
  });

  it('reports a partial bulk delete and still reloads the list', async () => {
    const loadData = vi.fn();
    window.electronAPI.transaction.delete = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('locked'));
    const { result } = renderHook(() =>
      useTransactionList({ exportPrefix: 'islemler', transactions, loadData })
    );

    act(() => {
      result.current.deletion.handleSelectOne(2, true);
      result.current.deletion.handleSelectOne(3, true);
    });
    await act(async () => {
      await result.current.deletion.handleBulkDelete();
    });

    expect(mockToast.warning).toHaveBeenCalledWith('1 işlem silindi, 1 işlem silinemedi');
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(loadData).toHaveBeenCalled();
    expect(result.current.deletion.selectedIds.size).toBe(0);
    expect(result.current.deletion.bulkDeleteConfirm).toBe(false);
  });

  it('reports an error when nothing could be deleted', async () => {
    window.electronAPI.transaction.delete = vi.fn().mockRejectedValue(new Error('locked'));
    const { result } = renderHook(() =>
      useTransactionList({ exportPrefix: 'islemler', transactions, loadData: vi.fn() })
    );

    act(() => result.current.deletion.handleSelectOne(2, true));
    await act(async () => {
      await result.current.deletion.handleBulkDelete();
    });

    expect(mockToast.error).toHaveBeenCalledWith('Toplu silme sırasında hata oluştu');
    expect(mockToast.warning).not.toHaveBeenCalled();
  });
});
