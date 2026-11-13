// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../../database/DatabaseService';
import { MONTHS } from '../../utils/constants';
import { calculateProjectFinancials } from '../../utils/financials';

let userDataPath: string;
let db: DatabaseService;

function run(sql: string, params: unknown[] = []): void {
  db.rawDb.run(sql, params);
}

function categoryId(name: string): number {
  return Number(db.rawDb.exec('SELECT id FROM categories WHERE name = ?', [name])[0].values[0][0]);
}

let nextId = 1000;
function addTx(fields: {
  type: string;
  amount: number;
  date: string;
  company?: number | null;
  project?: number | null;
  category?: number | null;
  scope?: string;
}): number {
  const id = nextId++;
  run(
    `INSERT INTO transactions (id, scope, company_id, project_id, type, category_id, date, description, amount, amount_try)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'x', ?, ?)`,
    [
      id,
      fields.scope ?? 'cari',
      fields.company ?? null,
      fields.project ?? null,
      fields.type,
      fields.category ?? null,
      fields.date,
      fields.amount,
      fields.amount,
    ]
  );
  return id;
}

function allocate(paymentId: number, invoiceId: number, amount: number): void {
  run('INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, ?)', [
    paymentId,
    invoiceId,
    amount,
  ]);
}

beforeEach(async () => {
  userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-analytics-'));
  db = new DatabaseService();
  await db.init(userDataPath);
  run(
    "INSERT INTO companies (id, code, type, account_type, name) VALUES (1, 'C1', 'company', 'customer', 'Customer')"
  );
  run(
    "INSERT INTO companies (id, code, type, account_type, name) VALUES (2, 'C2', 'company', 'supplier', 'Supplier')"
  );
  run(
    "INSERT INTO projects (id, code, name, ownership_type, status) VALUES (10, 'P10', 'P', 'own', 'active')"
  );
});

afterEach(() => {
  db.close();
  fs.rmSync(userDataPath, { recursive: true, force: true });
});

describe('account balances', () => {
  function overpaySupplier(): void {
    addTx({ type: 'invoice_out', amount: 500000, date: '2026-10-15', company: 1 });
    addTx({ type: 'payment_in', amount: 353500, date: '2026-10-20', company: 1 });
    addTx({ type: 'invoice_in', amount: 198500, date: '2026-10-01', company: 2 });
    addTx({ type: 'payment_out', amount: 208500, date: '2026-10-05', company: 2 });
  }

  it('adds an overpaid supplier to total receivables instead of dropping it', () => {
    overpaySupplier();

    const stats = db.analytics.getDashboardStats();

    expect(stats.totalReceivables).toBe(156500);
    expect(stats.totalPayables).toBe(0);
  });

  it('nets an account that both buys and sells before splitting it', () => {
    addTx({ type: 'invoice_out', amount: 1000, date: '2026-10-01', company: 1 });
    addTx({ type: 'invoice_in', amount: 300, date: '2026-10-02', company: 1 });
    addTx({ type: 'invoice_in', amount: 400, date: '2026-10-03', company: 2 });

    const stats = db.analytics.getDashboardStats();

    expect(stats.totalReceivables).toBe(700);
    expect(stats.totalPayables).toBe(400);
  });

  it('lists accounts in the debtor and creditor tables by their net balance', () => {
    overpaySupplier();
    addTx({ type: 'payment_in', amount: 200000, date: '2026-10-21', company: 1 });

    expect(db.analytics.getTopDebtors(5).map((d) => [d.name, d.balance])).toEqual([
      ['Supplier', 10000],
    ]);
    expect(db.analytics.getTopCreditors(5).map((d) => [d.name, d.balance])).toEqual([
      ['Customer', 53500],
    ]);
  });

  it('gives each account in the list a non-negative receivable and debt that match its balance', () => {
    overpaySupplier();

    const rows = db.companies
      .getWithBalance()
      .map((c) => [c.name, c.receivable, c.payable, c.balance]);

    expect(rows).toEqual([
      ['Customer', 146500, 0, 146500],
      ['Supplier', 10000, 0, 10000],
    ]);
  });
});

