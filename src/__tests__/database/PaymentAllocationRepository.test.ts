// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseService } from '../../database/DatabaseService';

let userDataPath: string;
let db: DatabaseService;

function addTx(id: number, type: string, amountTry: number, amount = amountTry): void {
  db.rawDb.run(
    `INSERT INTO transactions (id, scope, company_id, type, date, description, amount, amount_try)
     VALUES (?, 'cari', 1, ?, '2026-11-01', 'x', ?, ?)`,
    [id, type, amount, amountTry]
  );
}

beforeEach(async () => {
  userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-alloc-'));
  db = new DatabaseService();
  await db.init(userDataPath);
  db.rawDb.run(
    "INSERT INTO companies (id, code, type, account_type, name) VALUES (1, 'C1', 'company', 'customer', 'C')"
  );
  addTx(1, 'payment_in', 1000);
  addTx(2, 'invoice_out', 700);
  addTx(3, 'invoice_out', 500);
  addTx(4, 'invoice_in', 300);
  addTx(5, 'payment_in', 3000, 100);
  addTx(6, 'payment_in', 500);
});

afterEach(() => {
  db.close();
  fs.rmSync(userDataPath, { recursive: true, force: true });
});

const check = (paymentId: number, allocations: { invoiceId: number; amount: number }[]) =>
  db.paymentAllocations.findAllocationProblem(paymentId, allocations);

describe('findAllocationProblem', () => {
  it('accepts allocations within the payment and the invoices', () => {
    expect(
      check(1, [
        { invoiceId: 2, amount: 700 },
        { invoiceId: 3, amount: 300 },
      ])
    ).toBeNull();
  });

  it('rejects allocations that exceed the payment', () => {
    expect(
      check(1, [
        { invoiceId: 2, amount: 700 },
        { invoiceId: 3, amount: 500 },
      ])
    ).toBe('exceeds_payment');
  });

  it('compares a foreign-currency payment by its TRY amount', () => {
    expect(
      check(5, [
        { invoiceId: 2, amount: 700 },
        { invoiceId: 3, amount: 500 },
      ])
    ).toBeNull();
  });

  it('rejects more than an invoice has open', () => {
    expect(check(1, [{ invoiceId: 2, amount: 800 }])).toBe('exceeds_invoice');
  });

  it('counts what other payments already matched to the invoice', () => {
    db.paymentAllocations.setForPayment(6, [{ invoiceId: 3, amount: 500 }]);
    expect(check(1, [{ invoiceId: 3, amount: 100 }])).toBe('exceeds_invoice');
  });

  it("does not count the payment's own current allocations (they are replaced)", () => {
    db.paymentAllocations.setForPayment(1, [{ invoiceId: 2, amount: 700 }]);
    expect(check(1, [{ invoiceId: 2, amount: 700 }])).toBeNull();
  });

  it('rejects matching a collection to a purchase invoice', () => {
    expect(check(1, [{ invoiceId: 4, amount: 100 }])).toBe('type_mismatch');
  });

  it('rejects the same invoice twice and unknown transactions', () => {
    expect(
      check(1, [
        { invoiceId: 2, amount: 100 },
        { invoiceId: 2, amount: 100 },
      ])
    ).toBe('duplicate');
    expect(check(1, [{ invoiceId: 999, amount: 100 }])).toBe('not_found');
    expect(check(999, [{ invoiceId: 2, amount: 100 }])).toBe('not_found');
  });

  it('rejects allocations for something that is not a payment', () => {
    expect(check(2, [{ invoiceId: 3, amount: 100 }])).toBe('type_mismatch');
  });
});

