import type { Database as SqlJsDatabase } from 'sql.js';
import { invoiceTypeFor } from '../../utils/transactionKinds';
import { tryAmountSql } from '../sqlFragments';
import { queryRows } from '../sqlQuery';
import { countWhere, defaultCategoryIds } from './reviewQueries';
import type { ApplyResult, LegacyFirmChoice, LegacyFirmPayment } from './reviewTypes';

const LEGACY_FIRM_CONDITION = "t.scope = 'company' AND t.type IN ('payment_in', 'payment_out')";

export function findLegacyFirmPayments(db: SqlJsDatabase): LegacyFirmPayment[] {
  const found = queryRows<{
    id: number;
    type: 'payment_in' | 'payment_out';
    description: string;
    date: string;
    amount: number;
    amount_try: number;
  }>(
    db,
    `
    SELECT t.id, t.type, t.description, t.date, t.amount, ${tryAmountSql('t')} as amount_try
    FROM transactions t
    WHERE ${LEGACY_FIRM_CONDITION}
    ORDER BY t.date, t.id
  `
  );
  const categories = defaultCategoryIds(db);
  return found.map((row) => {
    const becomes = invoiceTypeFor(row.type);
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      date: row.date,
      amount: row.amount,
      amountTry: row.amount_try,
      becomes,
      suggestedCategoryId: categories[becomes],
    };
  });
}

export function countLegacyFirmPayments(db: SqlJsDatabase): number {
  return countWhere(db, 'transactions t', LEGACY_FIRM_CONDITION);
}

export function convertLegacyFirmPayments(
  db: SqlJsDatabase,
  firmChoices: LegacyFirmChoice[]
): ApplyResult {
  const firm = new Map(findLegacyFirmPayments(db).map((p) => [p.id, p]));
  let changed = 0;
  let skipped = 0;
  for (const choice of firmChoices) {
    const payment = firm.get(choice.id);
    const category = queryRows<{ type: string }>(db, 'SELECT type FROM categories WHERE id = ?', [
      choice.categoryId,
    ])[0];
    if (!payment || category?.type !== payment.becomes) {
      skipped += 1;
      continue;
    }
    db.run('DELETE FROM payment_allocations WHERE payment_id = ? OR invoice_id = ?', [
      payment.id,
      payment.id,
    ]);
    db.run(
      'UPDATE transactions SET type = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [payment.becomes, choice.categoryId, payment.id]
    );
    changed += 1;
  }
  return { changed, skipped };
}
