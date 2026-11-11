// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../../database/DatabaseService';
import {
  analyzeData,
  countPending,
  applyRepairs,
  applyRates,
  applyAllocationFixes,
  applyUnmatched,
  completeReview,
  readBaseline,
} from '../../database/dataReview';

let userDataPath: string;
let db: DatabaseService;

type Raw = DatabaseService['rawDb'];

function one<T>(raw: Raw, sql: string, params: (string | number | null)[] = []): T {
  const stmt = raw.prepare(sql);
  stmt.bind(params);
  stmt.step();
  const row = stmt.getAsObject() as T;
  stmt.free();
  return row;
}

function all<T>(raw: Raw, sql: string, params: (string | number | null)[] = []): T[] {
  const stmt = raw.prepare(sql);
  stmt.bind(params);
  const out: T[] = [];
  while (stmt.step()) out.push(stmt.getAsObject() as T);
  stmt.free();
  return out;
}

function categoryId(raw: Raw, name: string): number {
  return one<{ id: number }>(raw, 'SELECT id FROM categories WHERE name = ?', [name]).id;
}

interface Tx {
  id: number;
  scope?: 'cari' | 'project' | 'company';
  company?: number | null;
  project?: number | null;
  type: 'invoice_out' | 'invoice_in' | 'payment_in' | 'payment_out';
  amount: number;
  amountTry?: number | null;
  currency?: 'TRY' | 'USD' | 'EUR';
  rate?: number | null;
  date?: string;
  category?: number | null;
  linkedInvoice?: number | null;
  description?: string;
}

