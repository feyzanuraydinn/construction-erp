import { useState } from 'react';
import { loadAllocations } from '../../../utils/allocations';
import type { TransactionType, TransactionWithDetails } from '../../../types';

interface PendingTypeChange {
  type: TransactionType;
  count: number;
  total: number;
}

export function useTypeChangeGuard(
  transaction: TransactionWithDetails | null,
  apply: (type: TransactionType) => void
) {
  const [pending, setPending] = useState<PendingTypeChange | null>(null);

  const request = async (type: TransactionType) => {
    if (!transaction) {
      apply(type);
      return;
    }

    try {
      const linkedAllocations = await loadAllocations(transaction);
      if (linkedAllocations.length > 0) {
        setPending({
          type,
          count: linkedAllocations.length,
          total: linkedAllocations.reduce((sum, a) => sum + a.amount, 0),
        });
        return;
      }
    } catch (error) {
      console.error('Allocation check error:', error);
    }

    apply(type);
  };

  const confirm = () => {
    if (pending) apply(pending.type);
    setPending(null);
  };

  const cancel = () => setPending(null);

  return { pending, request, confirm, cancel };
}
