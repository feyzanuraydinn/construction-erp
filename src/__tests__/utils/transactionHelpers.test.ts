import { describe, it, expect } from 'vitest';
import {
  isPositiveTransaction,
  getTransactionColor,
  getTransactionTextColor,
  transactionSign,
  getPrintTransactionTextColor,
  getSimpleTransactionTextColor,
  getSimpleTransactionBadgeVariant,
} from '../../utils/transactionHelpers';
import type { TransactionType } from '../../types';

describe('transactionHelpers', () => {
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
      expect(getTransactionTextColor('invoice_out')).toBe('text-green-600 dark:text-green-400');
      expect(getTransactionTextColor('payment_in')).toBe('text-blue-600 dark:text-blue-400');
      expect(getTransactionTextColor('invoice_in')).toBe('text-red-600 dark:text-red-400');
      expect(getTransactionTextColor('payment_out')).toBe('text-orange-600 dark:text-orange-400');
    });

    it('should return gray for unknown type', () => {
      expect(getTransactionTextColor('unknown' as TransactionType)).toBe(
        'text-gray-600 dark:text-gray-400'
      );
    });
  });

  describe('transactionSign', () => {
    it('marks money coming in with + and money going out with -', () => {
      expect(transactionSign('invoice_out')).toBe('+');
      expect(transactionSign('payment_in')).toBe('+');
      expect(transactionSign('invoice_in')).toBe('-');
      expect(transactionSign('payment_out')).toBe('-');
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
      expect(getSimpleTransactionTextColor('invoice_out')).toBe(
        'text-green-600 dark:text-green-400'
      );
      expect(getSimpleTransactionTextColor('payment_in')).toBe(
        'text-green-600 dark:text-green-400'
      );
    });

    it('should return red for expense types', () => {
      expect(getSimpleTransactionTextColor('invoice_in')).toBe('text-red-600 dark:text-red-400');
      expect(getSimpleTransactionTextColor('payment_out')).toBe('text-red-600 dark:text-red-400');
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
