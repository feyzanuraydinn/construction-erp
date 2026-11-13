import type { Database as SqlJsDatabase } from 'sql.js';
import type { Currency, TransactionScope, TransactionType } from '../../types';
import { collectTransactionBundle, moveToTrash } from '../repositories/trashBundle';
import { tryAmountSql } from '../sqlFragments';
import { queryRows } from '../sqlQuery';
import { MISSING_COMPANY, ORPHAN_CONDITION, countWhere } from './reviewQueries';
import type { ApplyResult, OrphanTransaction } from './reviewTypes';

export function findOrphans(db: SqlJsDatabase): OrphanTransaction[] {
  const found = queryRows<{
    id: number;
    type: TransactionType;
    scope: TransactionScope;
    description: string;
    date: string;
    currency: Currency | null;
    amount: number;
    amount_try: number;
    company_missing: number;
    company_id: number | null;
    project_id: number | null;
  }>(
    db,
    `
    SELECT t.id, t.type, t.scope, t.description, t.date, t.currency, t.amount,
      ${tryAmountSql('t')} as amount_try, t.company_id, t.project_id,
      CASE WHEN ${MISSING_COMPANY} THEN 1 ELSE 0 END as company_missing
    FROM transactions t
    WHERE ${ORPHAN_CONDITION}
    ORDER BY t.date, t.id
  `
  );
  return found.map((row) => ({
    id: row.id,
    type: row.type,
    scope: row.scope,
    description: row.description,
    date: row.date,
    currency: row.currency ?? 'TRY',
    amount: row.amount,
    amountTry: row.amount_try,
    missing: row.company_missing ? 'company' : 'project',
    missingId: Number(row.company_missing ? row.company_id : row.project_id),
  }));
}

export function countOrphans(db: SqlJsDatabase): number {
  return countWhere(db, 'transactions t', ORPHAN_CONDITION);
}

export function trashOrphans(db: SqlJsDatabase, orphanIds: number[]): ApplyResult {
  const wanted = new Set(orphanIds);
  let changed = 0;
  let skipped = 0;
  for (const orphan of findOrphans(db)) {
    if (!wanted.has(orphan.id)) {
      skipped += 1;
      continue;
    }
    const display = queryRows<Record<string, unknown>>(
      db,
      'SELECT * FROM transactions WHERE id = ?',
      [orphan.id]
    )[0];
    moveToTrash(db, 'transaction', display, collectTransactionBundle(db, orphan.id));
    changed += 1;
  }
  return { changed, skipped };
}
