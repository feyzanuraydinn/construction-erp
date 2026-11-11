import { describe, it, expect } from 'vitest';
import { formatCompactCurrency, formatNumber, formatDate, formatDateForInput, parseAppDate, toLocalDateString, foldForSearch } from '../../utils/formatters';

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

    it('keeps a stored calendar date unchanged', () => {
      expect(formatDateForInput('2026-03-05')).toBe('2026-03-05');
    });

    it('uses the local date, not the UTC date, for "now" just after midnight', () => {
      const justAfterMidnight = new Date(2026, 10, 11, 0, 30);
      expect(formatDateForInput(justAfterMidnight.toISOString())).toBe('2026-11-11');
    });
  });

  describe('compact rollover', () => {
    it('moves to the next unit instead of showing 1000 of the smaller one', () => {
      expect(formatCompactCurrency(999_999)).toBe('1.0M ₺');
      expect(formatCompactCurrency(999_960_000, true)).toBe('1.0B');
      expect(formatCompactCurrency(-999_999, true)).toBe('-1.0M');
      expect(formatCompactCurrency(999.6, true)).toBe('1K');
      expect(formatCompactCurrency(999_400)).toBe('999K ₺');
    });
  });

  describe('foldForSearch', () => {
    it('matches Turkish capitals and English text alike', () => {
      expect(foldForSearch('İNŞAAT A.Ş.').includes(foldForSearch('inşaat'))).toBe(true);
      expect(foldForSearch('IŞIK YAPI').includes(foldForSearch('ışık'))).toBe(true);
      expect(foldForSearch('INVOICE').includes(foldForSearch('invoice'))).toBe(true);
    });
  });

  describe('date parsing', () => {
    it('shows a stored calendar date as that day in any time zone', () => {
      const result = formatDate('2026-03-05');
      expect(result).toMatch(/05/);
      expect(result).toMatch(/03/);
    });

    it('reads SQLite timestamps (UTC, no zone) as UTC', () => {
      const sqlite = formatDate('2026-11-10 22:30:00');
      const sameInstant = formatDate(new Date(Date.UTC(2026, 10, 10, 22, 30)).toISOString());
      expect(sqlite).toBe(sameInstant);
      expect(parseAppDate('2026-11-10 22:30:00').getTime()).toBe(Date.UTC(2026, 10, 10, 22, 30));
    });

    it('does not crash on an invalid date', () => {
      expect(() => formatDate('2024-13-45')).not.toThrow();
      expect(formatDate('2024-13-45')).toBe('2024-13-45');
    });

    it('does not roll an impossible day over into the next month', () => {
      expect(formatDate('2024-02-30')).toBe('2024-02-30');
      expect(Number.isNaN(parseAppDate('2024-02-30').getTime())).toBe(true);
      expect(formatDate('2024-02-29')).toMatch(/29/);
    });

    it('formats local calendar dates', () => {
      expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    });
  });
});
