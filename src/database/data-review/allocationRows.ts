import type { Database as SqlJsDatabase } from 'sql.js';
import type { TransactionType } from '../../types';
import { MONEY_TOLERANCE } from '../../utils/money';
import { invoiceTypeFor } from '../../utils/transactionKinds';
import { sameMatchPool } from '../repositories/PaymentAllocationRepository';
import { tryAmountSql } from '../sqlFragments';
import { queryRows } from '../sqlQuery';

export interface AllocationRow {
  allocation_id: number;
  amount: number;
  payment_id: number;
  payment_type: TransactionType;
  payment_company_id: number | null;
  payment_project_id: number | null;
  payment_description: string;
  payment_date: string;
  payment_try: number;
  invoice_id: number;
  invoice_type: TransactionType;
  invoice_company_id: number | null;
  invoice_project_id: number | null;
  invoice_description: string;
  invoice_date: string;
  invoice_try: number;
  invoice_company_name: string | null;
}

export function loadAllocations(db: SqlJsDatabase): AllocationRow[] {
  return queryRows<AllocationRow>(
    db,
    `
    SELECT pa.id as allocation_id, pa.amount,
      p.id as payment_id, p.type as payment_type, p.company_id as payment_company_id,
      p.project_id as payment_project_id, p.description as payment_description, p.date as payment_date,
      ${tryAmountSql('p')} as payment_try,
      i.id as invoice_id, i.type as invoice_type, i.company_id as invoice_company_id,
      i.project_id as invoice_project_id, i.description as invoice_description, i.date as invoice_date,
      ${tryAmountSql('i')} as invoice_try,
      ic.name as invoice_company_name
    FROM payment_allocations pa
    JOIN transactions p ON p.id = pa.payment_id
    JOIN transactions i ON i.id = pa.invoice_id
    LEFT JOIN companies ic ON ic.id = i.company_id
    ORDER BY pa.id
  `
  );
}

export function isValidPair(row: AllocationRow): boolean {
  return invoiceTypeFor(row.payment_type) === row.invoice_type;
}

export function samePool(row: AllocationRow): boolean {
  return sameMatchPool(
    { company_id: row.payment_company_id, project_id: row.payment_project_id },
    { company_id: row.invoice_company_id, project_id: row.invoice_project_id }
  );
}

export function groupRows(
  rows: AllocationRow[],
  keyOf: (row: AllocationRow) => number
): Map<number, AllocationRow[]> {
  const groups = new Map<number, AllocationRow[]>();
  for (const row of rows) groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row]);
  return groups;
}

export function sumAmounts(rows: AllocationRow[]): number {
  return rows.reduce((sum, a) => sum + a.amount, 0);
}

export function fitsWithin(rows: AllocationRow[], limit: number): boolean {
  return sumAmounts(rows) <= limit + MONEY_TOLERANCE;
}
