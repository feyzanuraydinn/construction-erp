import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTransactionAllocations } from '../../hooks/useTransactionAllocations';
import type { PaymentAllocationWithDetails, TransactionWithDetails } from '../../types';

const tx = (id: number, type: TransactionWithDetails['type']): TransactionWithDetails =>
  ({
    id,
    type,
    date: '2026-11-01',
    description: `tx ${id}`,
    amount: 100,
    amount_try: 100,
    currency: 'TRY',
    scope: 'cari',
  }) as TransactionWithDetails;

const allocation = (id: number): PaymentAllocationWithDetails =>
  ({ id, payment_id: 1, invoice_id: id, amount: 10 }) as PaymentAllocationWithDetails;

describe('useTransactionAllocations', () => {
  beforeEach(() => {
    window.electronAPI.transaction.getAllocationsForPayment = vi
      .fn()
      .mockResolvedValue([allocation(7)]);
    window.electronAPI.transaction.getAllocationsForInvoice = vi
      .fn()
      .mockResolvedValue([allocation(8)]);
  });

  it('returns nothing when no transaction is open', () => {
    const { result } = renderHook(() => useTransactionAllocations(null));
    expect(result.current).toEqual([]);
    expect(window.electronAPI.transaction.getAllocationsForPayment).not.toHaveBeenCalled();
  });

  it('loads the matches of a payment and of an invoice', async () => {
    const { result, rerender } = renderHook(({ current }) => useTransactionAllocations(current), {
      initialProps: { current: tx(1, 'payment_in') },
    });
    await waitFor(() => expect(result.current.map((a) => a.id)).toEqual([7]));

    rerender({ current: tx(2, 'invoice_out') });
    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current.map((a) => a.id)).toEqual([8]));
  });

  it('ignores an answer that arrives after another transaction was opened', async () => {
    let resolveSlow: (value: PaymentAllocationWithDetails[]) => void = () => {};
    window.electronAPI.transaction.getAllocationsForPayment = vi.fn(
      () =>
        new Promise<PaymentAllocationWithDetails[]>((resolve) => {
          resolveSlow = resolve;
        })
    );
    const { result, rerender } = renderHook(({ current }) => useTransactionAllocations(current), {
      initialProps: { current: tx(1, 'payment_in') },
    });

    rerender({ current: tx(2, 'invoice_out') });
    await waitFor(() => expect(result.current.map((a) => a.id)).toEqual([8]));
    resolveSlow([allocation(99)]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.map((a) => a.id)).toEqual([8]);
  });
});
