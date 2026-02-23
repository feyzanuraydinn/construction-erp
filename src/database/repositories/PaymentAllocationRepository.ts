import type { Database as SqlJsDatabase } from 'sql.js';
import type { PaymentAllocation, PaymentAllocationWithDetails, InvoiceWithBalance } from '../../types';

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

  getInvoicesWithBalance(
    entityId: number,
    entityType: 'project' | 'company',
    invoiceType: 'invoice_out' | 'invoice_in'
  ): InvoiceWithBalance[] {
    const entityColumn = entityType === 'project' ? 't.project_id' : 't.company_id';
    return this.query<InvoiceWithBalance>(`
      SELECT t.id, t.type, t.description, t.amount,
        COALESCE(t.amount_try, t.amount) as amount_try,
        t.date, t.document_no,
        c.name as company_name,
        COALESCE(alloc.total_allocated, 0) as total_allocated,
        COALESCE(t.amount_try, t.amount) - COALESCE(alloc.total_allocated, 0) as remaining
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) as total_allocated
        FROM payment_allocations
        GROUP BY invoice_id
      ) alloc ON alloc.invoice_id = t.id
      WHERE ${entityColumn} = ? AND t.type = ?
        AND (COALESCE(t.amount_try, t.amount) - COALESCE(alloc.total_allocated, 0)) > 0
      ORDER BY t.date ASC
    `, [entityId, invoiceType]);
  }

  setForPayment(paymentId: number, allocations: { invoiceId: number; amount: number }[]): void {
    // Atomic: DELETE + INSERT within a single transaction to prevent data loss on crash
    this.db.run('BEGIN TRANSACTION');
    try {
      this.run('DELETE FROM payment_allocations WHERE payment_id = ?', [paymentId]);

      for (const alloc of allocations) {
        if (alloc.amount > 0) {
          this.run(
            'INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, ?)',
            [paymentId, alloc.invoiceId, alloc.amount]
          );
        }
      }
      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  deleteForPayment(paymentId: number): void {
    this.run('DELETE FROM payment_allocations WHERE payment_id = ?', [paymentId]);
  }
}
