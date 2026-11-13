import type { Database as SqlJsDatabase } from 'sql.js';
import { MONEY_TOLERANCE } from '../../utils/money';
import { findAllocationIssues } from './allocationIssues';
import type { AllocationIssue, AllocationIssueKind, ApplyResult } from './reviewTypes';

const FIX_ORDER: AllocationIssueKind[] = [
  'type_mismatch',
  'assign_company',
  'counterparty',
  'payment_over',
  'invoice_over',
];

function applyChanges(db: SqlJsDatabase, issue: AllocationIssue): void {
  for (const change of issue.changes) {
    if (change.to <= MONEY_TOLERANCE)
      db.run('DELETE FROM payment_allocations WHERE id = ?', [change.allocationId]);
    else
      db.run('UPDATE payment_allocations SET amount = ? WHERE id = ?', [
        change.to,
        change.allocationId,
      ]);
  }
}

export function capAllocations(db: SqlJsDatabase): void {
  for (const kind of ['payment_over', 'invoice_over'] as const) {
    for (const issue of findAllocationIssues(db).filter((i) => i.kind === kind)) {
      applyChanges(db, issue);
    }
  }
}

export function fixAllocationIssues(db: SqlJsDatabase, keys: string[]): ApplyResult {
  const wanted = new Set(keys);
  let changed = 0;
  for (const kind of FIX_ORDER) {
    for (const issue of findAllocationIssues(db).filter(
      (i) => i.kind === kind && wanted.has(i.key)
    )) {
      if (issue.kind === 'assign_company') {
        db.run(
          'UPDATE transactions SET company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id IS NULL',
          [issue.companyId, issue.paymentId]
        );
      } else {
        applyChanges(db, issue);
      }
      changed += 1;
    }
  }
  const remaining = findAllocationIssues(db).length;
  return { changed, skipped: remaining };
}
