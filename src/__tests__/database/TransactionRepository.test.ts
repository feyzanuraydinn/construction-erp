// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../../database/DatabaseService';
import type { TransactionInput } from '../../utils/schemas';

let userDataPath: string;
let db: DatabaseService;

const base: TransactionInput = {
  scope: 'project',
  company_id: null,
  project_id: null,
  type: 'invoice_in',
  category_id: null,
  date: '2026-11-11',
  description: 'Steel',
  amount: 1000,
  currency: 'USD',
  exchange_rate: 34.5678,
  document_no: null,
  linked_invoice_id: null,
  notes: null,
};

beforeEach(async () => {
  userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-tx-'));
  db = new DatabaseService();
  await db.init(userDataPath);
});

afterEach(() => {
  db.close();
  fs.rmSync(userDataPath, { recursive: true, force: true });
});

describe('TransactionRepository exchange rates', () => {
  it('stores the given rate and a TRY amount rounded to kuruş', () => {
    const tx = db.transactions.create(base);
    expect(tx.exchange_rate).toBe(34.5678);
    expect(tx.amount_try).toBe(34567.8);
  });

  it('values TRY transactions at rate 1 whatever is passed', () => {
    const tx = db.transactions.create({ ...base, currency: 'TRY', exchange_rate: 99 });
    expect(tx.exchange_rate).toBe(1);
    expect(tx.amount_try).toBe(1000);
  });

  it('refuses a foreign-currency transaction without a rate', () => {
    expect(() => db.transactions.create({ ...base, exchange_rate: null })).toThrow();
  });

  it("keeps the transaction's own rate when an edit sends no rate", () => {
    const tx = db.transactions.create(base);
    const updated = db.transactions.update(tx.id, {
      ...base,
      description: 'Steel (fixed typo)',
      exchange_rate: null,
    });
    expect(updated?.exchange_rate).toBe(34.5678);
    expect(updated?.amount_try).toBe(34567.8);
  });

  it('recomputes the TRY amount with the kept rate when the amount changes', () => {
    const tx = db.transactions.create(base);
    const updated = db.transactions.update(tx.id, { ...base, amount: 2000, exchange_rate: null });
    expect(updated?.amount_try).toBe(69135.6);
  });

  it('refuses switching to another foreign currency without a new rate', () => {
    const tx = db.transactions.create(base);
    expect(() =>
      db.transactions.update(tx.id, { ...base, currency: 'EUR', exchange_rate: null })
    ).toThrow();
  });

  it('uses rate 1 after switching to TRY', () => {
    const tx = db.transactions.create(base);
    const updated = db.transactions.update(tx.id, {
      ...base,
      currency: 'TRY',
      exchange_rate: null,
    });
    expect(updated?.exchange_rate).toBe(1);
    expect(updated?.amount_try).toBe(1000);
  });
});

