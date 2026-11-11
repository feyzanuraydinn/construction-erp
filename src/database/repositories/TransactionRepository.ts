import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type { TransactionWithDetails, TransactionFilters } from '../../types';
import type { TransactionInput } from '../../utils/schemas';
import { collectTransactionBundle, moveToTrash } from './trashBundle';
import { runInSavepoint } from '../savepoint';
import {
  PaymentAllocationRepository,
  MONEY_TOLERANCE,
  invoiceTypeFor,
  isPaymentType,
  type AllocationProblem,
} from './PaymentAllocationRepository';

export type SaveProblem =
  | AllocationProblem
  | 'needs_counterparty'
  | 'invalid_category';

export class SaveProblemError extends Error {
  constructor(public readonly problem: SaveProblem) {
    super(problem);
    this.name = 'SaveProblemError';
  }
}

export interface SaveWithMatchingInput {
  id?: number;
  data: TransactionInput;
  paymentAllocations?: { invoiceId: number; amount: number }[];
  invoiceAllocations?: { paymentId: number; amount: number }[];
  remainderDocument?: { categoryId: number; note: string | null };
}

export interface SaveWithMatchingResult {
  transaction: TransactionWithDetails;
  documentId: number | null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const DETAILS_SELECT = `
  SELECT t.*,
    c.name as company_name,
    p.name as project_name,
    cat.name as category_name,
    cat.color as category_color,
    COALESCE(pa_sum.total_allocated, 0) as allocated_amount,
    COALESCE(inv_sum.total_settled, 0) as settled_amount
  FROM transactions t
  LEFT JOIN companies c ON c.id = t.company_id
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN categories cat ON cat.id = t.category_id
  LEFT JOIN (
    SELECT payment_id, SUM(amount) as total_allocated FROM payment_allocations GROUP BY payment_id
  ) pa_sum ON pa_sum.payment_id = t.id
  LEFT JOIN (
    SELECT invoice_id, SUM(amount) as total_settled FROM payment_allocations GROUP BY invoice_id
  ) inv_sum ON inv_sum.invoice_id = t.id
`;

export class TransactionRepository extends BaseRepository<TransactionWithDetails> {
  constructor(db: SqlJsDatabase) {
    super(db, 'transactions');
  }

  getAllFiltered(filters?: TransactionFilters): TransactionWithDetails[] {
    let query = `${DETAILS_SELECT} WHERE 1=1`;
    const params: unknown[] = [];
    if (filters?.scope) { query += ` AND t.scope = ?`; params.push(filters.scope); }
    if (filters?.type) { query += ` AND t.type = ?`; params.push(filters.type); }
    if (filters?.company_id) { query += ` AND t.company_id = ?`; params.push(filters.company_id); }
    if (filters?.project_id) { query += ` AND t.project_id = ?`; params.push(filters.project_id); }
    if (filters?.start_date) { query += ` AND t.date >= ?`; params.push(filters.start_date); }
    if (filters?.end_date) { query += ` AND t.date <= ?`; params.push(filters.end_date); }
    if (filters?.search) {
      query += ` AND (t.description LIKE ? OR t.document_no LIKE ? OR c.name LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    query += ` ORDER BY t.date DESC, t.created_at DESC`;
    if (filters?.limit) { query += ` LIMIT ?`; params.push(filters.limit); }
    return this.query(query, params);
  }

  getDetails(id: number): TransactionWithDetails | undefined {
    return this.queryOne<TransactionWithDetails>(`${DETAILS_SELECT} WHERE t.id = ?`, [id]);
  }

  getByCompany(companyId: number, filters?: TransactionFilters): TransactionWithDetails[] {
    return this.getAllFiltered({ ...filters, company_id: companyId });
  }

  getByProject(projectId: number, filters?: TransactionFilters): TransactionWithDetails[] {
    return this.getAllFiltered({ ...filters, project_id: projectId });
  }

  create(data: TransactionInput): TransactionWithDetails {
    const currency = data.currency || 'TRY';
    const amount = data.amount;

    if (!amount || amount <= 0) {
      throw new Error('Tutar sıfırdan büyük olmalıdır');
    }
    const exchangeRate = currency === 'TRY' ? 1 : (data.exchange_rate ?? 0);
    if (exchangeRate <= 0) {
      throw new Error('Döviz kuru sıfırdan büyük olmalıdır');
    }
    const amountTry = roundMoney(amount * exchangeRate);
    const result = this.run(
      `INSERT INTO transactions (scope, company_id, project_id, type, category_id, date, description, amount, currency, exchange_rate, amount_try, document_no, linked_invoice_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.scope, data.company_id || null, data.project_id || null, data.type, data.category_id || null, data.date, data.description, amount, currency, exchangeRate, amountTry, data.document_no || null, data.linked_invoice_id || null, data.notes || null]
    );
    return this.getDetails(result.lastInsertRowid)!;
  }

