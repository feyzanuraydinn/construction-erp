import { useEffect, useState } from 'react';
import { loadAllocations } from '../utils/allocations';
import type { PaymentAllocationWithDetails, TransactionWithDetails } from '../types';

const NO_ALLOCATIONS: PaymentAllocationWithDetails[] = [];

interface LoadedAllocations {
  transactionId: number;
  allocations: PaymentAllocationWithDetails[];
}

export function useTransactionAllocations(
  transaction: TransactionWithDetails | null
): PaymentAllocationWithDetails[] {
  const [loaded, setLoaded] = useState<LoadedAllocations | null>(null);

  useEffect(() => {
    if (!transaction) return;
    let cancelled = false;
    loadAllocations(transaction)
      .then((allocations) => {
        if (!cancelled) setLoaded({ transactionId: transaction.id, allocations });
      })
      .catch((error: unknown) => console.error('Allocation load error:', error));
    return () => {
      cancelled = true;
    };
  }, [transaction]);

  return transaction && loaded?.transactionId === transaction.id
    ? loaded.allocations
    : NO_ALLOCATIONS;
}
