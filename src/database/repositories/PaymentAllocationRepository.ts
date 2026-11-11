import type { Database as SqlJsDatabase } from 'sql.js';
import type { PaymentAllocationWithDetails, MatchCandidate, MatchPool, TransactionType } from '../../types';
import { runInSavepoint } from '../savepoint';

export const MONEY_TOLERANCE = 0.005;

export type AllocationProblem =
  | 'not_found'
  | 'type_mismatch'
  | 'duplicate'
  | 'exceeds_payment'
  | 'exceeds_invoice'
  | 'counterparty_mismatch';

type PaymentType = 'payment_in' | 'payment_out';
type InvoiceType = 'invoice_out' | 'invoice_in';

export function invoiceTypeFor(type: string): InvoiceType | null {
  if (type === 'payment_in') return 'invoice_out';
  if (type === 'payment_out') return 'invoice_in';
  return null;
}

export function paymentTypeFor(type: string): PaymentType | null {
  if (type === 'invoice_out') return 'payment_in';
  if (type === 'invoice_in') return 'payment_out';
  return null;
}

export function isPaymentType(type: string): type is PaymentType {
  return type === 'payment_in' || type === 'payment_out';
}

interface MatchRow {
  id: number;
  type: TransactionType;
  company_id: number | null;
  project_id: number | null;
  amount_try: number;
}

export function sameMatchPool(a: Pick<MatchRow, 'company_id' | 'project_id'>, b: Pick<MatchRow, 'company_id' | 'project_id'>): boolean {
  if (a.company_id != null || b.company_id != null) return a.company_id === b.company_id;
  return a.project_id != null && a.project_id === b.project_id;
}

