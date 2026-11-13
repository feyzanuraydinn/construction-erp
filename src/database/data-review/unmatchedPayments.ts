import type { Database as SqlJsDatabase } from 'sql.js';
import type { Currency, TransactionScope } from '../../types';
import { MONEY_TOLERANCE, roundMoney, distributeGreedy } from '../../utils/money';
import { invoiceTypeFor } from '../../utils/transactionKinds';
import { PaymentAllocationRepository } from '../repositories/PaymentAllocationRepository';
import { tryAmountSql, allocatedSumSql, openAmountSql } from '../sqlFragments';
import { queryRows } from '../sqlQuery';
import { ORPHAN_CONDITION, countWhere, defaultCategoryIds } from './reviewQueries';
import type { UnmatchedPayment } from './reviewTypes';

interface PaymentRow {
  id: number;
  type: 'payment_in' | 'payment_out';
  scope: TransactionScope;
  description: string;
  date: string;
  currency: Currency | null;
  amount: number;
  amount_try: number;
  allocated: number;
  linked_invoice_id: number | null;
  company_id: number | null;
  company_name: string | null;
  company_type: string | null;
  project_id: number | null;
  project_name: string | null;
}

const OPEN_PAYMENT_CONDITION = `t.type IN ('payment_in', 'payment_out') AND t.scope != 'company'
      AND NOT (${ORPHAN_CONDITION})
      AND ${openAmountSql('payment_id', 't')} > ${MONEY_TOLERANCE}`;

function loadUnmatchedPayments(db: SqlJsDatabase): PaymentRow[] {
  return queryRows<PaymentRow>(
    db,
    `
    SELECT t.id, t.type, t.scope, t.description, t.date, t.currency, t.amount,
      ${tryAmountSql('t')} as amount_try,
      ${allocatedSumSql('payment_id', 't')} as allocated,
      t.linked_invoice_id, t.company_id, c.name as company_name, c.type as company_type,
      t.project_id, p.name as project_name
    FROM transactions t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE ${OPEN_PAYMENT_CONDITION}
    ORDER BY CASE WHEN t.project_id IS NULL THEN 1 ELSE 0 END, t.date, t.id
  `
  );
}

export function countOpenUnmatched(db: SqlJsDatabase): number {
  return countWhere(
    db,
    'transactions t',
    `${OPEN_PAYMENT_CONDITION}
        AND (t.project_id IS NOT NULL OR EXISTS (
          SELECT 1 FROM transactions i
          WHERE i.company_id = t.company_id
            AND i.type = CASE t.type WHEN 'payment_in' THEN 'invoice_out' ELSE 'invoice_in' END
            AND ${openAmountSql('invoice_id', 'i')} > ${MONEY_TOLERANCE}
        ))`
  );
}

export function reviewCandidates(
  allocations: PaymentAllocationRepository,
  type: string,
  pool: { companyId: number | null; projectId: number | null },
  paymentId: number
) {
  const candidates = allocations.getInvoiceCandidates(type, pool, paymentId);
  return pool.projectId === null
    ? candidates
    : candidates.filter((c) => c.project_id === pool.projectId);
}

export function findUnmatchedPayments(db: SqlJsDatabase): UnmatchedPayment[] {
  const allocations = new PaymentAllocationRepository(db);
  const taken = new Map<number, number>();
  const categories = defaultCategoryIds(db);
  const result: UnmatchedPayment[] = [];

  for (const payment of loadUnmatchedPayments(db)) {
    const unmatched = roundMoney(payment.amount_try - payment.allocated);
    const pool = { companyId: payment.company_id, projectId: payment.project_id };
    const slots = reviewCandidates(allocations, payment.type, pool, payment.id).map((invoice) => ({
      id: invoice.id,
      free: invoice.remaining - invoice.allocated_here - (taken.get(invoice.id) ?? 0),
    }));
    const shares = distributeGreedy(unmatched, slots);
    for (const share of shares) taken.set(share.id, (taken.get(share.id) ?? 0) + share.amount);
    const matchable = roundMoney(shares.reduce((sum, share) => sum + share.amount, 0));
    if (payment.project_id === null && matchable <= MONEY_TOLERANCE) continue;

    const documentType = invoiceTypeFor(payment.type);
    result.push({
      id: payment.id,
      type: payment.type,
      scope: payment.scope,
      description: payment.description,
      date: payment.date,
      currency: payment.currency ?? 'TRY',
      amount: payment.amount,
      amountTry: payment.amount_try,
      unmatched,
      companyId: payment.company_id,
      companyName: payment.company_name,
      companyType: payment.company_type,
      projectId: payment.project_id,
      projectName: payment.project_name,
      matchable,
      rest: roundMoney(Math.max(0, unmatched - matchable)),
      countedByOldProjectPage:
        payment.project_id !== null &&
        (payment.allocated > 0 || payment.linked_invoice_id === null),
      advanceAllowed: payment.company_id !== null,
      suggestedCategoryId: categories[documentType],
    });
  }
  return result;
}