describe('match candidates (editing a match)', () => {
  it('lists an invoice this payment fully covers, so the match can be removed or moved', () => {
    db.paymentAllocations.setForPayment(1, [{ invoiceId: 2, amount: 700 }]);
    const candidates = db.paymentAllocations.getInvoiceCandidates(
      'payment_in',
      { companyId: 1, projectId: null },
      1
    );
    const invoice = candidates.find((c) => c.id === 2);
    expect(invoice).toMatchObject({ remaining: 700, allocated_here: 700 });
    const forOther = db.paymentAllocations.getInvoiceCandidates(
      'payment_in',
      { companyId: 1, projectId: null },
      6
    );
    expect(forOther.some((c) => c.id === 2)).toBe(false);
  });

  it('only offers invoices of the same counterparty', () => {
    db.rawDb.run(
      "INSERT INTO companies (id, code, type, account_type, name) VALUES (2, 'C2', 'company', 'customer', 'D')"
    );
    db.rawDb.run(
      `INSERT INTO transactions (id, scope, company_id, type, date, description, amount, amount_try)
       VALUES (20, 'cari', 2, 'invoice_out', '2026-11-01', 'other company', 900, 900)`
    );
    const ids = db.paymentAllocations
      .getInvoiceCandidates('payment_in', { companyId: 1, projectId: null }, 1)
      .map((c) => c.id);
    expect(ids).toEqual([2, 3]);
    expect(check(1, [{ invoiceId: 20, amount: 100 }])).toBe('counterparty_mismatch');
  });

  it('matches records without a company only within their project', () => {
    db.rawDb.run(
      "INSERT INTO projects (id, code, name, ownership_type, status) VALUES (7, 'P7', 'P', 'own', 'active')"
    );
    db.rawDb.run(
      "INSERT INTO projects (id, code, name, ownership_type, status) VALUES (8, 'P8', 'Q', 'own', 'active')"
    );
    db.rawDb.run(
      `INSERT INTO transactions (id, scope, project_id, type, date, description, amount, amount_try) VALUES
       (30, 'project', 7, 'invoice_in', '2026-11-01', 'p7 invoice', 400, 400),
       (31, 'project', 8, 'invoice_in', '2026-11-01', 'p8 invoice', 400, 400),
       (32, 'project', 7, 'payment_out', '2026-11-02', 'p7 payment', 400, 400)`
    );
    const ids = db.paymentAllocations
      .getInvoiceCandidates('payment_out', { companyId: null, projectId: 7 }, 32)
      .map((c) => c.id);
    expect(ids).toEqual([30]);
    expect(check(32, [{ invoiceId: 31, amount: 400 }])).toBe('counterparty_mismatch');
  });

  it('lists payments for an invoice with what each has left', () => {
    db.paymentAllocations.setForPayment(6, [{ invoiceId: 3, amount: 200 }]);
    const forInvoice2 = db.paymentAllocations.getPaymentCandidates(
      'invoice_out',
      { companyId: 1, projectId: null },
      2
    );
    expect(forInvoice2.map((c) => [c.id, c.remaining, c.allocated_here])).toEqual([
      [1, 1000, 0],
      [5, 3000, 0],
      [6, 300, 0],
    ]);
  });

  it("checks an invoice's matches against the invoice and each payment", () => {
    const checkInvoice = (allocations: { paymentId: number; amount: number }[]) =>
      db.paymentAllocations.findInvoiceAllocationProblem(2, allocations);
    expect(
      checkInvoice([
        { paymentId: 1, amount: 400 },
        { paymentId: 6, amount: 300 },
      ])
    ).toBeNull();
    expect(checkInvoice([{ paymentId: 1, amount: 800 }])).toBe('exceeds_invoice');
    db.paymentAllocations.setForPayment(6, [{ invoiceId: 3, amount: 400 }]);
    expect(checkInvoice([{ paymentId: 6, amount: 200 }])).toBe('exceeds_payment');
    expect(checkInvoice([{ paymentId: 2, amount: 100 }])).toBe('type_mismatch');
  });

  it("replaces an invoice's matches and keeps other invoices' matches", () => {
    db.paymentAllocations.setForPayment(1, [
      { invoiceId: 2, amount: 300 },
      { invoiceId: 3, amount: 200 },
    ]);
    db.paymentAllocations.setForInvoice(2, [{ paymentId: 6, amount: 500 }]);
    expect(db.paymentAllocations.getForInvoice(2).map((a) => [a.payment_id, a.amount])).toEqual([
      [6, 500],
    ]);
    expect(db.paymentAllocations.getForPayment(1).map((a) => [a.invoice_id, a.amount])).toEqual([
      [3, 200],
    ]);
  });
});
