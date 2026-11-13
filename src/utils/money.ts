export const MONEY_TOLERANCE = 0.005;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function amountInTry(record: {
  amount?: number | null;
  amount_try?: number | null;
}): number {
  return record.amount_try || record.amount || 0;
}

export interface Share {
  id: number;
  amount: number;
}

export function distributeGreedy(total: number, slots: { id: number; free: number }[]): Share[] {
  const shares: Share[] = [];
  let left = roundMoney(total);
  for (const slot of slots) {
    if (left <= MONEY_TOLERANCE) break;
    const free = roundMoney(slot.free);
    if (free <= MONEY_TOLERANCE) continue;
    const amount = roundMoney(Math.min(free, left));
    shares.push({ id: slot.id, amount });
    left = roundMoney(left - amount);
  }
  return shares;
}
