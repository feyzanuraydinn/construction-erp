import { describe, it, expect } from 'vitest';
import {
  calculateProjectFinancials,
  calculateCompanyFinancials,
  calculateTransactionTotals,
  calculateDashboardFinancials,
} from '../../utils/financials';
import type { TransactionWithDetails } from '../../types';

// Minimal transaction factory — includes all required Transaction fields
function makeTx(overrides: Partial<TransactionWithDetails> = {}): TransactionWithDetails {
  return {
    id: 1,
    scope: 'company',
    type: 'invoice_out',
    amount: 1000,
    amount_try: 1000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2025-01-01',
    description: 'test',
    company_id: null,
    project_id: null,
    category_id: null,
    document_no: null,
    linked_invoice_id: null,
    notes: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  };
}

describe('financials', () => {
  describe('calculateTransactionTotals', () => {
    it('should return zeros for empty array', () => {
      const result = calculateTransactionTotals([]);
      expect(result.totalInvoiceOut).toBe(0);
      expect(result.totalPaymentIn).toBe(0);
      expect(result.totalInvoiceIn).toBe(0);
      expect(result.totalPaymentOut).toBe(0);
      expect(result.netProfit).toBe(0);
      expect(result.netCashFlow).toBe(0);
    });

    it('should calculate totals correctly', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 500 }),
        makeTx({ type: 'invoice_out', amount_try: 300 }),
        makeTx({ type: 'payment_in', amount_try: 400 }),
        makeTx({ type: 'invoice_in', amount_try: 200 }),
        makeTx({ type: 'payment_out', amount_try: 100 }),
      ];

      const result = calculateTransactionTotals(transactions);
      expect(result.totalInvoiceOut).toBe(800);
      expect(result.totalPaymentIn).toBe(400);
      expect(result.totalInvoiceIn).toBe(200);
      expect(result.totalPaymentOut).toBe(100);
      expect(result.totalIncome).toBe(800); // only invoices out
      expect(result.totalExpense).toBe(200); // only invoices in
      expect(result.netProfit).toBe(600); // 800 - 200
      expect(result.netCashFlow).toBe(300); // 400 - 100
      // netBalance = receivable - payable = (800 - 400) - (200 - 100) = 400 - 100 = 300
      expect(result.netBalance).toBe(300);
    });

    it('counts only records with a company in the open balance', () => {
      const transactions = [
        makeTx({ type: 'invoice_in', amount_try: 1000, company_id: 3 }),
        makeTx({ type: 'payment_out', amount_try: 400, company_id: 3 }),
        makeTx({ type: 'invoice_out', amount_try: 250, company_id: 4 }),
        makeTx({ type: 'invoice_in', amount_try: 9000, company_id: null, scope: 'company' }),
        makeTx({ type: 'invoice_in', amount_try: 5000, company_id: null, scope: 'project' }),
      ];

      const result = calculateTransactionTotals(transactions);
      expect(result.openBalance).toBe(-350);
    });
  });

  describe('calculateProjectFinancials', () => {
    it('should return zeros for empty transactions', () => {
      const result = calculateProjectFinancials([]);
      expect(result.totalIncome).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.projectProfit).toBe(0);
    });

    it('should calculate income from invoice_out', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1000 }),
      ];

      const result = calculateProjectFinancials(transactions);
      expect(result.totalIncome).toBe(1000);
    });

    it('does not count a collection without an invoice as income: it is an advance received', () => {
      const transactions = [
        makeTx({ type: 'payment_in', amount_try: 500, company_id: 3 }),
      ];

      const result = calculateProjectFinancials(transactions);
      expect(result.totalIncome).toBe(0);
      expect(result.unmatchedPaymentIn).toBe(500);
      expect(result.advanceReceived).toBe(500);
    });

    it('does not count an unmatched payment and its invoice twice', () => {
      const transactions = [
        makeTx({ type: 'invoice_in', amount_try: 1000, company_id: 3 }),
        makeTx({ type: 'payment_out', amount_try: 1000, company_id: 3 }),
      ];

      const result = calculateProjectFinancials(transactions);
      expect(result.totalExpense).toBe(1000);
      expect(result.projectDebt).toBe(0);
      expect(result.advanceGiven).toBe(0);
    });

    it("keeps one supplier's advance from hiding the debt to another", () => {
      const transactions = [
        makeTx({ type: 'invoice_in', amount_try: 1000, company_id: 3 }),
        makeTx({ type: 'payment_out', amount_try: 400, company_id: 4 }),
      ];

      const result = calculateProjectFinancials(transactions);
      expect(result.projectDebt).toBe(1000);
      expect(result.advanceGiven).toBe(400);
    });

    it('does not count costs entered without a company as debt', () => {
      const transactions = [makeTx({ type: 'invoice_in', amount_try: 5000, company_id: null })];

      const result = calculateProjectFinancials(transactions);
      expect(result.totalExpense).toBe(5000);
      expect(result.projectDebt).toBe(0);
    });

    it('uses what matched payments cover of each invoice', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1000, company_id: 3, settled_amount: 600 }),
        makeTx({ type: 'payment_in', amount_try: 600, company_id: 3, allocated_amount: 600 }),
      ];

      const result = calculateProjectFinancials(transactions);
      expect(result.clientReceivable).toBe(400);
      expect(result.unmatchedPaymentIn).toBe(0);
    });

    it('should not double-count linked payments', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1000 }),
        makeTx({ type: 'payment_in', amount_try: 800, linked_invoice_id: 1 }),
      ];

      const result = calculateProjectFinancials(transactions);
      // Invoice out = 1000, linked payment = not counted as independent
      expect(result.totalIncome).toBe(1000);
    });

    it('should calculate profit correctly', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 5000 }),
        makeTx({ type: 'invoice_in', amount_try: 3000 }),
        makeTx({ type: 'payment_in', amount_try: 500 }),
        makeTx({ type: 'payment_out', amount_try: 200 }),
      ];

      const result = calculateProjectFinancials(transactions);
      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpense).toBe(3000);
      expect(result.projectProfit).toBe(2000);
      expect(result.totalPaymentIn).toBe(500);
      expect(result.totalPaymentOut).toBe(200);
    });

    it('should handle budget usage', () => {
      const transactions = [
        makeTx({ type: 'invoice_in', amount_try: 500 }),
      ];

      const result = calculateProjectFinancials(transactions, 'own', 1000);
      // budgetUsed = totalExpense / estimatedBudget
      expect(result.budgetUsed).toBeGreaterThan(0);
    });

    it('should handle null budget', () => {
      const transactions = [
        makeTx({ type: 'invoice_in', amount_try: 500 }),
      ];

      const result = calculateProjectFinancials(transactions, 'own', null);
      expect(result.estimatedProfit).toBeNull();
    });

    it('should set ownershipType correctly', () => {
      const result = calculateProjectFinancials([], 'client');
      expect(result.ownershipType).toBe('client');
    });
  });

  describe('calculateDashboardFinancials', () => {
    it('should return zeros for empty array', () => {
      const result = calculateDashboardFinancials([]);
      expect(result.totalIncome).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.netProfit).toBe(0);
      expect(result.totalCollected).toBe(0);
      expect(result.totalPaid).toBe(0);
    });

    it('should calculate income only from invoice_out', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1000 }),
        makeTx({ type: 'payment_in', amount_try: 500 }),
      ];
      const result = calculateDashboardFinancials(transactions);
      expect(result.totalIncome).toBe(1000);
      expect(result.totalCollected).toBe(500);
    });

    it('should calculate expense only from invoice_in', () => {
      const transactions = [
        makeTx({ type: 'invoice_in', amount_try: 800 }),
        makeTx({ type: 'payment_out', amount_try: 300 }),
      ];
      const result = calculateDashboardFinancials(transactions);
      expect(result.totalExpense).toBe(800);
      expect(result.totalPaid).toBe(300);
    });

    it('should calculate net profit correctly', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 5000 }),
        makeTx({ type: 'invoice_in', amount_try: 3000 }),
      ];
      const result = calculateDashboardFinancials(transactions);
      expect(result.netProfit).toBe(2000);
    });

    it('should handle negative net profit', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1000 }),
        makeTx({ type: 'invoice_in', amount_try: 3000 }),
      ];
      const result = calculateDashboardFinancials(transactions);
      expect(result.netProfit).toBe(-2000);
    });
  });

  describe('floating-point precision', () => {
    it('should handle small fractional amounts', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 0.01 }),
        makeTx({ type: 'invoice_out', amount_try: 0.02 }),
      ];
      const result = calculateTransactionTotals(transactions);
      expect(result.totalInvoiceOut).toBeCloseTo(0.03, 10);
    });

    it('should handle large amounts with decimals', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1999.99 }),
        makeTx({ type: 'invoice_out', amount_try: 0.01 }),
      ];
      const result = calculateTransactionTotals(transactions);
      expect(result.totalInvoiceOut).toBeCloseTo(2000.0, 10);
    });

    it('should handle accumulation of many small values', () => {
      const transactions = Array.from({ length: 100 }, () =>
        makeTx({ type: 'invoice_out', amount_try: 0.1 })
      );
      const result = calculateTransactionTotals(transactions);
      expect(result.totalInvoiceOut).toBeCloseTo(10.0, 5);
    });

    it('should maintain precision for company financials', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1000.50 }),
        makeTx({ type: 'payment_in', amount_try: 999.99 }),
      ];
      const result = calculateCompanyFinancials(transactions);
      expect(result.receivable).toBeCloseTo(0.51, 5);
    });

    it('should maintain precision for project financials', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 999.99 }),
        makeTx({ type: 'invoice_in', amount_try: 499.99 }),
      ];
      const result = calculateProjectFinancials(transactions);
      expect(result.projectProfit).toBeCloseTo(500.0, 5);
    });
  });

  describe('calculateCompanyFinancials', () => {
    it('should return zeros for empty transactions', () => {
      const result = calculateCompanyFinancials([]);
      expect(result.totalInvoiceOut).toBe(0);
      expect(result.totalPaymentIn).toBe(0);
      expect(result.totalInvoiceIn).toBe(0);
      expect(result.totalPaymentOut).toBe(0);
      expect(result.receivable).toBe(0);
      expect(result.payable).toBe(0);
    });

    it('should calculate receivable correctly', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1000 }),
        makeTx({ type: 'payment_in', amount_try: 600 }),
      ];

      const result = calculateCompanyFinancials(transactions);
      expect(result.receivable).toBe(400); // 1000 - 600
    });

    it('should calculate payable correctly', () => {
      const transactions = [
        makeTx({ type: 'invoice_in', amount_try: 800 }),
        makeTx({ type: 'payment_out', amount_try: 300 }),
      ];

      const result = calculateCompanyFinancials(transactions);
      expect(result.payable).toBe(500); // 800 - 300
    });

    it('should calculate balance', () => {
      const transactions = [
        makeTx({ type: 'invoice_out', amount_try: 1000 }),
        makeTx({ type: 'payment_in', amount_try: 600 }),
        makeTx({ type: 'invoice_in', amount_try: 500 }),
        makeTx({ type: 'payment_out', amount_try: 200 }),
      ];

      const result = calculateCompanyFinancials(transactions);
      // receivable = 1000-600 = 400
      // payable = 500-200 = 300
      // balance = 400 - 300 = 100
      expect(result.balance).toBe(100);
    });
  });
});