describe('saveWithMatching', () => {
  const tryBase: TransactionInput = { ...base, currency: 'TRY', exchange_rate: 1 };
  let projectId: number;
  let supplierId: number;
  let expenseCategory: number;
  let incomeCategory: number;

  const categoryNamed = (name: string): number => {
    const result = db.rawDb.exec('SELECT id FROM categories WHERE name = ?', [name]);
    return Number(result[0].values[0][0]);
  };

  beforeEach(() => {
    db.rawDb.run(
      "INSERT INTO companies (id, code, type, account_type, name) VALUES (1, 'C1', 'company', 'supplier', 'S')"
    );
    db.rawDb.run(
      "INSERT INTO projects (id, code, name, ownership_type, status) VALUES (5, 'P5', 'P', 'own', 'active')"
    );
    projectId = 5;
    supplierId = 1;
    expenseCategory = categoryNamed('İşçilik');
    incomeCategory = categoryNamed('Kira Geliri');
  });

  const invoice = (amount: number) =>
    db.transactions.create({
      ...tryBase,
      project_id: projectId,
      company_id: supplierId,
      type: 'invoice_in',
      amount,
    });

  it('saves a payment with its matches in one step', () => {
    const inv = invoice(800);
    const { transaction } = db.transactions.saveWithMatching({
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: supplierId,
        type: 'payment_out',
        amount: 800,
      },
      paymentAllocations: [{ invoiceId: inv.id, amount: 800 }],
    });
    expect(transaction.allocated_amount).toBe(800);
    expect(db.transactions.getDetails(inv.id)?.settled_amount).toBe(800);
  });

  it('writes nothing when a match is invalid', () => {
    const inv = invoice(500);
    const count = () => db.transactions.getAllFiltered().length;
    const before = count();
    expect(() =>
      db.transactions.saveWithMatching({
        data: {
          ...tryBase,
          project_id: projectId,
          company_id: supplierId,
          type: 'payment_out',
          amount: 800,
        },
        paymentAllocations: [{ invoiceId: inv.id, amount: 600 }],
      })
    ).toThrow('exceeds_invoice');
    expect(count()).toBe(before);
  });

  it('removes a match when the payment is saved with an empty set', () => {
    const inv = invoice(800);
    const { transaction } = db.transactions.saveWithMatching({
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: supplierId,
        type: 'payment_out',
        amount: 800,
      },
      paymentAllocations: [{ invoiceId: inv.id, amount: 800 }],
    });
    db.transactions.saveWithMatching({
      id: transaction.id,
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: supplierId,
        type: 'payment_out',
        amount: 800,
      },
      paymentAllocations: [],
    });
    expect(db.paymentAllocations.getForPayment(transaction.id)).toEqual([]);
  });

  it('refuses to lower a payment below its matches unless they are changed too', () => {
    const inv = invoice(800);
    const { transaction } = db.transactions.saveWithMatching({
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: supplierId,
        type: 'payment_out',
        amount: 800,
      },
      paymentAllocations: [{ invoiceId: inv.id, amount: 800 }],
    });
    expect(() =>
      db.transactions.saveWithMatching({
        id: transaction.id,
        data: {
          ...tryBase,
          project_id: projectId,
          company_id: supplierId,
          type: 'payment_out',
          amount: 500,
        },
      })
    ).toThrow('exceeds_payment');
    expect(db.transactions.getDetails(transaction.id)?.amount).toBe(800);
  });

  it('books the unmatched rest of a payment as an expense record', () => {
    const inv = invoice(300);
    const { transaction, documentId } = db.transactions.saveWithMatching({
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: supplierId,
        type: 'payment_out',
        amount: 1000,
      },
      paymentAllocations: [{ invoiceId: inv.id, amount: 300 }],
      remainderDocument: { categoryId: expenseCategory, note: 'with payment' },
    });
    const document = db.transactions.getDetails(documentId!);
    expect(document).toMatchObject({
      type: 'invoice_in',
      amount: 700,
      currency: 'TRY',
      company_id: supplierId,
      project_id: projectId,
      category_id: expenseCategory,
      notes: 'with payment',
      settled_amount: 700,
    });
    expect(db.transactions.getDetails(transaction.id)?.allocated_amount).toBe(1000);
  });

  it('keeps currency and rate when the whole payment becomes the record', () => {
    const { documentId } = db.transactions.saveWithMatching({
      data: {
        ...base,
        project_id: projectId,
        company_id: supplierId,
        type: 'payment_out',
        amount: 100,
        exchange_rate: 35,
      },
      remainderDocument: { categoryId: expenseCategory, note: null },
    });
    expect(db.transactions.getDetails(documentId!)).toMatchObject({
      amount: 100,
      currency: 'USD',
      exchange_rate: 35,
      amount_try: 3500,
    });
  });

  it('rejects a category of the wrong type for the record', () => {
    expect(() =>
      db.transactions.saveWithMatching({
        data: {
          ...tryBase,
          project_id: projectId,
          company_id: supplierId,
          type: 'payment_out',
          amount: 100,
        },
        remainderDocument: { categoryId: incomeCategory, note: null },
      })
    ).toThrow('invalid_category');
    expect(db.transactions.getAllFiltered()).toEqual([]);
  });

  it('does not let a project payment without a company stay an advance', () => {
    expect(() =>
      db.transactions.saveWithMatching({
        data: {
          ...tryBase,
          project_id: projectId,
          company_id: null,
          type: 'payment_out',
          amount: 100,
        },
        paymentAllocations: [],
      })
    ).toThrow('needs_counterparty');
    const { documentId } = db.transactions.saveWithMatching({
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: null,
        type: 'payment_out',
        amount: 100,
      },
      paymentAllocations: [],
      remainderDocument: { categoryId: expenseCategory, note: null },
    });
    expect(documentId).not.toBeNull();
  });

  it('lets a company payment stay an advance', () => {
    const { transaction } = db.transactions.saveWithMatching({
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: supplierId,
        type: 'payment_out',
        amount: 100,
      },
      paymentAllocations: [],
    });
    expect(transaction.allocated_amount).toBe(0);
  });

  it('saves an invoice with the payments it is matched to', () => {
    const { transaction: payment } = db.transactions.saveWithMatching({
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: supplierId,
        type: 'payment_out',
        amount: 600,
      },
      paymentAllocations: [],
    });
    const { transaction: inv } = db.transactions.saveWithMatching({
      data: {
        ...tryBase,
        project_id: projectId,
        company_id: supplierId,
        type: 'invoice_in',
        amount: 1000,
      },
      invoiceAllocations: [{ paymentId: payment.id, amount: 600 }],
    });
    expect(inv.settled_amount).toBe(600);
    expect(db.transactions.getDetails(payment.id)?.allocated_amount).toBe(600);
  });
});

