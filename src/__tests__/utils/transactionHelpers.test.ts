import { describe, it, expect } from 'vitest';
import {
  isIncomeType,
  isExpenseType,
  isPositiveTransaction,
  getTransactionColor,
  getTransactionTextColor,
  getTransactionBadgeVariant,
  getPrintTransactionTextColor,
  getSimpleTransactionTextColor,
  getSimpleTransactionBadgeVariant,
} from '../../utils/transactionHelpers';
import type { TransactionType } from '../../types';

describe('transactionHelpers', () => {
  describe('isIncomeType', () => {
    it('should return true for invoice_out', () => {
      expect(isIncomeType('invoice_out')).toBe(true);
    });

    it('should return false for other types', () => {
      expect(isIncomeType('invoice_in')).toBe(false);
      expect(isIncomeType('payment_in')).toBe(false);
      expect(isIncomeType('payment_out')).toBe(false);
    });
  });

  describe('isExpenseType', () => {
    it('should return true for invoice_in', () => {
      expect(isExpenseType('invoice_in')).toBe(true);
    });

    it('should return false for other types', () => {
      expect(isExpenseType('invoice_out')).toBe(false);
      expect(isExpenseType('payment_in')).toBe(false);
      expect(isExpenseType('payment_out')).toBe(false);
    });
  });

  describe('isPositiveTransaction', () => {
    it('should return true for invoice_out and payment_in', () => {
      expect(isPositiveTransaction('invoice_out')).toBe(true);
      expect(isPositiveTransaction('payment_in')).toBe(true);
    });

    it('should return false for invoice_in and payment_out', () => {
      expect(isPositiveTransaction('invoice_in')).toBe(false);
      expect(isPositiveTransaction('payment_out')).toBe(false);
    });
  });

  describe('getTransactionColor', () => {
    it('should return correct bg colors for each type', () => {
      expect(getTransactionColor('invoice_out')).toBe('bg-green-500');
      expect(getTransactionColor('payment_in')).toBe('bg-blue-500');
      expect(getTransactionColor('invoice_in')).toBe('bg-red-500');
      expect(getTransactionColor('payment_out')).toBe('bg-orange-500');
    });

    it('should return gray for unknown type', () => {
      expect(getTransactionColor('unknown' as TransactionType)).toBe('bg-gray-500');
    });
  });

  describe('getTransactionTextColor', () => {
    it('should return correct text colors for each type', () => {
      expect(getTransactionTextColor('invoice_out')).toBe('text-green-600');
      expect(getTransactionTextColor('payment_in')).toBe('text-blue-600');
      expect(getTransactionTextColor('invoice_in')).toBe('text-red-600');
      expect(getTransactionTextColor('payment_out')).toBe('text-orange-600');
    });

    it('should return gray for unknown type', () => {
      expect(getTransactionTextColor('unknown' as TransactionType)).toBe('text-gray-600');
    });
  });

  describe('getTransactionBadgeVariant', () => {
    it('should return correct badge variants', () => {
      expect(getTransactionBadgeVariant('invoice_out')).toBe('success');
      expect(getTransactionBadgeVariant('payment_in')).toBe('info');
      expect(getTransactionBadgeVariant('invoice_in')).toBe('danger');
      expect(getTransactionBadgeVariant('payment_out')).toBe('warning');
    });
  });

  describe('getPrintTransactionTextColor', () => {
    it('should return 700 shade colors for print', () => {
      expect(getPrintTransactionTextColor('invoice_out')).toBe('text-green-700');
      expect(getPrintTransactionTextColor('payment_in')).toBe('text-blue-700');
      expect(getPrintTransactionTextColor('invoice_in')).toBe('text-red-700');
      expect(getPrintTransactionTextColor('payment_out')).toBe('text-orange-700');
    });
  });

  describe('getSimpleTransactionTextColor', () => {
    it('should return green for income types', () => {
      expect(getSimpleTransactionTextColor('invoice_out')).toBe('text-green-600');
      expect(getSimpleTransactionTextColor('payment_in')).toBe('text-green-600');
    });

    it('should return red for expense types', () => {
      expect(getSimpleTransactionTextColor('invoice_in')).toBe('text-red-600');
      expect(getSimpleTransactionTextColor('payment_out')).toBe('text-red-600');
    });
  });

  describe('getSimpleTransactionBadgeVariant', () => {
    it('should return success for income types', () => {
      expect(getSimpleTransactionBadgeVariant('invoice_out')).toBe('success');
      expect(getSimpleTransactionBadgeVariant('payment_in')).toBe('success');
    });

    it('should return danger for expense types', () => {
      expect(getSimpleTransactionBadgeVariant('invoice_in')).toBe('danger');
      expect(getSimpleTransactionBadgeVariant('payment_out')).toBe('danger');
    });
  });
});
