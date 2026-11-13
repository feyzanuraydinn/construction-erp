import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type {
  TransactionWithDetails,
  TransactionFilters,
  AllocationInput,
  InvoiceAllocationInput,
  SaveTransactionResult,
} from '../../types';
import type { TransactionInput } from '../../utils/schemas';
import { collectTransactionBundle, moveToTrash } from './trashBundle';
import { runInSavepoint } from '../savepoint';
import { PaymentAllocationRepository, type AllocationProblem } from './PaymentAllocationRepository';
import { amountInTry, roundMoney } from '../../utils/money';
import { isPaymentType, invoiceTypeFor } from '../../utils/transactionKinds';
import {
  DETAILS_SELECT,
  TRANSACTION_UPDATABLE_FIELDS,
  TRASH_DISPLAY_SELECT,
  filteredDetailsQuery,
} from './transactions/transactionSql';
import { needsCounterparty, planRemainderDocument } from './transactions/unmatchedPayment';

export type SaveProblem =
  | AllocationProblem
  | 'needs_counterparty'
  | 'invalid_category'
  | 'amount_not_positive'
  | 'rate_not_positive';

export class SaveProblemError extends Error {
  constructor(public readonly problem: SaveProblem) {
    super(problem);
    this.name = 'SaveProblemError';
  }
}

export interface SaveWithMatchingInput {
  id?: number;
  data: TransactionInput;
  paymentAllocations?: AllocationInput[];
  invoiceAllocations?: InvoiceAllocationInput[];
  remainderDocument?: { categoryId: number; note: string | null };
}

export class TransactionRepository extends BaseRepository<TransactionWithDetails> {
  constructor(db: SqlJsDatabase) {
    super(db, 'transactions');
  }

  getAllFiltered(filters?: TransactionFilters): TransactionWithDetails[] {
    const { query, params } = filteredDetailsQuery(filters);
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
      throw new SaveProblemError('amount_not_positive');
    }
    const exchangeRate = currency === 'TRY' ? 1 : (data.exchange_rate ?? 0);
    if (exchangeRate <= 0) {
      throw new SaveProblemError('rate_not_positive');
    }
    const amountTry = roundMoney(amount * exchangeRate);
    const result = this.run(
      `INSERT INTO transactions (scope, company_id, project_id, type, category_id, date, description, amount, currency, exchange_rate, amount_try, document_no, linked_invoice_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.scope,
        data.company_id || null,
        data.project_id || null,
        data.type,
        data.category_id || null,
        data.date,
        data.description,
        amount,
        currency,
        exchangeRate,
        amountTry,
        data.document_no || null,
        data.linked_invoice_id || null,
        data.notes || null,
      ]
    );
    return this.requireRow(this.getDetails(result.lastInsertRowid));
  }

  update(id: number, data: Partial<TransactionInput>): TransactionWithDetails | undefined {
    const { fields, values } = this.assignments(data, TRANSACTION_UPDATABLE_FIELDS);
    if ('amount' in data || 'currency' in data || 'exchange_rate' in data) {
      const existing = this.getById(id);
      if (existing) {
        const amount = data.amount ?? existing.amount;
        const currency = data.currency ?? existing.currency;
        const keptRate = existing.currency === currency ? existing.exchange_rate : 0;
        const exchangeRate = currency === 'TRY' ? 1 : (data.exchange_rate ?? keptRate ?? 0);
        if (exchangeRate <= 0) {
          throw new SaveProblemError('rate_not_positive');
        }
        fields.push('exchange_rate = ?');
        values.push(exchangeRate);
        fields.push('amount_try = ?');
        values.push(roundMoney(amount * exchangeRate));
      }
    }
    if (fields.length === 0) return this.getById(id);

    if ('type' in data) {
      const existing = this.queryOne<TransactionWithDetails>(
        'SELECT * FROM transactions WHERE id = ?',
        [id]
      );
      if (existing && existing.type !== data.type) {
        this.run('DELETE FROM payment_allocations WHERE payment_id = ? OR invoice_id = ?', [
          id,
          id,
        ]);
      }
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    this.run(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getDetails(id);
  }

  delete(id: number): { success: boolean } {
    const tx = this.queryOne(TRASH_DISPLAY_SELECT, [id]);
    if (!tx) return { success: false };
    runInSavepoint(this.db, () =>
      moveToTrash(this.db, 'transaction', tx, collectTransactionBundle(this.db, id))
    );
    return { success: true };
  }

  saveWithMatching(input: SaveWithMatchingInput): SaveTransactionResult {
    const allocationsRepo = new PaymentAllocationRepository(this.db);
    return runInSavepoint(this.db, () => {
      const saved =
        input.id !== undefined ? this.update(input.id, input.data) : this.create(input.data);
      if (!saved) throw new SaveProblemError('not_found');
      const payment = isPaymentType(saved.type);

      if (payment && input.paymentAllocations) {
        const problem = allocationsRepo.findAllocationProblem(saved.id, input.paymentAllocations);
        if (problem) throw new SaveProblemError(problem);
        allocationsRepo.setForPayment(saved.id, input.paymentAllocations);
      } else if (!payment && input.invoiceAllocations) {
        const problem = allocationsRepo.findInvoiceAllocationProblem(
          saved.id,
          input.invoiceAllocations
        );
        if (problem) throw new SaveProblemError(problem);
        allocationsRepo.setForInvoice(saved.id, input.invoiceAllocations);
      } else {
        const problem = allocationsRepo.findExistingAllocationProblem(saved.id);
        if (problem) throw new SaveProblemError(problem);
      }

      let documentId: number | null = null;
      if (payment && input.remainderDocument) {
        documentId = this.bookRemainderDocument(
          saved.id,
          input.remainderDocument.categoryId,
          input.remainderDocument.note
        );
      }

      const result = this.getDetails(saved.id);
      if (!result) throw new SaveProblemError('not_found');
      if (needsCounterparty(result)) throw new SaveProblemError('needs_counterparty');
      return { transaction: result, documentId };
    });
  }

  updateChecked(id: number, data: Partial<TransactionInput>): TransactionWithDetails | undefined {
    const allocationsRepo = new PaymentAllocationRepository(this.db);
    return runInSavepoint(this.db, () => {
      const before = this.getDetails(id);
      const updated = this.update(id, data);
      if (!updated) return updated;
      const problem =
        allocationsRepo.findExistingAllocationProblem(id) ??
        allocationsRepo.findExistingCounterpartyProblem(id);
      if (problem) throw new SaveProblemError(problem);
      const after = this.getDetails(id);
      if (needsCounterparty(after) && !needsCounterparty(before))
        throw new SaveProblemError('needs_counterparty');
      return after;
    });
  }

  bookRemainderDocument(paymentId: number, categoryId: number, note: string | null): number | null {
    const payment = this.getDetails(paymentId);
    if (!payment) throw new SaveProblemError('not_found');
    const documentType = invoiceTypeFor(payment.type);
    if (!documentType) throw new SaveProblemError('type_mismatch');
    const category = this.queryOne<{ type: string }>('SELECT type FROM categories WHERE id = ?', [
      categoryId,
    ]);
    if (!category || category.type !== documentType) throw new SaveProblemError('invalid_category');

    const remainder = planRemainderDocument(payment, documentType, categoryId, note);
    if (!remainder) return null;

    const document = this.create(remainder.input);
    const matched = Math.min(remainder.rest, amountInTry(document));
    this.run('INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, ?)', [
      paymentId,
      document.id,
      roundMoney(matched),
    ]);
    return document.id;
  }
}