function poolCondition(pool: MatchPool): { sql: string; params: unknown[] } | null {
  if (pool.companyId) return { sql: 't.company_id = ?', params: [pool.companyId] };
  if (pool.projectId) return { sql: 't.company_id IS NULL AND t.project_id = ?', params: [pool.projectId] };
  return null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export class PaymentAllocationRepository {
  constructor(private db: SqlJsDatabase) {}

  private query<T>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    if (params) stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  private run(sql: string, params?: unknown[]): void {
    this.db.run(sql, params as (string | number | Uint8Array | null)[]);
  }

  private getMatchRow(id: number): MatchRow | undefined {
    return this.query<MatchRow>(
      'SELECT id, type, company_id, project_id, COALESCE(amount_try, amount) as amount_try FROM transactions WHERE id = ?',
      [id]
    )[0];
  }

  getForPayment(paymentId: number): PaymentAllocationWithDetails[] {
    return this.query<PaymentAllocationWithDetails>(`
      SELECT pa.*,
        t.description as invoice_description,
        t.amount as invoice_amount,
        COALESCE(t.amount_try, t.amount) as invoice_amount_try,
        t.date as invoice_date,
        t.document_no as invoice_document_no,
        t.type as invoice_type
      FROM payment_allocations pa
      JOIN transactions t ON t.id = pa.invoice_id
      WHERE pa.payment_id = ?
      ORDER BY t.date ASC
    `, [paymentId]);
  }

  getForInvoice(invoiceId: number): PaymentAllocationWithDetails[] {
    return this.query<PaymentAllocationWithDetails>(`
      SELECT pa.*,
        t.description as payment_description,
        t.amount as payment_amount,
        COALESCE(t.amount_try, t.amount) as payment_amount_try,
        t.date as payment_date,
        t.document_no as payment_document_no
      FROM payment_allocations pa
      JOIN transactions t ON t.id = pa.payment_id
      WHERE pa.invoice_id = ?
      ORDER BY t.date ASC
    `, [invoiceId]);
  }

  private getCandidates(
    type: TransactionType,
    pool: MatchPool,
    selfId: number | null,
    side: 'invoice' | 'payment'
  ): MatchCandidate[] {
    const condition = poolCondition(pool);
    if (!condition) return [];
    const ownColumn = side === 'invoice' ? 'invoice_id' : 'payment_id';
    const otherColumn = side === 'invoice' ? 'payment_id' : 'invoice_id';
    const self = selfId ?? -1;
    const rows = this.query<Omit<MatchCandidate, 'remaining'> & { allocated_elsewhere: number }>(`
      SELECT t.id, t.type, t.description, t.amount, t.currency,
        COALESCE(t.amount_try, t.amount) as amount_try,
        t.date, t.document_no, t.company_id, c.name as company_name,
        t.project_id, p.name as project_name,
        COALESCE((SELECT SUM(amount) FROM payment_allocations
          WHERE ${ownColumn} = t.id AND ${otherColumn} != ?), 0) as allocated_elsewhere,
        COALESCE((SELECT SUM(amount) FROM payment_allocations
          WHERE ${ownColumn} = t.id AND ${otherColumn} = ?), 0) as allocated_here
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.type = ? AND t.id != ? AND ${condition.sql}
      ORDER BY t.date ASC, t.id ASC
    `, [self, self, type, self, ...condition.params]);

    return rows
      .map(({ allocated_elsewhere, ...row }) => ({
        ...row,
        remaining: roundMoney(row.amount_try - allocated_elsewhere),
      }))
      .filter((row) => row.remaining > MONEY_TOLERANCE || row.allocated_here > 0)
      .sort((a, b) => {
        const aHere = pool.projectId != null && a.project_id === pool.projectId ? 0 : 1;
        const bHere = pool.projectId != null && b.project_id === pool.projectId ? 0 : 1;
        return aHere - bHere;
      });
  }

  getInvoiceCandidates(paymentType: string, pool: MatchPool, paymentId: number | null): MatchCandidate[] {
    const invoiceType = invoiceTypeFor(paymentType);
    return invoiceType ? this.getCandidates(invoiceType, pool, paymentId, 'invoice') : [];
  }

  getPaymentCandidates(invoiceType: string, pool: MatchPool, invoiceId: number | null): MatchCandidate[] {
    const paymentType = paymentTypeFor(invoiceType);
    return paymentType ? this.getCandidates(paymentType, pool, invoiceId, 'payment') : [];
  }

  findAllocationProblem(
    paymentId: number,
    allocations: { invoiceId: number; amount: number }[]
  ): AllocationProblem | null {
    const payment = this.getMatchRow(paymentId);
    if (!payment) return 'not_found';
    const invoiceType = invoiceTypeFor(payment.type);
    if (!invoiceType) return 'type_mismatch';

    const invoiceIds = allocations.map((a) => a.invoiceId);
    if (new Set(invoiceIds).size !== invoiceIds.length) return 'duplicate';

    const total = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (total > payment.amount_try + MONEY_TOLERANCE) return 'exceeds_payment';

    for (const allocation of allocations) {
      const invoice = this.getMatchRow(allocation.invoiceId);
      if (!invoice) return 'not_found';
      if (invoice.type !== invoiceType) return 'type_mismatch';
      if (!sameMatchPool(payment, invoice)) return 'counterparty_mismatch';
      const elsewhere = this.allocatedTo('invoice_id', invoice.id, 'payment_id', paymentId);
      if (allocation.amount > invoice.amount_try - elsewhere + MONEY_TOLERANCE) return 'exceeds_invoice';
    }
    return null;
  }

  findInvoiceAllocationProblem(
    invoiceId: number,
    allocations: { paymentId: number; amount: number }[]
  ): AllocationProblem | null {
    const invoice = this.getMatchRow(invoiceId);
    if (!invoice) return 'not_found';
    const paymentType = paymentTypeFor(invoice.type);
    if (!paymentType) return 'type_mismatch';

    const paymentIds = allocations.map((a) => a.paymentId);
    if (new Set(paymentIds).size !== paymentIds.length) return 'duplicate';

    const total = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (total > invoice.amount_try + MONEY_TOLERANCE) return 'exceeds_invoice';

    for (const allocation of allocations) {
      const payment = this.getMatchRow(allocation.paymentId);
      if (!payment) return 'not_found';
      if (payment.type !== paymentType) return 'type_mismatch';
      if (!sameMatchPool(payment, invoice)) return 'counterparty_mismatch';
      const elsewhere = this.allocatedTo('payment_id', payment.id, 'invoice_id', invoiceId);
      if (allocation.amount > payment.amount_try - elsewhere + MONEY_TOLERANCE) return 'exceeds_payment';
    }
    return null;
  }

  findExistingAllocationProblem(transactionId: number): AllocationProblem | null {
    const row = this.getMatchRow(transactionId);
    if (!row) return 'not_found';
    const payment = isPaymentType(row.type);
    const total = this.allocatedTo(payment ? 'payment_id' : 'invoice_id', row.id, null, null);
    if (total > row.amount_try + MONEY_TOLERANCE) return payment ? 'exceeds_payment' : 'exceeds_invoice';
    return null;
  }

  findExistingCounterpartyProblem(transactionId: number): AllocationProblem | null {
    const row = this.getMatchRow(transactionId);
    if (!row) return 'not_found';
    const payment = isPaymentType(row.type);
    const others = this.query<MatchRow>(
      `SELECT t.id, t.type, t.company_id, t.project_id, COALESCE(t.amount_try, t.amount) as amount_try
       FROM payment_allocations pa
       JOIN transactions t ON t.id = ${payment ? 'pa.invoice_id' : 'pa.payment_id'}
       WHERE ${payment ? 'pa.payment_id' : 'pa.invoice_id'} = ?`,
      [transactionId]
    );
    const expectedType = payment ? invoiceTypeFor(row.type) : paymentTypeFor(row.type);
    for (const other of others) {
      if (other.type !== expectedType) return 'type_mismatch';
      if (!sameMatchPool(row, other)) return 'counterparty_mismatch';
    }
    return null;
  }

  private allocatedTo(
    column: 'payment_id' | 'invoice_id',
    id: number,
    exceptColumn: 'payment_id' | 'invoice_id' | null,
    exceptId: number | null
  ): number {
    const except = exceptColumn ? ` AND ${exceptColumn} != ?` : '';
    const params = exceptColumn ? [id, exceptId] : [id];
    const row = this.query<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payment_allocations WHERE ${column} = ?${except}`,
      params
    )[0];
    return row?.total ?? 0;
  }

  setForPayment(paymentId: number, allocations: { invoiceId: number; amount: number }[]): void {
    runInSavepoint(this.db, () => {
      this.run('DELETE FROM payment_allocations WHERE payment_id = ?', [paymentId]);
      for (const alloc of allocations) {
        if (alloc.amount > 0) {
          this.run(
            'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, ?)',
            [paymentId, alloc.invoiceId, roundMoney(alloc.amount)]
          );
        }
      }
    });
  }

  setForInvoice(invoiceId: number, allocations: { paymentId: number; amount: number }[]): void {
    runInSavepoint(this.db, () => {
      this.run('DELETE FROM payment_allocations WHERE invoice_id = ?', [invoiceId]);
      for (const alloc of allocations) {
        if (alloc.amount > 0) {
          this.run(
            'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, ?)',
            [alloc.paymentId, invoiceId, roundMoney(alloc.amount)]
          );
        }
      }
    });
  }

  deleteForPayment(paymentId: number): void {
    this.run('DELETE FROM payment_allocations WHERE payment_id = ?', [paymentId]);
  }
}
