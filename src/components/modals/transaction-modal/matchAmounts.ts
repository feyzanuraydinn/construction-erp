import { distributeGreedy, roundMoney } from '../../../utils/money';
import type { MatchCandidate } from '../../../types';

export type MatchAmounts = Record<number, number>;

export function sumMatches(matches: MatchAmounts): number {
  return roundMoney(Object.values(matches).reduce((sum, amount) => sum + amount, 0));
}

export function autoMatch(
  candidates: MatchCandidate[],
  target: number,
  base: MatchAmounts = {}
): MatchAmounts {
  const result: MatchAmounts = { ...base };
  const slots = candidates.map((candidate) => ({
    id: candidate.id,
    free: candidate.remaining - (result[candidate.id] ?? 0),
  }));
  for (const share of distributeGreedy(target - sumMatches(base), slots)) {
    result[share.id] = roundMoney((result[share.id] ?? 0) + share.amount);
  }
  return result;
}

export function savedMatches(candidates: MatchCandidate[]): MatchAmounts {
  const current: MatchAmounts = {};
  for (const candidate of candidates) {
    if (candidate.allocated_here > 0) current[candidate.id] = candidate.allocated_here;
  }
  return current;
}

export function withoutMatch(matches: MatchAmounts, candidateId: number): MatchAmounts {
  const next = { ...matches };
  delete next[candidateId];
  return next;
}

export function withMatchAmount(
  matches: MatchAmounts,
  candidate: MatchCandidate,
  value: number,
  target: number
): MatchAmounts {
  const others = sumMatches(matches) - (matches[candidate.id] ?? 0);
  const capped = roundMoney(Math.max(0, Math.min(value, candidate.remaining, target - others)));
  return capped > 0 ? { ...matches, [candidate.id]: capped } : withoutMatch(matches, candidate.id);
}

export function unusedAdvanceOf(candidates: MatchCandidate[], matches: MatchAmounts): number {
  return roundMoney(
    candidates.reduce(
      (sum, candidate) => sum + Math.max(0, candidate.remaining - (matches[candidate.id] ?? 0)),
      0
    )
  );
}
