// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../../database/DatabaseService';
import { materialSchema, projectSchema, companySchema } from '../../utils/schemas';
import { SaveProblemError } from '../../database/repositories/TransactionRepository';
import { amountInTry } from '../../utils/money';
import { tryAmountSql } from '../../database/sqlFragments';

let userDataPath: string;
let db: DatabaseService;

beforeEach(async () => {
  userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-update-'));
  db = new DatabaseService();
  await db.init(userDataPath);
});

afterEach(() => {
  db.close();
  fs.rmSync(userDataPath, { recursive: true, force: true });
});

function ageRow(table: string, id: number) {
  db.rawDb.run(`UPDATE ${table} SET updated_at = '2000-01-01 00:00:00' WHERE id = ?`, [id]);
}

describe('repository updates', () => {
  it('updates only the given project fields, keeps the code and refreshes updated_at', () => {
    const project = db.projects.create(
      projectSchema.parse({
        code: 'PRJ-T1',
        name: 'Konut',
        ownership_type: 'own',
        project_type: 'residential',
      })
    );
    ageRow('projects', project.id);

    const updated = db.projects.update(project.id, {
      name: 'Konut Blok A',
      estimated_budget: 1250000.5,
    });

    expect(updated?.name).toBe('Konut Blok A');
    expect(updated?.estimated_budget).toBe(1250000.5);
    expect(updated?.code).toBe('PRJ-T1');
    expect(updated?.ownership_type).toBe('own');
    expect(updated?.updated_at).not.toBe('2000-01-01 00:00:00');
  });

  it('returns the material unchanged when nothing updatable is given', () => {
    const material = db.materials.create(
      materialSchema.parse({ code: 'MLZ-1', name: 'Çimento', unit: 'torba', min_stock: 10 })
    );
    ageRow('materials', material.id);

    const same = db.materials.update(material.id, {});
    expect(same?.updated_at).toBe('2000-01-01 00:00:00');

    const updated = db.materials.update(material.id, { min_stock: 25, notes: null });
    expect(updated?.min_stock).toBe(25);
    expect(updated?.notes).toBeNull();
    expect(updated?.name).toBe('Çimento');
  });

  it('updates a company and refreshes updated_at', () => {
    const company = db.companies.create(
      companySchema.parse({ type: 'company', account_type: 'supplier', name: 'Demir Tedarik' })
    );
    ageRow('companies', company.id);

    const updated = db.companies.update(company.id, { phone: '0532 000 00 00' });

    expect(updated?.phone).toBe('0532 000 00 00');
    expect(updated?.name).toBe('Demir Tedarik');
    expect(updated?.updated_at).not.toBe('2000-01-01 00:00:00');
  });

  it('refreshes updated_at when a transaction is edited', () => {
    const tx = db.transactions.create({
      scope: 'cari',
      company_id: null,
      project_id: null,
      type: 'invoice_out',
      category_id: null,
      date: '2026-11-11',
      description: 'Daire satışı',
      amount: 1000,
      currency: 'TRY',
      exchange_rate: 1,
      document_no: null,
      linked_invoice_id: null,
      notes: null,
    });
    ageRow('transactions', tx.id);

    const updated = db.transactions.update(tx.id, { description: 'Daire satışı (düzeltildi)' });

    expect(updated?.description).toBe('Daire satışı (düzeltildi)');
    expect(updated?.updated_at).not.toBe('2000-01-01 00:00:00');
  });
});

describe('language-neutral errors', () => {
  const tx = {
    scope: 'cari' as const,
    company_id: null,
    project_id: null,
    type: 'invoice_out' as const,
    category_id: null,
    date: '2026-11-11',
    description: 'Daire satışı',
    amount: 1000,
    currency: 'TRY' as const,
    exchange_rate: 1,
    document_no: null,
    linked_invoice_id: null,
    notes: null,
  };

  function problemOf(run: () => unknown): string | null {
    try {
      run();
      return null;
    } catch (error) {
      return error instanceof SaveProblemError ? error.problem : 'other';
    }
  }

  it('reports amount and rate problems as codes, not as Turkish text', () => {
    expect(problemOf(() => db.transactions.create({ ...tx, amount: 0 }))).toBe(
      'amount_not_positive'
    );
    expect(
      problemOf(() => db.transactions.create({ ...tx, currency: 'EUR', exchange_rate: null }))
    ).toBe('rate_not_positive');
    const created = db.transactions.create(tx);
    expect(
      problemOf(() => db.transactions.update(created.id, { currency: 'USD', exchange_rate: null }))
    ).toBe('rate_not_positive');
  });

  it('reports trash restore problems as codes', () => {
    expect(db.trash.restore(999)).toEqual({ success: false, error: 'not_found' });
    db.rawDb.run(
      `INSERT INTO trash (type, data, deleted_at) VALUES ('company', 'not json', '2026-11-11')`
    );
    const id = db.trash.getAll()[0].id;
    expect(db.trash.restore(id)).toEqual({ success: false, error: 'invalid_data' });
  });
});

describe('generated codes', () => {
  it('counts numerically past 999 instead of sorting codes as text', () => {
    for (const [name, code] of [
      ['A', 'CRH-999'],
      ['B', 'CRH-1000'],
      ['C', 'CRH-ÖZEL'],
    ]) {
      const company = db.companies.create(
        companySchema.parse({ type: 'company', account_type: 'supplier', name })
      );
      db.rawDb.run('UPDATE companies SET code = ? WHERE id = ?', [code, company.id]);
    }
    expect(db.companies.generateCode()).toBe('CRH-1001');
  });

  it('ignores hand-typed material codes instead of producing MLZ-NaN', () => {
    expect(db.materials.generateCode()).toBe('MLZ-001');
    db.materials.create(materialSchema.parse({ code: 'MLZ-004', name: 'Kum', unit: 'ton' }));
    db.materials.create(
      materialSchema.parse({ code: 'ÇİMENTO-A', name: 'Çimento', unit: 'torba' })
    );
    expect(db.materials.generateCode()).toBe('MLZ-005');
  });

  it('starts each year at 001 for projects', () => {
    const prefix = `PRJ-${new Date().getFullYear()}-`;
    expect(db.projects.generateCode()).toBe(`${prefix}001`);
    db.projects.create(
      projectSchema.parse({
        code: `${prefix}007`,
        name: 'Konut',
        ownership_type: 'own',
        project_type: 'residential',
      })
    );
    expect(db.projects.generateCode()).toBe(`${prefix}008`);
  });
});

describe('TRY amounts', () => {
  it('treats a broken zero TRY amount the same way in SQL and in the app', () => {
    const company = db.companies.create(
      companySchema.parse({ type: 'company', account_type: 'customer', name: 'Eski Kayıt' })
    );
    const tx = db.transactions.create({
      scope: 'cari',
      company_id: company.id,
      project_id: null,
      type: 'invoice_out',
      category_id: null,
      date: '2026-11-11',
      description: 'Eski satış',
      amount: 2500,
      currency: 'TRY',
      exchange_rate: 1,
      document_no: null,
      linked_invoice_id: null,
      notes: null,
    });
    db.rawDb.run('UPDATE transactions SET amount_try = 0 WHERE id = ?', [tx.id]);

    const sql = db.rawDb.exec(`SELECT ${tryAmountSql()} FROM transactions WHERE id = ${tx.id}`)[0]
      .values[0][0];
    const row = db.transactions.getById(tx.id);

    expect(sql).toBe(2500);
    expect(row && amountInTry(row)).toBe(2500);
  });
});
