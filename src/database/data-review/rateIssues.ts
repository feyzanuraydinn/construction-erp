import type { Database as SqlJsDatabase } from 'sql.js';
import type { Currency, TransactionType } from '../../types';
import { roundMoney } from '../../utils/money';
import { queryRows } from '../sqlQuery';
import { capAllocations } from './allocationFixes';
import { ORPHAN_CONDITION } from './reviewQueries';
import type { ApplyResult, RateIssue } from './reviewTypes';

export function findRateIssues(db: SqlJsDatabase): RateIssue[] {
  const found = queryRows<{
    id: number;
    type: TransactionType;
    description: string;
    date: string;
    currency: Currency;
    amount: number;
    exchange_rate: number | null;
    company_name: string | null;
    project_name: string | null;
  }>(
    db,
    `
    SELECT t.id, t.type, t.description, t.date, t.currency, t.amount, t.exchange_rate,
      c.name as company_name, p.name as project_name
    FROM transactions t
    LEFT JOIN companies c ON c.id = t.company_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.currency IN ('USD', 'EUR') AND (t.exchange_rate IS NULL OR t.exchange_rate <= 1)
      AND NOT (${ORPHAN_CONDITION})
    ORDER BY t.date, t.id
  `
  );
  return found.map((row) => ({
    id: row.id,
    type: row.type,
    description: row.description,
    date: row.date,
    currency: row.currency,
    amount: row.amount,
    exchangeRate: row.exchange_rate,
    companyName: row.company_name,
    projectName: row.project_name,
  }));
}

export function fixRates(db: SqlJsDatabase, rates: { id: number; rate: number }[]): ApplyResult {
  let changed = 0;
  let skipped = 0;
  const issues = new Map(findRateIssues(db).map((issue) => [issue.id, issue]));
  for (const { id, rate } of rates) {
    const issue = issues.get(id);
    if (!issue || !(rate > 1)) {
      skipped += 1;
      continue;
    }
    const oldRate = issue.exchangeRate && issue.exchangeRate > 0 ? issue.exchangeRate : 1;
    const factor = rate / oldRate;
    const newTry = roundMoney(issue.amount * rate);
    db.run(
      'UPDATE transactions SET exchange_rate = ?, amount_try = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [rate, newTry, id]
    );
    const linked = queryRows<{ id: number; amount: number; other_currency: string | null }>(
      db,
      `
      SELECT pa.id, pa.amount, o.currency as other_currency
      FROM payment_allocations pa
      JOIN transactions o ON o.id = CASE WHEN pa.payment_id = ? THEN pa.invoice_id ELSE pa.payment_id END
      WHERE pa.payment_id = ? OR pa.invoice_id = ?
    `,
      [id, id, id]
    );
    for (const allocation of linked) {
      if ((allocation.other_currency ?? 'TRY') !== issue.currency) continue;
      db.run('UPDATE payment_allocations SET amount = ? WHERE id = ?', [
        roundMoney(allocation.amount * factor),
        allocation.id,
      ]);
    }
    changed += 1;
  }
  capAllocations(db);
  return { changed, skipped };
}
