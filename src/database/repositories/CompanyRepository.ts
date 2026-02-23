import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type { Company, CompanyWithBalance } from '../../types';
import type { CompanyInput } from '../../utils/schemas';

export class CompanyRepository extends BaseRepository<Company> {
  constructor(db: SqlJsDatabase) {
    super(db, 'companies');
  }

  getWithBalance(): CompanyWithBalance[] {
    return this.query(`
      SELECT c.*,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total_invoice_out,
        COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total_payment_in,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total_invoice_in,
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as total_payment_out,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as receivable,
        COALESCE(SUM(CASE WHEN t.type = 'invoice_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) as payable,
        (COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0)) -
        (COALESCE(SUM(CASE WHEN t.type = 'invoice_in' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN COALESCE(t.amount_try, t.amount) ELSE 0 END), 0)) as balance,
        COUNT(DISTINCT t.id) as transaction_count
      FROM companies c
      LEFT JOIN transactions t ON t.company_id = c.id
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
  }

  create(data: CompanyInput): Company {
    const result = this.run(
      `INSERT INTO companies (type, account_type, name, tc_number, profession, tax_office, tax_number, trade_registry_no, contact_person, phone, email, address, bank_name, iban, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.type, data.account_type, data.name, data.tc_number || null, data.profession || null, data.tax_office || null, data.tax_number || null, data.trade_registry_no || null, data.contact_person || null, data.phone || null, data.email || null, data.address || null, data.bank_name || null, data.iban || null, data.notes || null]
    );
    return this.getById(result.lastInsertRowid)!;
  }

  update(id: number, data: Partial<CompanyInput>): Company | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    const updatable = ['type', 'account_type', 'name', 'tc_number', 'profession', 'tax_office', 'tax_number', 'trade_registry_no', 'contact_person', 'phone', 'email', 'address', 'bank_name', 'iban', 'notes'] as const;
    for (const field of updatable) {
      if (field in data) {
        fields.push(`${field} = ?`);
        values.push(data[field] ?? null);
      }
    }
    if (fields.length === 0) return this.getById(id);
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    this.run(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  }

  /**
   * Müşteriye ait işlem ve proje sayısını döndürür (silme uyarısı için)
   */
  getRelatedCounts(id: number): { transactionCount: number; projectCount: number } {
    const txCount = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE company_id = ?`, [id]
    );
    const projCount = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM projects WHERE client_company_id = ? AND is_active = 1`, [id]
    );
    return {
      transactionCount: txCount?.count || 0,
      projectCount: projCount?.count || 0,
    };
  }

  delete(id: number): { success: boolean } {
    const company = this.getById(id);
    if (!company) return { success: false };
    this.db.run('BEGIN TRANSACTION');
    try {
      this.run(`INSERT INTO trash (type, data) VALUES ('company', ?)`, [JSON.stringify(company)]);
      // Delete client projects (CASCADE handles project_parties and related transactions)
      this.run(`DELETE FROM projects WHERE client_company_id = ?`, [id]);
      // Delete company (CASCADE handles transactions, project_parties)
      this.run(`DELETE FROM companies WHERE id = ?`, [id]);
      this.db.run('COMMIT');
      return { success: true };
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }
}