function addTx(raw: Raw, tx: Tx): void {
  raw.run(
    `INSERT INTO transactions (id, scope, company_id, project_id, type, category_id, date, description, amount, currency, exchange_rate, amount_try, linked_invoice_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id,
      tx.scope ?? (tx.project ? 'project' : 'cari'),
      tx.company ?? null,
      tx.project ?? null,
      tx.type,
      tx.category ?? null,
      tx.date ?? '2026-03-01',
      tx.description ?? `tx ${tx.id}`,
      tx.amount,
      tx.currency ?? 'TRY',
      tx.rate === undefined ? 1 : tx.rate,
      tx.amountTry === undefined ? tx.amount : tx.amountTry,
      tx.linkedInvoice ?? null,
    ]
  );
}

function allocate(raw: Raw, paymentId: number, invoiceId: number, amount: number): void {
  raw.run('INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, ?)', [paymentId, invoiceId, amount]);
}

async function openLegacy(setup: (raw: Raw) => void): Promise<void> {
  const first = new DatabaseService();
  await first.init(userDataPath);
  const raw = first.rawDb;
  raw.run('PRAGMA foreign_keys = OFF');
  raw.run('DROP TABLE app_meta');
  raw.run('DELETE FROM schema_versions WHERE version >= 4');
  raw.run("INSERT INTO companies (id, code, type, account_type, name) VALUES (1, 'C1', 'company', 'supplier', 'Tedarikçi A')");
  raw.run("INSERT INTO companies (id, code, type, account_type, name) VALUES (2, 'C2', 'person', 'subcontractor', 'Usta Ali')");
  raw.run("INSERT INTO companies (id, code, type, account_type, name) VALUES (3, 'C3', 'company', 'customer', 'Müşteri M')");
  raw.run("INSERT INTO companies (id, code, type, account_type, name) VALUES (5, 'C5', 'company', 'supplier', 'B Firması')");
  raw.run("INSERT INTO projects (id, code, name, ownership_type, status) VALUES (10, 'P-10', 'Merkez', 'own', 'active')");
  setup(raw);
  first.close();
  db = new DatabaseService();
  await db.init(userDataPath);
}

beforeEach(() => {
  userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-review-'));
});

afterEach(() => {
  db?.close();
  fs.rmSync(userDataPath, { recursive: true, force: true });
});

describe('data review: clean data', () => {
  it('has nothing to review for a new database', async () => {
    db = new DatabaseService();
    await db.init(userDataPath);
    const report = analyzeData(db.rawDb);
    expect(countPending(report)).toBe(0);
    expect(report.completed).toBe(false);
  });

  it('migrates an old database to the review table and records the baseline on open', async () => {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 1, project: 10, type: 'invoice_in', amount: 1000 });
    });
    const version = one<{ v: number }>(db.rawDb, 'SELECT MAX(version) as v FROM schema_versions').v;
    expect(version).toBe(4);
    const baseline = readBaseline(db.rawDb);
    expect(baseline?.projects['10']).toMatchObject({ expense: 1000, profit: -1000 });
  });

  it('does not record a baseline for a database whose review is completed', async () => {
    db = new DatabaseService();
    await db.init(userDataPath);
    db.rawDb.run('DELETE FROM app_meta');
    completeReview(db.rawDb);
    db.close();
    db = new DatabaseService();
    await db.init(userDataPath);
    expect(readBaseline(db.rawDb)).toBeNull();
  });
});

describe('data review: repairs (step 1)', () => {
  it('corrects TRY values the first versions did not recompute after an edit', async () => {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 3, type: 'invoice_out', amount: 1500, amountTry: 1000 });
      addTx(raw, { id: 2, company: 3, type: 'invoice_out', amount: 200, currency: 'USD', rate: 30, amountTry: 3000 });
      addTx(raw, { id: 3, company: 3, type: 'payment_in', amount: 400, amountTry: null });
      addTx(raw, { id: 4, company: 3, type: 'invoice_out', amount: 100, currency: 'EUR', rate: 35, amountTry: 3500 });
    });
    const report = analyzeData(db.rawDb);
    expect(report.amountFixes.map((f) => [f.id, f.correctTry])).toEqual([
      [1, 1500],
      [2, 6000],
      [3, 400],
    ]);

    applyRepairs(db.rawDb, []);
    const values = all<{ id: number; amount_try: number }>(db.rawDb, 'SELECT id, amount_try FROM transactions ORDER BY id');
    expect(values.map((v) => v.amount_try)).toEqual([1500, 6000, 400, 3500]);
    expect(analyzeData(db.rawDb).amountFixes).toEqual([]);
  });

  it('moves records of deleted companies/projects to the trash and keeps tagged account records', async () => {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 4, type: 'invoice_in', amount: 900 });
      addTx(raw, { id: 2, company: 4, type: 'payment_out', amount: 900 });
      allocate(raw, 2, 1, 900);
      addTx(raw, { id: 3, scope: 'project', project: 11, type: 'invoice_in', amount: 300 });
      addTx(raw, { id: 4, scope: 'cari', company: 1, project: 11, type: 'invoice_in', amount: 250 });
      addTx(raw, { id: 5, company: 1, type: 'invoice_in', amount: 100, category: 9999 });
      addTx(raw, { id: 6, company: 1, type: 'payment_out', amount: 100, linkedInvoice: 8888 });
      allocate(raw, 7777, 5, 50);
      raw.run("INSERT INTO project_parties (project_id, company_id, role) VALUES (11, 1, 'supplier')");
      raw.run("INSERT INTO projects (id, code, name, ownership_type, status, client_company_id) VALUES (12, 'P-12', 'Eski', 'client', 'active', 4)");
    });

    const report = analyzeData(db.rawDb);
    expect(report.orphans.map((o) => [o.id, o.missing])).toEqual([
      [1, 'company'],
      [2, 'company'],
      [3, 'project'],
    ]);
    expect(report.dangling).toMatchObject({
      categories: 1,
      linkedInvoices: 1,
      clientCompanies: 1,
      allocations: 1,
      parties: 1,
      projectTags: 1,
    });

    applyRepairs(db.rawDb, [1, 2, 3]);
    const after = analyzeData(db.rawDb);
    expect(after.orphans).toEqual([]);
    expect(Object.values(after.dangling).every((n) => n === 0)).toBe(true);

    const ids = all<{ id: number }>(db.rawDb, 'SELECT id FROM transactions ORDER BY id').map((r) => r.id);
    expect(ids).toEqual([4, 5, 6]);
    expect(one<{ project_id: number | null }>(db.rawDb, 'SELECT project_id FROM transactions WHERE id = 4').project_id).toBeNull();
    expect(db.trash.getAll()).toHaveLength(3);
    expect(db.checkForeignKeys().ok).toBe(true);

    const item = db.trash.getAll().find((i) => JSON.parse(i.data).id === 1)!;
    expect(db.trash.restore(item.id)).toEqual({ success: false, error: 'parent_missing' });
  });

  it('keeps an orphan the user did not select', async () => {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 4, type: 'invoice_in', amount: 900 });
    });
    const result = applyRepairs(db.rawDb, []);
    expect(result.skipped).toBe(1);
    expect(analyzeData(db.rawDb).orphans).toHaveLength(1);
  });
});

describe('data review: exchange rates (step 2)', () => {
  it('lists USD/EUR records valued 1:1 and rescales same-currency matches', async () => {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 1, project: 10, type: 'invoice_in', amount: 1000, currency: 'USD', rate: 1, amountTry: 1000 });
      addTx(raw, { id: 2, company: 1, project: 10, type: 'payment_out', amount: 1000, currency: 'USD', rate: 1, amountTry: 1000 });
      allocate(raw, 2, 1, 1000);
    });
    const report = analyzeData(db.rawDb);
    expect(report.rateIssues.map((r) => r.id)).toEqual([1, 2]);
    expect(report.amountFixes).toEqual([]);

    applyRates(db.rawDb, [
      { id: 1, rate: 34 },
      { id: 2, rate: 35 },
    ]);
    const tx = all<{ id: number; amount_try: number }>(db.rawDb, 'SELECT id, amount_try FROM transactions ORDER BY id');
    expect(tx.map((t) => t.amount_try)).toEqual([34000, 35000]);
    expect(one<{ amount: number }>(db.rawDb, 'SELECT amount FROM payment_allocations').amount).toBe(34000);
    const after = analyzeData(db.rawDb);
    expect(after.rateIssues).toEqual([]);
    expect(after.allocationIssues).toEqual([]);
  });

  it('skips records without a valid new rate', async () => {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 1, type: 'invoice_in', amount: 10, currency: 'EUR', rate: 1, amountTry: 10 });
    });
    expect(applyRates(db.rawDb, [{ id: 1, rate: 1 }]).skipped).toBe(1);
    expect(analyzeData(db.rawDb).rateIssues).toHaveLength(1);
  });
});

describe('data review: matches that do not fit (step 3)', () => {
  it('finds and fixes each kind', async () => {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 5, project: 10, type: 'invoice_in', amount: 4000 });
      addTx(raw, { id: 2, project: 10, type: 'payment_out', amount: 4000 });
      allocate(raw, 2, 1, 4000);
      addTx(raw, { id: 3, company: 5, project: 10, type: 'invoice_in', amount: 700 });
      addTx(raw, { id: 4, company: 1, project: 10, type: 'payment_out', amount: 700 });
      allocate(raw, 4, 3, 700);
      addTx(raw, { id: 5, company: 1, type: 'invoice_in', amount: 1200, date: '2026-01-01' });
      addTx(raw, { id: 6, company: 1, type: 'invoice_in', amount: 800, date: '2026-02-01' });
      addTx(raw, { id: 7, company: 1, type: 'payment_out', amount: 1500 });
      allocate(raw, 7, 5, 1200);
      allocate(raw, 7, 6, 800);
      addTx(raw, { id: 8, company: 1, type: 'invoice_out', amount: 100 });
      addTx(raw, { id: 9, company: 1, type: 'payment_out', amount: 100 });
      allocate(raw, 9, 8, 100);
    });

    const issues = analyzeData(db.rawDb).allocationIssues;
    const byKind = Object.fromEntries(issues.map((i) => [i.kind, i]));
    expect(byKind.assign_company).toMatchObject({ paymentId: 2, companyId: 5, companyName: 'B Firması' });
    expect(byKind.counterparty).toMatchObject({ paymentId: 4, invoiceId: 3 });
    expect(byKind.payment_over.changes).toEqual([{ allocationId: expect.any(Number), invoiceDescription: 'tx 6', from: 800, to: 300 }]);
    expect(byKind.type_mismatch).toMatchObject({ paymentId: 9, invoiceId: 8 });

    applyAllocationFixes(db.rawDb, issues.map((i) => i.key));
    expect(analyzeData(db.rawDb).allocationIssues).toEqual([]);
    expect(one<{ company_id: number }>(db.rawDb, 'SELECT company_id FROM transactions WHERE id = 2').company_id).toBe(5);
    const allocations = all<{ payment_id: number; invoice_id: number; amount: number }>(
      db.rawDb,
      'SELECT payment_id, invoice_id, amount FROM payment_allocations ORDER BY payment_id, invoice_id'
    );
    expect(allocations).toEqual([
      { payment_id: 2, invoice_id: 1, amount: 4000 },
      { payment_id: 7, invoice_id: 5, amount: 1200 },
      { payment_id: 7, invoice_id: 6, amount: 300 },
    ]);
  });
});

describe('data review: unmatched payments (step 4)', () => {
  async function openProjectScenario(): Promise<void> {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 1, project: 10, type: 'invoice_in', amount: 10000, date: '2026-01-05' });
      addTx(raw, { id: 2, company: 1, project: 10, type: 'payment_out', amount: 10000, date: '2026-01-10' });
      addTx(raw, { id: 3, company: 2, project: 10, type: 'payment_out', amount: 3000, date: '2026-01-12' });
      addTx(raw, { id: 4, project: 10, type: 'payment_out', amount: 500, date: '2026-01-15' });
      addTx(raw, { id: 5, company: 3, project: 10, type: 'invoice_out', amount: 50000, date: '2026-01-02' });
      addTx(raw, { id: 6, company: 3, project: 10, type: 'payment_in', amount: 20000, date: '2026-01-20' });
      addTx(raw, { id: 7, company: 3, type: 'payment_in', amount: 5000, date: '2026-01-03' });
      addTx(raw, { id: 8, company: 1, type: 'payment_out', amount: 2000, date: '2026-02-01' });
      addTx(raw, { id: 9, scope: 'company', type: 'payment_out', amount: 750, date: '2026-01-30' });
    });
  }

  it('lists what changes meaning, with what matching would take', async () => {
    await openProjectScenario();
    const report = analyzeData(db.rawDb);
    const list = Object.fromEntries(report.unmatchedPayments.map((p) => [p.id, p]));
    expect(Object.keys(list).map(Number)).toEqual([2, 3, 4, 6, 7]);
    expect(list[2]).toMatchObject({ matchable: 10000, rest: 0, countedByOldProjectPage: true });
    expect(list[3]).toMatchObject({ matchable: 0, rest: 3000, advanceAllowed: true, companyType: 'person' });
    expect(list[4]).toMatchObject({ rest: 500, advanceAllowed: false });
    expect(list[6]).toMatchObject({ matchable: 20000, rest: 0 });
    expect(list[7]).toMatchObject({ matchable: 5000, rest: 0, countedByOldProjectPage: false });
    expect(report.legacyFirmPayments).toMatchObject([{ id: 9, becomes: 'invoice_in' }]);

    expect(report.baseline?.projects['10']).toMatchObject({ income: 70000, expense: 23500 });
    expect(report.projectEffects[0]).toMatchObject({
      projectId: 10,
      before: { income: 70000, expense: 23500 },
      now: { income: 50000, expense: 10000 },
    });
  });

  it('applies the choices: match, book the rest, keep advances', async () => {
    await openProjectScenario();
    const labour = categoryId(db.rawDb, 'İşçilik');
    const transport = categoryId(db.rawDb, 'Nakliye');
    const rent = categoryId(db.rawDb, 'Ofis Kirası');

    const result = applyUnmatched(
      db.rawDb,
      [
        { id: 2, match: true, rest: 'advance', categoryId: null },
        { id: 3, match: false, rest: 'document', categoryId: labour },
        { id: 4, match: false, rest: 'document', categoryId: transport },
        { id: 6, match: true, rest: 'advance', categoryId: null },
        { id: 7, match: true, rest: 'advance', categoryId: null },
      ],
      [{ id: 9, categoryId: rent }],
      'from review'
    );
    expect(result).toEqual({ changed: 6, skipped: 0 });

    const allocations = all<{ payment_id: number; invoice_id: number; amount: number }>(
      db.rawDb,
      'SELECT payment_id, invoice_id, amount FROM payment_allocations WHERE invoice_id <= 9 ORDER BY payment_id'
    );
    expect(allocations).toEqual([
      { payment_id: 2, invoice_id: 1, amount: 10000 },
      { payment_id: 6, invoice_id: 5, amount: 20000 },
      { payment_id: 7, invoice_id: 5, amount: 5000 },
    ]);

    const documents = all<{ type: string; amount: number; category_id: number; company_id: number | null; project_id: number; notes: string; matched: number }>(
      db.rawDb,
      `SELECT t.type, t.amount, t.category_id, t.company_id, t.project_id, t.notes,
         (SELECT SUM(amount) FROM payment_allocations WHERE invoice_id = t.id) as matched
       FROM transactions t WHERE t.id > 9 ORDER BY t.id`
    );
    expect(documents).toEqual([
      { type: 'invoice_in', amount: 3000, category_id: labour, company_id: 2, project_id: 10, notes: 'from review', matched: 3000 },
      { type: 'invoice_in', amount: 500, category_id: transport, company_id: null, project_id: 10, notes: 'from review', matched: 500 },
    ]);
    expect(one<{ type: string; category_id: number }>(db.rawDb, 'SELECT type, category_id FROM transactions WHERE id = 9')).toEqual({
      type: 'invoice_in',
      category_id: rent,
    });

    const after = analyzeData(db.rawDb);
    expect(after.unmatchedPayments).toEqual([]);
    expect(after.legacyFirmPayments).toEqual([]);
    expect(after.projectEffects[0]).toMatchObject({ now: { income: 50000, expense: 13500, profit: 36500 } });
    expect(countPending(after)).toBe(0);
  });

  it('never leaves a payment without a company as an advance', async () => {
    await openProjectScenario();
    const result = applyUnmatched(db.rawDb, [{ id: 4, match: false, rest: 'advance', categoryId: null }], [], null);
    expect(result).toEqual({ changed: 0, skipped: 1 });
    expect(analyzeData(db.rawDb).unmatchedPayments.some((p) => p.id === 4)).toBe(true);
  });

  it('is atomic: a failing step changes nothing', async () => {
    await openProjectScenario();
    const before = all(db.rawDb, 'SELECT * FROM payment_allocations');
    expect(() =>
      applyUnmatched(
        db.rawDb,
        [
          { id: 2, match: true, rest: 'advance', categoryId: null },
          { id: 3, match: false, rest: 'document', categoryId: categoryId(db.rawDb, 'Kira Geliri') },
        ],
        [],
        null
      )
    ).toThrow('invalid_category');
    expect(all(db.rawDb, 'SELECT * FROM payment_allocations')).toEqual(before);
  });

  it('stops asking about unmatched payments once the review is completed', async () => {
    await openProjectScenario();
    completeReview(db.rawDb);
    const report = analyzeData(db.rawDb);
    expect(report.completed).toBe(true);
    expect(report.unmatchedPayments).toEqual([]);
  });
});

describe('data review: quick status for the banner', () => {
  it('agrees with the full report on whether there is anything to review', async () => {
    await openLegacy((raw) => {
      addTx(raw, { id: 1, company: 1, project: 10, type: 'invoice_in', amount: 1000 });
      addTx(raw, { id: 2, company: 1, project: 10, type: 'payment_out', amount: 1000 });
      addTx(raw, { id: 3, company: 4, type: 'invoice_in', amount: 50 });
    });
    const { getReviewStatus } = await import('../../database/dataReview');
    const status = getReviewStatus(db.rawDb);
    expect(status.completed).toBe(false);
    expect(status.pending).toBe(countPending(analyzeData(db.rawDb)));
  });

  it('reports nothing for clean data', async () => {
    db = new DatabaseService();
    await db.init(userDataPath);
    const { getReviewStatus } = await import('../../database/dataReview');
    expect(getReviewStatus(db.rawDb)).toEqual({ completed: false, pending: 0 });
  });
});
