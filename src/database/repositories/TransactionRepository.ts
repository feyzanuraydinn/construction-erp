import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type { TransactionWithDetails, TransactionFilters } from '../../types';
import type { TransactionInput } from '../../utils/schemas';

export class TransactionRepository extends BaseRepository<TransactionWithDetails> {
  constructor(db: SqlJsDatabase) {
    super(db, 'transactions');
  }

  getAllFiltered(filters?: TransactionFilters): TransactionWithDetails[] {
    let query = `
      SELECT t.*,
        c.name as company_name,
        p.name as project_name,
        cat.name as category_name,
        cat.color as category_color,
        COALESCE(pa_sum.total_allocated, 0) as allocated_amount
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN categories cat ON cat.id = t.category_id
      LEFT JOIN (
        SELECT payment_id, SUM(amount) as total_allocated
        FROM payment_allocations
        GROUP BY payment_id
      ) pa_sum ON pa_sum.payment_id = t.id
      WHERE 1=1
    `;
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

  getByCompany(companyId: number, filters?: TransactionFilters): TransactionWithDetails[] {
    return this.getAllFiltered({ ...filters, company_id: companyId });
  }

  getByProject(projectId: number, filters?: TransactionFilters): TransactionWithDetails[] {
    return this.getAllFiltered({ ...filters, project_id: projectId });
  }

  create(data: TransactionInput): TransactionWithDetails {
    const currency = data.currency || 'TRY';
    const amount = data.amount;
    const rawRate = data.exchange_rate;
    const exchangeRate = (rawRate && rawRate > 0) ? rawRate : 1;
    const amountTry = currency === 'TRY' ? amount : amount * exchangeRate;

    if (!amount || amount <= 0) {
      throw new Error('Tutar sıfırdan büyük olmalıdır');
    }
    if (currency !== 'TRY' && exchangeRate <= 0) {
      throw new Error('Döviz kuru sıfırdan büyük olmalıdır');
    }
    const result = this.run(
      `INSERT INTO transactions (scope, company_id, project_id, type, category_id, date, description, amount, currency, exchange_rate, amount_try, document_no, linked_invoice_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.scope, data.company_id || null, data.project_id || null, data.type, data.category_id || null, data.date, data.description, amount, currency, exchangeRate, amountTry, data.document_no || null, data.linked_invoice_id || null, data.notes || null]
    );
    return this.queryOne<TransactionWithDetails>(`
      SELECT t.*, c.name as company_name, p.name as project_name, cat.name as category_name, cat.color as category_color,
        COALESCE(pa_sum.total_allocated, 0) as allocated_amount
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN categories cat ON cat.id = t.category_id
      LEFT JOIN (SELECT payment_id, SUM(amount) as total_allocated FROM payment_allocations GROUP BY payment_id) pa_sum ON pa_sum.payment_id = t.id
      WHERE t.id = ?
    `, [result.lastInsertRowid])!;
  }

  update(id: number, data: Partial<TransactionInput>): TransactionWithDetails | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    const updatable = ['scope', 'company_id', 'project_id', 'type', 'category_id', 'date', 'description', 'amount', 'currency', 'exchange_rate', 'document_no', 'linked_invoice_id', 'notes'] as const;
    for (const field of updatable) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field] ?? null);
      }
    }
    // Recalculate amount_try if amount or currency changed
    if ('amount' in data || 'currency' in data || 'exchange_rate' in data) {
      const existing = this.getById(id);
      if (existing) {
        const amount = data.amount ?? existing.amount;
        const currency = data.currency ?? existing.currency;
        const rawRate = data.exchange_rate ?? existing.exchange_rate;
        const exchangeRate = (rawRate && rawRate > 0) ? rawRate : 1;
        const amountTry = currency === 'TRY' ? amount : amount * exchangeRate;
        fields.push('amount_try = ?');
        values.push(amountTry);
      }
    }
    if (fields.length === 0) return this.getById(id);
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    this.run(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.queryOne(`
      SELECT t.*, c.name as company_name, p.name as project_name, cat.name as category_name, cat.color as category_color,
        COALESCE(pa_sum.total_allocated, 0) as allocated_amount
      FROM transactions t
      LEFT JOIN companies c ON c.id = t.company_id
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN categories cat ON cat.id = t.category_id
      LEFT JOIN (SELECT payment_id, SUM(amount) as total_allocated FROM payment_allocations GROUP BY payment_id) pa_sum ON pa_sum.payment_id = t.id
      WHERE t.id = ?
    `, [id]);
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
    this.db.run('BEGIN TRANSACTION');
    try {
      this.run(`INSERT INTO trash (type, data) VALUES ('transaction', ?)`, [JSON.stringify(tx)]);
      this.run(`DELETE FROM payment_allocations WHERE payment_id = ? OR invoice_id = ?`, [id, id]);
      this.run(`DELETE FROM transactions WHERE id = ?`, [id]);
      this.db.run('COMMIT');
      return { success: true };
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
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
