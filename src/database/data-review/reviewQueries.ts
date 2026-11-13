import type { Database as SqlJsDatabase } from 'sql.js';
import { queryRows } from '../sqlQuery';
import type { InvoiceType } from '../../utils/transactionKinds';
import { DEFAULT_DOCUMENT_CATEGORY } from '../../utils/categories';

export function missingRefSql(column: string, table: string): string {
  return `${column} IS NOT NULL AND ${column} NOT IN (SELECT id FROM ${table})`;
}

export const MISSING_COMPANY = missingRefSql('t.company_id', 'companies');
const MISSING_OWN_PROJECT = `t.scope = 'project' AND ${missingRefSql('t.project_id', 'projects')}`;
export const ORPHAN_CONDITION = `(${MISSING_COMPANY}) OR (${MISSING_OWN_PROJECT})`;

export function countWhere(db: SqlJsDatabase, from: string, where: string): number {
  return (
    queryRows<{ n: number }>(db, `SELECT COUNT(*) as n FROM ${from} WHERE ${where}`)[0]?.n ?? 0
  );
}

function defaultCategoryId(db: SqlJsDatabase, type: InvoiceType): number | null {
  const named = queryRows<{ id: number }>(
    db,
    'SELECT id FROM categories WHERE type = ? AND name = ? LIMIT 1',
    [type, DEFAULT_DOCUMENT_CATEGORY[type]]
  );
  if (named[0]) return named[0].id;
  return (
    queryRows<{ id: number }>(db, 'SELECT id FROM categories WHERE type = ? ORDER BY id LIMIT 1', [
      type,
    ])[0]?.id ?? null
  );
}

export function defaultCategoryIds(db: SqlJsDatabase): Record<InvoiceType, number | null> {
  return {
    invoice_in: defaultCategoryId(db, 'invoice_in'),
    invoice_out: defaultCategoryId(db, 'invoice_out'),
  };
}
