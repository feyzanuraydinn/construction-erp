// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../../database/DatabaseService';
import { RESTORE_PARENT_MISSING } from '../../database/repositories/trashBundle';

let userDataPath: string;
let db: DatabaseService;

function value(sql: string, params: unknown[] = []): unknown {
  const result = db.rawDb.exec(sql, params);
  return result[0]?.values[0]?.[0] ?? null;
}

function count(table: string, where = '1 = 1', params: unknown[] = []): number {
  return Number(value(`SELECT COUNT(*) FROM ${table} WHERE ${where}`, params));
}

function latestTrashId(): number {
  return Number(value('SELECT MAX(id) FROM trash'));
}

function seed(): void {
  const run = (sql: string) => db.rawDb.run(sql);
  run("INSERT INTO companies (id, code, type, account_type, name) VALUES (1, 'CRH-001', 'company', 'customer', 'A')");
  run("INSERT INTO companies (id, code, type, account_type, name) VALUES (2, 'CRH-002', 'company', 'supplier', 'B')");
  run("INSERT INTO projects (id, code, name, ownership_type, client_company_id, status) VALUES (10, 'PRJ-10', 'P', 'client', 1, 'active')");
  run("INSERT INTO projects (id, code, name, ownership_type, status) VALUES (11, 'PRJ-11', 'Q', 'own', 'active')");
  run(`INSERT INTO transactions (id, scope, company_id, project_id, type, date, description, amount, amount_try)
       VALUES (100, 'cari', 1, 10, 'invoice_out', '2026-01-01', 'A sale tagged P', 1000, 1000)`);
  run(`INSERT INTO transactions (id, scope, company_id, project_id, type, date, description, amount, amount_try)
       VALUES (101, 'project', 2, 10, 'invoice_in', '2026-01-02', 'Concrete for P', 500, 500)`);
  run(`INSERT INTO transactions (id, scope, company_id, project_id, type, date, description, amount, amount_try, linked_invoice_id)
       VALUES (102, 'cari', 2, NULL, 'payment_out', '2026-01-03', 'Pay B', 300, 300, 101)`);
  run(`INSERT INTO transactions (id, scope, company_id, project_id, type, date, description, amount, amount_try)
       VALUES (103, 'cari', 1, NULL, 'payment_in', '2026-01-04', 'A pays', 200, 200)`);
  run('INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (102, 101, 300)');
  run("INSERT INTO project_parties (project_id, company_id, role) VALUES (10, 2, 'supplier')");
  run("INSERT INTO materials (id, code, name, unit, current_stock) VALUES (50, 'MLZ-50', 'Cement', 'bag', 40)");
  run(`INSERT INTO stock_movements (id, material_id, movement_type, quantity, project_id, company_id, date)
       VALUES (500, 50, 'in', 50, 10, 2, '2026-01-05')`);
  run(`INSERT INTO stock_movements (id, material_id, movement_type, quantity, project_id, date)
       VALUES (501, 50, 'out', 10, NULL, '2026-01-06')`);
  db.save();
}

beforeEach(async () => {
  userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-trash-'));
  db = new DatabaseService();
  await db.init(userDataPath);
  seed();
});

afterEach(() => {
  db.close();
  fs.rmSync(userDataPath, { recursive: true, force: true });
});

describe('foreign keys', () => {
  it('stay enforced after the database is saved', () => {
    db.save();
    db.createBackup(path.join(userDataPath, 'backups'));
    expect(value('PRAGMA foreign_keys')).toBe(1);
  });
});

