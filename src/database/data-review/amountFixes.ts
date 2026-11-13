import type { Database as SqlJsDatabase } from 'sql.js';
import type { Currency, TransactionType } from '../../types';
import { MONEY_TOLERANCE, roundMoney } from '../../utils/money';
import { queryRows } from '../sqlQuery';
import { ORPHAN_CONDITION } from './reviewQueries';
import type { AmountFix } from './reviewTypes';

export function findAmountFixes(db: SqlJsDatabase): AmountFix[] {
  const found = queryRows<{
    id: number;
    type: TransactionType;
    description: string;
    date: string;
    currency: Currency | null;
    amount: number;
    exchange_rate: number | null;
    amount_try: number | null;
  }>(
    db,
    `
    SELECT t.id, t.type, t.description, t.date, t.currency, t.amount, t.exchange_rate, t.amount_try
    FROM transactions t
    WHERE NOT (${ORPHAN_CONDITION}) AND (
      ((t.currency IS NULL OR t.currency = 'TRY')
        AND (t.amount_try IS NULL OR ABS(t.amount_try - t.amount) > ${MONEY_TOLERANCE}))
      OR (t.currency IN ('USD', 'EUR') AND t.exchange_rate > 1
        AND (t.amount_try IS NULL OR ABS(t.amount_try - ROUND(t.amount * t.exchange_rate, 2)) > 0.01))
    )
    ORDER BY t.date, t.id
  `
  );
  return found.map((row) => {
    const currency: Currency = row.currency ?? 'TRY';
    const correctTry =
      currency === 'TRY'
        ? roundMoney(row.amount)
        : roundMoney(row.amount * (row.exchange_rate ?? 0));
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      date: row.date,
      currency,
      amount: row.amount,
      exchangeRate: row.exchange_rate,
      storedTry: row.amount_try,
      correctTry,
    };
  });
}

export function repairAmounts(db: SqlJsDatabase): number {
  let changed = 0;
  for (const fix of findAmountFixes(db)) {
    db.run(
      `UPDATE transactions SET amount_try = ?, exchange_rate = CASE WHEN COALESCE(currency, 'TRY') = 'TRY' THEN 1 ELSE exchange_rate END,
         currency = COALESCE(currency, 'TRY'), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [fix.correctTry, fix.id]
    );
    changed += 1;
  }
  return changed;
}