describe('monthly stats', () => {
  it('returns months in the same format as the MONTHS constant the charts use', () => {
    addTx({ type: 'invoice_out', amount: 100, date: '2026-03-15', company: 1 });
    addTx({ type: 'invoice_in', amount: 40, date: '2026-11-02', company: 2 });

    const stats = db.analytics.getMonthlyStats(2026);
    const monthValues = MONTHS.map((m) => m.value);

    expect(stats.map((s) => s.month)).toEqual(['03', '11']);
    for (const s of stats) expect(monthValues).toContain(s.month);
    expect(stats[0].income).toBe(100);
    expect(stats[1].expense).toBe(40);
  });

  it('returns income/expense for a single company (what the chart reads)', () => {
    addTx({ type: 'invoice_out', amount: 100, date: '2026-03-15', company: 1 });
    addTx({ type: 'payment_in', amount: 60, date: '2026-03-20', company: 1 });

    const [march] = db.analytics.getCompanyMonthlyStats(1, 2026);

    expect(march).toEqual({ month: '03', income: 100, expense: 0, collected: 60, paid: 0 });
  });
});

describe('project expense breakdown', () => {
  it('matches the project card: purchase invoices only, payments are not expenses', () => {
    const concrete = categoryId('Beton');
    const cash = categoryId('Nakit');
    const transfer = categoryId('EFT/Havale');

    const invoice = addTx({
      type: 'invoice_in',
      amount: 100_000,
      date: '2026-01-01',
      project: 10,
      company: 2,
      category: concrete,
      scope: 'project',
    });
    const settling = addTx({
      type: 'payment_out',
      amount: 100_000,
      date: '2026-01-10',
      project: 10,
      company: 2,
      category: cash,
      scope: 'project',
    });
    allocate(settling, invoice, 100_000);
    const partly = addTx({
      type: 'payment_out',
      amount: 30_000,
      date: '2026-01-11',
      project: 10,
      company: 2,
      category: transfer,
      scope: 'project',
    });
    allocate(partly, invoice, 10_000);
    addTx({
      type: 'payment_out',
      amount: 5_000,
      date: '2026-01-12',
      project: 10,
      category: cash,
      scope: 'project',
    });

    const breakdown = db.analytics.getProjectCategoryBreakdown(10);
    const byName = Object.fromEntries(breakdown.map((b) => [b.category, b.total]));

    expect(byName).toEqual({ Beton: 100_000 });

    const { totalExpense } = calculateProjectFinancials(db.transactions.getByProject(10));
    const breakdownTotal = breakdown.reduce((sum, b) => sum + b.total, 0);
    expect(breakdownTotal).toBe(totalExpense);
  });
});

describe('aging receivables', () => {
  const today = '2026-11-11';

  it('applies a recent payment to the oldest invoice instead of the recent bucket', () => {
    addTx({ type: 'invoice_out', amount: 1000, date: '2026-08-01', company: 1 });
    addTx({ type: 'payment_in', amount: 600, date: '2026-11-10', company: 1 });

    const [row] = db.analytics.getAgingReceivables(today);

    expect(row).toMatchObject({
      companyId: 1,
      current: 0,
      days30: 0,
      days60: 0,
      days90plus: 400,
      total: 400,
    });
  });

  it('respects payment matching before applying the rest oldest-first', () => {
    const old = addTx({ type: 'invoice_out', amount: 1000, date: '2026-07-01', company: 1 });
    const recent = addTx({ type: 'invoice_out', amount: 500, date: '2026-11-01', company: 1 });
    const matched = addTx({ type: 'payment_in', amount: 500, date: '2026-11-05', company: 1 });
    allocate(matched, recent, 500);
    addTx({ type: 'payment_in', amount: 300, date: '2026-11-06', company: 1 });

    const [row] = db.analytics.getAgingReceivables(today);

    expect(old).toBeGreaterThan(0);
    expect(row).toMatchObject({ current: 0, days90plus: 700, total: 700 });
  });

  it('never shows negative buckets and omits customers who paid everything', () => {
    addTx({ type: 'invoice_out', amount: 200, date: '2026-10-01', company: 1 });
    addTx({ type: 'payment_in', amount: 250, date: '2026-11-01', company: 1 });

    expect(db.analytics.getAgingReceivables(today)).toEqual([]);
  });

  it('puts each invoice in the bucket of its own age', () => {
    addTx({ type: 'invoice_out', amount: 10, date: '2026-11-01', company: 1 });
    addTx({ type: 'invoice_out', amount: 20, date: '2026-09-25', company: 1 });
    addTx({ type: 'invoice_out', amount: 30, date: '2026-08-20', company: 1 });
    addTx({ type: 'invoice_out', amount: 40, date: '2026-01-01', company: 1 });

    const [row] = db.analytics.getAgingReceivables(today);

    expect(row).toMatchObject({ current: 10, days30: 20, days60: 30, days90plus: 40, total: 100 });
  });
});
