import type { Database as SqlJsDatabase } from 'sql.js';
import { MONEY_TOLERANCE, roundMoney } from '../../utils/money';
import {
  fitsWithin,
  groupRows,
  isValidPair,
  loadAllocations,
  samePool,
  sumAmounts,
  type AllocationRow,
} from './allocationRows';
import type { AllocationChange, AllocationIssue } from './reviewTypes';

function issueBase(row: AllocationRow): Omit<AllocationIssue, 'key' | 'kind' | 'changes'> {
  return {
    paymentId: row.payment_id,
    paymentDescription: row.payment_description,
    paymentDate: row.payment_date,
    paymentTry: row.payment_try,
    invoiceId: row.invoice_id,
    invoiceDescription: row.invoice_description,
    invoiceTry: row.invoice_try,
    companyId: null,
    companyName: null,
  };
}

function removalOf(row: AllocationRow): AllocationChange {
  return {
    allocationId: row.allocation_id,
    invoiceDescription: row.invoice_description,
    from: row.amount,
    to: 0,
  };
}

function trimToFit(
  allocations: AllocationRow[],
  limit: number,
  dateOf: (row: AllocationRow) => string
): AllocationChange[] {
  let excess = roundMoney(sumAmounts(allocations) - limit);
  const changes: AllocationChange[] = [];
  const newestFirst = [...allocations].sort(
    (a, b) => dateOf(b).localeCompare(dateOf(a)) || b.allocation_id - a.allocation_id
  );
  for (const allocation of newestFirst) {
    if (excess <= MONEY_TOLERANCE) break;
    const cut = Math.min(allocation.amount, excess);
    changes.push({
      allocationId: allocation.allocation_id,
      invoiceDescription: allocation.invoice_description,
      from: allocation.amount,
      to: roundMoney(allocation.amount - cut),
    });
    excess = roundMoney(excess - cut);
  }
  return changes;
}

export function findAllocationIssues(db: SqlJsDatabase): AllocationIssue[] {
  const all = loadAllocations(db);
  const issues: AllocationIssue[] = [];

  for (const row of all.filter((a) => !isValidPair(a))) {
    issues.push({
      ...issueBase(row),
      key: `type_mismatch:${row.allocation_id}`,
      kind: 'type_mismatch',
      changes: [removalOf(row)],
    });
  }
  const valid = all.filter(isValidPair);

  const byPayment = groupRows(valid, (row) => row.payment_id);
  for (const [paymentId, list] of byPayment) {
    const mismatched = list.filter((a) => !samePool(a));
    if (mismatched.length === 0) continue;
    const companies = new Set(list.map((a) => a.invoice_company_id));
    const first = list[0];
    if (
      first.payment_company_id === null &&
      companies.size === 1 &&
      first.invoice_company_id !== null
    ) {
      issues.push({
        ...issueBase(first),
        key: `assign_company:${paymentId}`,
        kind: 'assign_company',
        invoiceId: null,
        invoiceDescription: null,
        invoiceTry: null,
        companyId: first.invoice_company_id,
        companyName: first.invoice_company_name,
        changes: [],
      });
      continue;
    }
    for (const row of mismatched) {
      issues.push({
        ...issueBase(row),
        key: `counterparty:${row.allocation_id}`,
        kind: 'counterparty',
        changes: [removalOf(row)],
      });
    }
  }

  for (const [paymentId, list] of byPayment) {
    const first = list[0];
    if (fitsWithin(list, first.payment_try)) continue;
    issues.push({
      ...issueBase(first),
      key: `payment_over:${paymentId}`,
      kind: 'payment_over',
      invoiceId: null,
      invoiceDescription: null,
      invoiceTry: null,
      changes: trimToFit(list, first.payment_try, (a) => a.invoice_date),
    });
  }

  const byInvoice = groupRows(valid, (row) => row.invoice_id);
  for (const [invoiceId, list] of byInvoice) {
    const first = list[0];
    if (fitsWithin(list, first.invoice_try)) continue;
    issues.push({
      ...issueBase(first),
      key: `invoice_over:${invoiceId}`,
      kind: 'invoice_over',
      changes: trimToFit(list, first.invoice_try, (a) => a.payment_date),
    });
  }
  return issues;
}