describe('updateChecked (edits that do not handle matches)', () => {
  const tryBase: TransactionInput = { ...base, currency: 'TRY', exchange_rate: 1 };

  beforeEach(() => {
    db.rawDb.run(
      "INSERT INTO companies (id, code, type, account_type, name) VALUES (1, 'C1', 'company', 'supplier', 'S')"
    );
    db.rawDb.run(
      "INSERT INTO companies (id, code, type, account_type, name) VALUES (2, 'C2', 'company', 'supplier', 'T')"
    );
    db.rawDb.run(
      "INSERT INTO projects (id, code, name, ownership_type, status) VALUES (5, 'P5', 'P', 'own', 'active')"
    );
  });

  const matchedPayment = () => {
    const invoice = db.transactions.create({
      ...tryBase,
      project_id: 5,
      company_id: 1,
      type: 'invoice_in',
      amount: 800,
    });
    const { transaction } = db.transactions.saveWithMatching({
      data: { ...tryBase, project_id: 5, company_id: 1, type: 'payment_out', amount: 800 },
      paymentAllocations: [{ invoiceId: invoice.id, amount: 800 }],
    });
    return transaction;
  };

  it('refuses lowering a matched payment below its matches', () => {
    const payment = matchedPayment();
    expect(() =>
      db.transactions.updateChecked(payment.id, {
        ...tryBase,
        project_id: 5,
        company_id: 1,
        type: 'payment_out',
        amount: 300,
      })
    ).toThrow('exceeds_payment');
    expect(db.transactions.getDetails(payment.id)?.amount).toBe(800);
  });

  it('refuses moving a matched payment to another company', () => {
    const payment = matchedPayment();
    expect(() =>
      db.transactions.updateChecked(payment.id, {
        ...tryBase,
        project_id: 5,
        company_id: 2,
        type: 'payment_out',
        amount: 800,
      })
    ).toThrow('counterparty_mismatch');
    expect(db.transactions.getDetails(payment.id)?.company_id).toBe(1);
  });

  it('allows ordinary edits', () => {
    const payment = matchedPayment();
    const updated = db.transactions.updateChecked(payment.id, {
      ...tryBase,
      project_id: 5,
      company_id: 1,
      type: 'payment_out',
      amount: 800,
      description: 'renamed',
    });
    expect(updated?.description).toBe('renamed');
  });

  it('refuses turning a project payment into an advance nobody owes, but lets an old one be edited', () => {
    const payment = matchedPayment();
    const { transaction: advance } = db.transactions.saveWithMatching({
      data: { ...tryBase, project_id: 5, company_id: 1, type: 'payment_out', amount: 100 },
      paymentAllocations: [],
    });
    expect(() =>
      db.transactions.updateChecked(advance.id, {
        ...tryBase,
        project_id: 5,
        company_id: null,
        type: 'payment_out',
        amount: 100,
      })
    ).toThrow('needs_counterparty');

    db.rawDb.run(
      `INSERT INTO transactions (id, scope, project_id, type, date, description, amount, amount_try)
       VALUES (99, 'project', 5, 'payment_out', '2026-01-01', 'old', 50, 50)`
    );
    expect(
      db.transactions.updateChecked(99, {
        ...tryBase,
        project_id: 5,
        company_id: null,
        type: 'payment_out',
        amount: 50,
        description: 'old, fixed',
      })?.description
    ).toBe('old, fixed');
    expect(payment.id).toBeGreaterThan(0);
  });
});
