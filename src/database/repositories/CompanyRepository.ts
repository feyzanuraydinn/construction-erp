import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type { Company, CompanyWithBalance } from '../../types';
import type { CompanyInput } from '../../utils/schemas';
import { collectCompanyBundle, moveToTrash } from './trashBundle';
import { splitNetBalance } from '../../utils/financials';
import { netBalanceSql } from '../sqlFragments';
import { runInSavepoint } from '../savepoint';

const COMPANIES_UPDATABLE_FIELDS: ReadonlyArray<keyof CompanyInput> = [
  'type',
  'account_type',
  'name',
  'tc_number',
  'profession',
  'tax_office',
  'tax_number',
  'trade_registry_no',
  'contact_person',
  'phone',
  'email',
  'address',
  'bank_name',
  'iban',
  'notes',
];

export class CompanyRepository extends BaseRepository<Company> {
  constructor(db: SqlJsDatabase) {
    super(db, 'companies');
  }

  getWithBalance(): CompanyWithBalance[] {
    const rows = this.query<Omit<CompanyWithBalance, 'receivable' | 'payable'>>(`
      SELECT c.*,
        ${netBalanceSql('t')} as balance
      FROM companies c
      LEFT JOIN transactions t ON t.company_id = c.id
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    return rows.map((row) => ({ ...row, ...splitNetBalance(row.balance) }));
  }

  generateCode(): string {
    return this.nextCode('CRH-');
  }

  create(data: CompanyInput): Company {
    const code = this.generateCode();
    const result = this.run(
      `INSERT INTO companies (code, type, account_type, name, tc_number, profession, tax_office, tax_number, trade_registry_no, contact_person, phone, email, address, bank_name, iban, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        data.type,
        data.account_type,
        data.name,
        data.tc_number || null,
        data.profession || null,
        data.tax_office || null,
        data.tax_number || null,
        data.trade_registry_no || null,
        data.contact_person || null,
        data.phone || null,
        data.email || null,
        data.address || null,
        data.bank_name || null,
        data.iban || null,
        data.notes || null,
      ]
    );
    return this.requireRow(this.getById(result.lastInsertRowid));
  }

  update(id: number, data: Partial<CompanyInput>): Company | undefined {
    return this.updateFields(id, data, COMPANIES_UPDATABLE_FIELDS);
  }

  getRelatedCounts(id: number): { transactionCount: number; projectCount: number } {
    const txCount = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE company_id = ?`,
      [id]
    );
    const projCount = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM projects WHERE client_company_id = ? AND is_active = 1`,
      [id]
    );
    return {
      transactionCount: txCount?.count || 0,
      projectCount: projCount?.count || 0,
    };
  }

  delete(id: number): { success: boolean } {
    const company = this.getById(id);
    if (!company) return { success: false };
    runInSavepoint(this.db, () =>
      moveToTrash(this.db, 'company', company, collectCompanyBundle(this.db, id))
    );
    return { success: true };
  }
}