  update(id: number, data: Partial<TransactionInput>): TransactionWithDetails | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    const updatable = ['scope', 'company_id', 'project_id', 'type', 'category_id', 'date', 'description', 'amount', 'currency', 'document_no', 'linked_invoice_id', 'notes'] as const;
    for (const field of updatable) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field] ?? null);
      }
    }
    if ('amount' in data || 'currency' in data || 'exchange_rate' in data) {
      const existing = this.getById(id);
      if (existing) {
        const amount = data.amount ?? existing.amount;
        const currency = data.currency ?? existing.currency;
        const keptRate = existing.currency === currency ? existing.exchange_rate : 0;
        const exchangeRate = currency === 'TRY' ? 1 : (data.exchange_rate ?? keptRate ?? 0);
        if (exchangeRate <= 0) {
          throw new Error('Döviz kuru sıfırdan büyük olmalıdır');
        }
        fields.push('exchange_rate = ?');
        values.push(exchangeRate);
        fields.push('amount_try = ?');
        values.push(roundMoney(amount * exchangeRate));
      }
    }
    if (fields.length === 0) return this.getById(id);

    // Tür değiştiğinde bağlı eşleştirmeleri temizle (orphan önleme)
    if ('type' in data) {
      const existing = this.queryOne<TransactionWithDetails>('SELECT * FROM transactions WHERE id = ?', [id]);
      if (existing && existing.type !== data.type) {
        this.run('DELETE FROM payment_allocations WHERE payment_id = ? OR invoice_id = ?', [id, id]);
      }
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    this.run(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getDetails(id);
  }

  delete(id: number): { success: boolean } {
    const tx = this.queryOne(`
      SELECT t.*, c.name as company_name, p.name as project_name
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `, [id]);
    if (!tx) return { success: false };
    runInSavepoint(this.db, () => moveToTrash(this.db, 'transaction', tx, collectTransactionBundle(this.db, id)));
    return { success: true };
  }

  saveWithMatching(input: SaveWithMatchingInput): SaveWithMatchingResult {
    const allocationsRepo = new PaymentAllocationRepository(this.db);
    return runInSavepoint(this.db, () => {
      const saved = input.id !== undefined ? this.update(input.id, input.data) : this.create(input.data);
      if (!saved) throw new SaveProblemError('not_found');
      const payment = isPaymentType(saved.type);

      if (payment && input.paymentAllocations) {
        const problem = allocationsRepo.findAllocationProblem(saved.id, input.paymentAllocations);
        if (problem) throw new SaveProblemError(problem);
        allocationsRepo.setForPayment(saved.id, input.paymentAllocations);
      } else if (!payment && input.invoiceAllocations) {
        const problem = allocationsRepo.findInvoiceAllocationProblem(saved.id, input.invoiceAllocations);
        if (problem) throw new SaveProblemError(problem);
        allocationsRepo.setForInvoice(saved.id, input.invoiceAllocations);
      } else {
        const problem = allocationsRepo.findExistingAllocationProblem(saved.id);
        if (problem) throw new SaveProblemError(problem);
      }

      let documentId: number | null = null;
      if (payment && input.remainderDocument) {
        documentId = this.bookRemainderDocument(saved.id, input.remainderDocument.categoryId, input.remainderDocument.note);
      }

      const result = this.getDetails(saved.id);
      if (!result) throw new SaveProblemError('not_found');
      if (payment && result.scope === 'project' && !result.company_id) {
        const unmatched = (result.amount_try || result.amount) - (result.allocated_amount ?? 0);
        if (unmatched > MONEY_TOLERANCE) throw new SaveProblemError('needs_counterparty');
      }
      return { transaction: result, documentId };
    });
  }

  updateChecked(id: number, data: Partial<TransactionInput>): TransactionWithDetails | undefined {
    const allocationsRepo = new PaymentAllocationRepository(this.db);
    const stillAdvanceless = (tx: TransactionWithDetails | undefined) =>
      !!tx &&
      isPaymentType(tx.type) &&
      tx.scope === 'project' &&
      !tx.company_id &&
      (tx.amount_try || tx.amount) - (tx.allocated_amount ?? 0) > MONEY_TOLERANCE;
    return runInSavepoint(this.db, () => {
      const before = this.getDetails(id);
      const updated = this.update(id, data);
      if (!updated) return updated;
      const problem =
        allocationsRepo.findExistingAllocationProblem(id) ?? allocationsRepo.findExistingCounterpartyProblem(id);
      if (problem) throw new SaveProblemError(problem);
      const after = this.getDetails(id);
      if (stillAdvanceless(after) && !stillAdvanceless(before)) throw new SaveProblemError('needs_counterparty');
      return after;
    });
  }

  bookRemainderDocument(paymentId: number, categoryId: number, note: string | null): number | null {
    const payment = this.getDetails(paymentId);
    if (!payment) throw new SaveProblemError('not_found');
    const documentType = invoiceTypeFor(payment.type);
    if (!documentType) throw new SaveProblemError('type_mismatch');
    const category = this.queryOne<{ type: string }>('SELECT type FROM categories WHERE id = ?', [categoryId]);
    if (!category || category.type !== documentType) throw new SaveProblemError('invalid_category');

    const paymentTry = payment.amount_try || payment.amount;
    const rest = roundMoney(paymentTry - (payment.allocated_amount ?? 0));
    if (rest <= MONEY_TOLERANCE) return null;
    const whole = Math.abs(rest - paymentTry) <= MONEY_TOLERANCE;

    const document = this.create({
      scope: payment.scope,
      company_id: payment.company_id ?? null,
      project_id: payment.project_id ?? null,
      type: documentType,
      category_id: categoryId,
      date: payment.date,
      description: payment.description,
      amount: whole ? payment.amount : rest,
      currency: whole ? payment.currency : 'TRY',
      exchange_rate: whole ? payment.exchange_rate : 1,
      document_no: null,
      linked_invoice_id: null,
      notes: note,
    });
    const matched = Math.min(rest, document.amount_try || document.amount);
    this.run('INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, ?)', [
      paymentId,
      document.id,
      roundMoney(matched),
    ]);
    return document.id;
  }

  getInvoicesForProject(projectId: number): TransactionWithDetails[] {
    return this.query(`
      SELECT t.*, c.name as company_name
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      WHERE t.project_id = ? AND t.type IN ('invoice_out', 'invoice_in')
      ORDER BY t.date DESC
    `, [projectId]);
  }

  getInvoicesForCompany(companyId: number): TransactionWithDetails[] {
    return this.query(`
      SELECT t.*, p.name as project_name
      FROM transactions t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.company_id = ? AND t.type IN ('invoice_out', 'invoice_in')
      ORDER BY t.date DESC
    `, [companyId]);
  }

  getRecent(limit = 10): TransactionWithDetails[] {
    return this.getAllFiltered({ limit });
  }
}
