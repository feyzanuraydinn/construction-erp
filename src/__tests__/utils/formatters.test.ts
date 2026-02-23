import { describe, it, expect } from 'vitest';
import { formatCompactCurrency, formatNumber, formatDate, formatDateForInput } from '../../utils/formatters';

describe('formatters', () => {
  describe('formatCompactCurrency', () => {
    it('should return "-" for null/undefined', () => {
      expect(formatCompactCurrency(null)).toBe('-');
      expect(formatCompactCurrency(undefined)).toBe('-');
    });

    it('should format billions with B suffix', () => {
      expect(formatCompactCurrency(1500000000)).toBe('1.5B ₺');
      expect(formatCompactCurrency(2000000000, true)).toBe('2.0B');
    });

    it('should format millions with M suffix', () => {
      expect(formatCompactCurrency(1500000)).toBe('1.5M ₺');
      expect(formatCompactCurrency(5200000, true)).toBe('5.2M');
    });

    it('should format thousands with K suffix', () => {
      expect(formatCompactCurrency(50000)).toBe('50K ₺');
      expect(formatCompactCurrency(1500, true)).toBe('2K');
    });

    it('should handle negative amounts', () => {
      expect(formatCompactCurrency(-5000000)).toBe('-5.0M ₺');
      expect(formatCompactCurrency(-50000, true)).toBe('-50K');
    });

    it('should format small amounts without suffix', () => {
      const result = formatCompactCurrency(500, true);
      expect(result).toBe('500');
    });
  });

  describe('formatNumber', () => {
    it('should return "-" for null/undefined', () => {
      expect(formatNumber(null)).toBe('-');
      expect(formatNumber(undefined)).toBe('-');
    });

    it('should format numbers with specified decimals', () => {
      expect(formatNumber(1234, 0)).toMatch(/1[.,]?234/);
      expect(formatNumber(1234.5678, 2)).toMatch(/1[.,]?234[.,]57/);
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatDate', () => {
    it('should return "-" for null/undefined/empty', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('')).toBe('-');
    });

    it('should format a valid date string', () => {
      const result = formatDate('2025-01-15');
      // Should contain day, month, year in some format
      expect(result).toMatch(/15/);
      expect(result).toMatch(/01/);
      expect(result).toMatch(/2025/);
    });
  });

  describe('formatDateForInput', () => {
    it('should return empty string for null/undefined/empty', () => {
      expect(formatDateForInput(null)).toBe('');
      expect(formatDateForInput(undefined)).toBe('');
      expect(formatDateForInput('')).toBe('');
    });

    it('should return YYYY-MM-DD format', () => {
      const result = formatDateForInput('2025-06-15T10:30:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