describe('deleting a project', () => {
  it('removes its own transactions but only unlinks account transactions', () => {
    db.projects.delete(10);

    expect(count('projects', 'id = 10')).toBe(0);
    expect(count('transactions', 'id = 101')).toBe(0);
    expect(count('project_parties', 'project_id = 10')).toBe(0);
    expect(count('payment_allocations')).toBe(0);
    expect(value('SELECT project_id FROM transactions WHERE id = 100')).toBeNull();
    expect(count('transactions', 'id IN (100, 102, 103)')).toBe(3);
    expect(value('SELECT linked_invoice_id FROM transactions WHERE id = 102')).toBeNull();
    expect(value('SELECT project_id FROM stock_movements WHERE id = 500')).toBeNull();
  });

  it('restores the project with everything it took and re-links what it touched', () => {
    db.projects.delete(10);
    const result = db.trash.restore(latestTrashId());

    expect(result).toEqual({ success: true });
    expect(count('trash')).toBe(0);
    expect(count('projects', 'id = 10')).toBe(1);
    expect(count('transactions', 'id = 101')).toBe(1);
    expect(count('project_parties', 'project_id = 10 AND company_id = 2')).toBe(1);
    expect(count('payment_allocations', 'payment_id = 102 AND invoice_id = 101')).toBe(1);
    expect(value('SELECT project_id FROM transactions WHERE id = 100')).toBe(10);
    expect(value('SELECT linked_invoice_id FROM transactions WHERE id = 102')).toBe(101);
    expect(value('SELECT project_id FROM stock_movements WHERE id = 500')).toBe(10);
  });

  it('does not override a link the user changed after the delete', () => {
    db.projects.delete(10);
    db.rawDb.run('UPDATE transactions SET project_id = 11 WHERE id = 100');

    db.trash.restore(latestTrashId());

    expect(value('SELECT project_id FROM transactions WHERE id = 100')).toBe(11);
  });
});

describe('deleting a company', () => {
  it('removes its transactions and client projects, unlinks other accounts', () => {
    db.companies.delete(1);

    expect(count('companies', 'id = 1')).toBe(0);
    expect(count('projects', 'id = 10')).toBe(0);
    expect(count('transactions', 'company_id = 1')).toBe(0);
    expect(count('transactions', 'id = 101')).toBe(0);
    expect(count('transactions', 'id = 102')).toBe(1);
    expect(value('SELECT project_id FROM stock_movements WHERE id = 500')).toBeNull();
  });

  it('restores the company with its transactions and client projects', () => {
    const before = count('transactions');
    db.companies.delete(1);
    const result = db.trash.restore(latestTrashId());

    expect(result).toEqual({ success: true });
    expect(count('companies', 'id = 1')).toBe(1);
    expect(count('projects', 'id = 10')).toBe(1);
    expect(count('transactions')).toBe(before);
    expect(value('SELECT project_id FROM transactions WHERE id = 100')).toBe(10);
    expect(count('payment_allocations', 'payment_id = 102 AND invoice_id = 101')).toBe(1);
    expect(value('SELECT project_id FROM stock_movements WHERE id = 500')).toBe(10);
  });
});

describe('deleting a transaction', () => {
  it('restores its payment allocations and the invoice link', () => {
    db.transactions.delete(101);
    expect(count('payment_allocations')).toBe(0);

    expect(db.trash.restore(latestTrashId())).toEqual({ success: true });

    expect(count('payment_allocations', 'payment_id = 102 AND invoice_id = 101')).toBe(1);
    expect(value('SELECT linked_invoice_id FROM transactions WHERE id = 102')).toBe(101);
  });

  it('reports a missing parent and changes nothing when its company was deleted later', () => {
    db.transactions.delete(101);
    const transactionTrashId = latestTrashId();
    db.companies.delete(2);

    const result = db.trash.restore(transactionTrashId);

    expect(result).toEqual({ success: false, error: RESTORE_PARENT_MISSING });
    expect(count('transactions', 'id = 101')).toBe(0);
    expect(count('trash', 'id = ?', [transactionTrashId])).toBe(1);
    db.save();
    expect(value('PRAGMA foreign_keys')).toBe(1);
  });
});

describe('deleting a material', () => {
  it('restores the material with its stock movements and unchanged stock', () => {
    db.materials.delete(50);
    expect(count('stock_movements', 'material_id = 50')).toBe(0);

    expect(db.trash.restore(latestTrashId())).toEqual({ success: true });

    expect(count('stock_movements', 'material_id = 50')).toBe(2);
    expect(value('SELECT current_stock FROM materials WHERE id = 50')).toBe(40);
  });
});

describe('items trashed by older versions', () => {
  it('still restore from the root row only', () => {
    db.rawDb.run("INSERT INTO companies (id, code, type, account_type, name) VALUES (3, 'CRH-003', 'person', 'customer', 'Old')");
    const legacyCompany = db.companies.getById(3);
    db.rawDb.run('DELETE FROM companies WHERE id = 3');
    db.rawDb.run("INSERT INTO trash (type, data) VALUES ('company', ?)", [JSON.stringify(legacyCompany)]);

    expect(db.trash.restore(latestTrashId())).toEqual({ success: true });

    expect(value('SELECT name FROM companies WHERE id = 3')).toBe('Old');
    expect(value('PRAGMA foreign_keys')).toBe(1);
  });
});
