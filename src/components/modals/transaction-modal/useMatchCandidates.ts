import { useMemo, useState } from 'react';
import { useLoadedData } from '../../../hooks/useLoadedData';
import { counterpartIdOf, loadAllocations } from '../../../utils/allocations';
import { isPaymentType } from '../../../utils/transactionKinds';
import { roundMoney } from '../../../utils/money';
import { NO_ITEMS } from '../../../utils/emptyList';
import type {
  MatchCandidate,
  MatchCandidatesRequest,
  PaymentAllocationWithDetails,
  TransactionType,
} from '../../../types';
import {
  autoMatch,
  savedMatches,
  sumMatches,
  unusedAdvanceOf,
  withMatchAmount,
  withoutMatch,
  type MatchAmounts,
} from './matchAmounts';

interface LoadedCandidates {
  candidates: MatchCandidate[];
  outside: PaymentAllocationWithDetails[];
}

interface EditedMatches {
  source: LoadedCandidates | null;
  matches: MatchAmounts;
}

interface MatchCandidatesOptions extends MatchCandidatesRequest {
  enabled: boolean;
  savedType: TransactionType | null;
  targetAmount: number;
}

async function loadCandidates(
  request: MatchCandidatesRequest,
  savedType: TransactionType | null
): Promise<LoadedCandidates> {
  const candidates = (await window.electronAPI.transaction.getMatchCandidates(request)) || [];
  if (request.selfId === null || savedType !== request.type)
    return { candidates, outside: NO_ITEMS };
  const saved = await loadAllocations({ id: request.selfId, type: request.type });
  const listed = new Set(candidates.map((c) => c.id));
  const viewingPayment = isPaymentType(request.type);
  return {
    candidates,
    outside: (saved || []).filter((a) => !listed.has(counterpartIdOf(a, viewingPayment))),
  };
}

export type MatchCandidatesState = ReturnType<typeof useMatchCandidates>;

export function useMatchCandidates({
  enabled,
  type,
  companyId,
  projectId,
  selfId,
  savedType,
  targetAmount,
}: MatchCandidatesOptions) {
  const load = useMemo(
    () =>
      enabled && (companyId !== null || projectId !== null)
        ? () => loadCandidates({ type, companyId, projectId, selfId }, savedType)
        : null,
    [enabled, type, companyId, projectId, selfId, savedType]
  );
  const { data, loading } = useLoadedData(load, 'Match candidates load error:', {
    keepPrevious: true,
  });
  const [edited, setEdited] = useState<EditedMatches>({ source: null, matches: {} });
  const candidates = data?.candidates ?? NO_ITEMS;
  const matches = edited.source === data ? edited.matches : savedMatches(candidates);
  const matchedTotal = sumMatches(matches);

  const update = (change: (current: MatchAmounts) => MatchAmounts) => {
    setEdited((previous) => ({
      source: data,
      matches: change(previous.source === data ? previous.matches : savedMatches(candidates)),
    }));
  };

  const autoFill = () => {
    if (targetAmount <= 0 || candidates.length === 0) return;
    update(() => autoMatch(candidates, targetAmount));
  };

  const fillRest = (): MatchAmounts => {
    const filled = autoMatch(candidates, targetAmount, matches);
    update(() => filled);
    return filled;
  };

  return {
    candidates,
    outsideMatches: data?.outside ?? NO_ITEMS,
    matches,
    matchedTotal,
    unmatched: Math.max(0, roundMoney(targetAmount - matchedTotal)),
    unusedAdvance: unusedAdvanceOf(candidates, matches),
    loading,
    ready: load === null ? enabled : !loading && data !== null,
    setAmount: (candidate: MatchCandidate, value: number) =>
      update((current) => withMatchAmount(current, candidate, value, targetAmount)),
    remove: (candidateId: number) => update((current) => withoutMatch(current, candidateId)),
    clear: () => update(() => ({})),
    autoFill,
    fillRest,
  };
}
