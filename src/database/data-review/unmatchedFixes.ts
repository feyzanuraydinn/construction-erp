import type { Database as SqlJsDatabase } from 'sql.js';
import { roundMoney, distributeGreedy } from '../../utils/money';
import { PaymentAllocationRepository } from '../repositories/PaymentAllocationRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { findUnmatchedPayments, reviewCandidates } from './unmatchedPayments';
import type { ApplyResult, UnmatchedChoice, UnmatchedPayment } from './reviewTypes';

function matchFully(allocations: PaymentAllocationRepository, payment: UnmatchedPayment): boolean {
  const pool = { companyId: payment.companyId, projectId: payment.projectId };
  const candidates = reviewCandidates(allocations, payment.type, pool, payment.id);
  const left = payment.amountTry - candidates.reduce((s, c) => s + c.allocated_here, 0);
  const next = candidates
    .filter((c) => c.allocated_here > 0)
    .map((c) => ({ invoiceId: c.id, amount: c.allocated_here }));
  const slots = candidates.map((candidate) => ({
    id: candidate.id,
    free: candidate.remaining - candidate.allocated_here,
  }));
  for (const share of distributeGreedy(left, slots)) {
    const existing = next.find((n) => n.invoiceId === share.id);
    if (existing) existing.amount = roundMoney(existing.amount + share.amount);
    else next.push({ invoiceId: share.id, amount: share.amount });
  }
  if (allocations.findAllocationProblem(payment.id, next) !== null) return false;
  allocations.setForPayment(payment.id, next);
  return true;
}

export function settleUnmatchedPayments(
  db: SqlJsDatabase,
  choices: UnmatchedChoice[],
  note: string | null
): ApplyResult {
  const allocations = new PaymentAllocationRepository(db);
  const transactions = new TransactionRepository(db);
  const listed = new Map(findUnmatchedPayments(db).map((p) => [p.id, p]));
  let changed = 0;
  let skipped = 0;

  const position = new Map([...listed.keys()].map((id, index) => [id, index]));
  const ordered = choices
    .filter((choice) => listed.has(choice.id))
    .sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  skipped += choices.length - ordered.length;

  for (const choice of ordered) {
    const payment = listed.get(choice.id);
    if (!payment || (choice.rest === 'advance' && !payment.advanceAllowed)) {
      skipped += 1;
      continue;
    }
    let did = choice.match && matchFully(allocations, payment);
    if (choice.rest === 'document') {
      const categoryId = choice.categoryId ?? payment.suggestedCategoryId;
      if (categoryId === null) {
        skipped += 1;
        continue;
      }
      if (transactions.bookRemainderDocument(payment.id, categoryId, note) !== null) did = true;
    }
    if (did) changed += 1;
  }
  return { changed, skipped };
}
