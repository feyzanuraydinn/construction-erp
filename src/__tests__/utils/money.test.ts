import { describe, it, expect } from 'vitest';
import { MONEY_TOLERANCE, roundMoney, amountInTry, distributeGreedy } from '../../utils/money';
import { isPaymentType } from '../../utils/transactionKinds';
import { tryAmountSql, sumOfTypeSql, netBalanceSql } from '../../database/sqlFragments';
import { balanceEffect, netBalanceOf } from '../../utils/financials';

describe('money helpers', () => {
  it('rounds to kuruş', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(103500.004)).toBe(103500);
    expect(MONEY_TOLERANCE).toBe(0.005);
  });

  it('uses the TRY amount when there is one and falls back to the amount', () => {
    expect(amountInTry({ amount: 3000, amount_try: 103500 })).toBe(103500);
    expect(amountInTry({ amount: 2500, amount_try: null })).toBe(2500);
    expect(amountInTry({})).toBe(0);
  });
});

describe('transaction kinds', () => {
  it('knows payments from invoices', () => {
    expect(isPaymentType('payment_in')).toBe(true);
    expect(isPaymentType('payment_out')).toBe(true);
    expect(isPaymentType('invoice_in')).toBe(false);
    expect(isPaymentType('invoice_out')).toBe(false);
  });
});

describe('balance effect', () => {
  it('adds what is owed to us and subtracts what we owe', () => {
    expect(balanceEffect({ type: 'invoice_out', amount: 100 })).toBe(100);
    expect(balanceEffect({ type: 'payment_out', amount: 60 })).toBe(60);
    expect(balanceEffect({ type: 'invoice_in', amount: 40 })).toBe(-40);
    expect(balanceEffect({ type: 'payment_in', amount: 30, amount_try: 35 })).toBe(-35);
  });

  it('nets a list of records', () => {
    expect(
      netBalanceOf([
        { type: 'invoice_in', amount: 198500 },
        { type: 'payment_out', amount: 208500 },
      ])
    ).toBe(10000);
  });
});

describe('SQL fragments', () => {
  it('builds the TRY amount with or without a table alias', () => {
    expect(tryAmountSql()).toBe('COALESCE(NULLIF(amount_try, 0), amount)');
    expect(tryAmountSql('t')).toBe('COALESCE(NULLIF(t.amount_try, 0), t.amount)');
  });

  it('sums one transaction type in TRY', () => {
    expect(sumOfTypeSql('invoice_out', 't')).toBe(
      `COALESCE(SUM(CASE WHEN t.type = 'invoice_out' THEN ${tryAmountSql('t')} ELSE 0 END), 0)`
    );
  });

  it('uses the same sign rule for the net balance as the app does', () => {
    const sql = netBalanceSql('t');
    expect(sql).toContain(`t.type IN ('invoice_out', 'payment_out') THEN ${tryAmountSql('t')}`);
    expect(sql).toContain(`t.type IN ('invoice_in', 'payment_in') THEN -${tryAmountSql('t')}`);
  });
});

describe('distributeGreedy', () => {
  it('fills slots in order until the amount runs out', () => {
    expect(
      distributeGreedy(150, [
        { id: 1, free: 100 },
        { id: 2, free: 100 },
        { id: 3, free: 100 },
      ])
    ).toEqual([
      { id: 1, amount: 100 },
      { id: 2, amount: 50 },
    ]);
  });

  it('skips full slots and ignores sub-cent leftovers', () => {
    expect(
      distributeGreedy(10, [
        { id: 1, free: 0.004 },
        { id: 2, free: -5 },
        { id: 3, free: 12.345 },
      ])
    ).toEqual([{ id: 3, amount: 10 }]);
    expect(distributeGreedy(0.004, [{ id: 1, free: 100 }])).toEqual([]);
  });

  it('rounds every share to kuruş', () => {
    expect(
      distributeGreedy(10.005, [
        { id: 1, free: 3.333 },
        { id: 2, free: 100 },
      ])
    ).toEqual([
      { id: 1, amount: 3.33 },
      { id: 2, amount: 6.68 },
    ]);
  });
});
