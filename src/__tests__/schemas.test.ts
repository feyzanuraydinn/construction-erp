import { describe, it, expect } from 'vitest';
import {
  companySchema,
  projectSchema,
  transactionSchema,
  materialSchema,
  categorySchema,
  validateInput,
  validateId,
  parseInput,
  parseId,
  exportRequestSchema,
  conflictChoiceSchema,
  driveDownloadSchema,
} from '../utils/schemas';
import { i18n, languageSchema } from '../i18n';

describe('Zod Validation Schemas', () => {
  describe('Company Schema', () => {
    it('should validate a valid company', () => {
      const validCompany = {
        type: 'company',
        account_type: 'customer',
        name: 'Test Şirketi',
        phone: '0532 123 4567',
        email: 'test@example.com',
      };

      expect(parseInput(companySchema, validCompany).name).toBe('Test Şirketi');
    });

    it('should reject an empty name', () => {
      const invalidCompany = {
        type: 'company',
        account_type: 'customer',
        name: '',
      };

      expect(validateInput(companySchema, invalidCompany).success).toBe(false);
      expect(() => parseInput(companySchema, invalidCompany)).toThrow('İsim zorunludur');
    });

    it('should reject invalid type', () => {
      const invalidCompany = {
        type: 'invalid',
        account_type: 'customer',
        name: 'Test',
      };

      const result = validateInput(companySchema, invalidCompany);
      expect(result.success).toBe(false);
    });

    it('should reject invalid account_type', () => {
      const invalidCompany = {
        type: 'company',
        account_type: 'invalid',
        name: 'Test',
      };

      const result = validateInput(companySchema, invalidCompany);
      expect(result.success).toBe(false);
    });

    it('should validate TC number format', () => {
      const validCompany = {
        type: 'person',
        account_type: 'customer',
        name: 'Test',
        tc_number: '10000000146',
      };

      const result = validateInput(companySchema, validCompany);
      expect(result.success).toBe(true);
    });

    it('should reject invalid TC number', () => {
      const invalidCompany = {
        type: 'person',
        account_type: 'customer',
        name: 'Test',
        tc_number: '123',
      };

      const result = validateInput(companySchema, invalidCompany);
      expect(result.success).toBe(false);
    });
  });

  describe('Project Schema', () => {
    it('should validate a valid project', () => {
      const validProject = {
        code: 'PRJ-001',
        name: 'Test Projesi',
        ownership_type: 'own',
        status: 'active',
      };

      const result = validateInput(projectSchema, validProject);
      expect(result.success).toBe(true);
    });

    it('should reject missing code', () => {
      const invalidProject = {
        name: 'Test Projesi',
        ownership_type: 'own',
      };

      const result = validateInput(projectSchema, invalidProject);
      expect(result.success).toBe(false);
    });

    it('should validate date format', () => {
      const validProject = {
        code: 'PRJ-001',
        name: 'Test',
        ownership_type: 'own',
        planned_start: '2024-01-15',
        planned_end: '2024-12-31',
      };

      const result = validateInput(projectSchema, validProject);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidProject = {
        code: 'PRJ-001',
        name: 'Test',
        ownership_type: 'own',
        planned_start: '15-01-2024',
      };

      const result = validateInput(projectSchema, invalidProject);
      expect(result.success).toBe(false);
    });
  });

  describe('Transaction Schema', () => {
    it('should validate a valid transaction', () => {
      const validTransaction = {
        scope: 'cari',
        type: 'invoice_out',
        date: '2024-01-15',
        description: 'Test işlem',
        amount: 1000,
        currency: 'TRY',
        exchange_rate: 1,
      };

      const result = validateInput(transactionSchema, validTransaction);
      expect(result.success).toBe(true);
    });

    it('should require an exchange rate for foreign currencies', () => {
      const base = {
        scope: 'project',
        type: 'invoice_in',
        date: '2024-01-15',
        description: 'USD',
        amount: 100,
        currency: 'USD',
      };

      expect(validateInput(transactionSchema, base).success).toBe(false);
      expect(validateInput(transactionSchema, { ...base, exchange_rate: 0 }).success).toBe(false);
      expect(validateInput(transactionSchema, { ...base, exchange_rate: -2 }).success).toBe(false);

      expect(parseInput(transactionSchema, { ...base, exchange_rate: '34.25' }).exchange_rate).toBe(
        34.25
      );
    });

    it('should not invent a rate of 1 when none is given', () => {
      const result = parseInput(transactionSchema, {
        scope: 'cari',
        type: 'invoice_out',
        date: '2024-01-15',
        description: 'TL',
        amount: 100,
        currency: 'TRY',
      });
      expect(result.exchange_rate).toBeNull();
    });

    it('should reject zero amount', () => {
      const invalidTransaction = {
        scope: 'cari',
        type: 'invoice_out',
        date: '2024-01-15',
        description: 'Test',
        amount: 0,
        currency: 'TRY',
      };

      expect(validateInput(transactionSchema, invalidTransaction).success).toBe(false);
      expect(() => parseInput(transactionSchema, invalidTransaction)).toThrow('sıfırdan büyük');
    });

    it('should reject negative amount', () => {
      const invalidTransaction = {
        scope: 'cari',
        type: 'invoice_out',
        date: '2024-01-15',
        description: 'Test',
        amount: -100,
        currency: 'TRY',
      };

      const result = validateInput(transactionSchema, invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should validate all transaction types', () => {
      const types = ['invoice_out', 'payment_in', 'invoice_in', 'payment_out'];

      for (const type of types) {
        const transaction = {
          scope: 'cari',
          type,
          date: '2024-01-15',
          description: 'Test',
          amount: 100,
          currency: 'TRY',
        };
        const result = validateInput(transactionSchema, transaction);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Material Schema', () => {
    it('should validate a valid material', () => {
      const validMaterial = {
        code: 'MAT-001',
        name: 'Test Malzeme',
        unit: 'adet',
        min_stock: 10,
        current_stock: 50,
      };

      const result = validateInput(materialSchema, validMaterial);
      expect(result.success).toBe(true);
    });

    it('should reject missing unit', () => {
      const invalidMaterial = {
        code: 'MAT-001',
        name: 'Test',
        min_stock: 10,
      };

      const result = validateInput(materialSchema, invalidMaterial);
      expect(result.success).toBe(false);
    });
  });

  describe('Category Schema', () => {
    it('should validate a valid category', () => {
      const validCategory = {
        name: 'Test Kategori',
        type: 'invoice_out',
        color: '#6366f1',
      };

      const result = validateInput(categorySchema, validCategory);
      expect(result.success).toBe(true);
    });

    it('should reject invalid color format', () => {
      const invalidCategory = {
        name: 'Test',
        type: 'invoice_out',
        color: 'red',
      };

      const result = validateInput(categorySchema, invalidCategory);
      expect(result.success).toBe(false);
    });
  });

  describe('ID Validation', () => {
    it('should validate positive integers', () => {
      expect(validateId(1).success).toBe(true);
      expect(validateId(100).success).toBe(true);
      expect(validateId(999999).success).toBe(true);
    });

    it('should reject zero', () => {
      expect(validateId(0).success).toBe(false);
    });

    it('should reject negative numbers', () => {
      expect(validateId(-1).success).toBe(false);
    });

    it('should reject non-integers', () => {
      expect(validateId(1.5).success).toBe(false);
    });

    it('should reject non-numbers', () => {
      expect(validateId('1').success).toBe(false);
      expect(validateId(null).success).toBe(false);
      expect(validateId(undefined).success).toBe(false);
    });

    it('returns the id or throws the validation message', () => {
      expect(parseId(7)).toBe(7);
      expect(() => parseId(0)).toThrow();
      expect(() => parseId('7')).toThrow();
    });
  });

  describe('Language schema', () => {
    it('accepts only the languages the app ships', () => {
      expect(languageSchema.safeParse('tr').success).toBe(true);
      expect(languageSchema.safeParse('en').success).toBe(true);
      expect(languageSchema.safeParse('__proto__').success).toBe(false);
      expect(languageSchema.safeParse(1).success).toBe(false);
    });
  });

  describe('Export request schema', () => {
    const valid = {
      records: [{ Tarih: '01.02.2026', Tutar: '1.250,00', Adet: 3, Onay: true, Not: null }],
      filename: 'islemler_2026-02-01',
      metadata: { summaryStartIndex: 1, amountColumnLabel: 'Tutar', redSummaryLabels: ['Borç'] },
    };

    it('accepts the rows the export screens send', () => {
      expect(validateInput(exportRequestSchema, valid).success).toBe(true);
      expect(validateInput(exportRequestSchema, { filename: 'cariler', records: [] }).success).toBe(
        true
      );
    });

    it('rejects malformed requests', () => {
      expect(validateInput(exportRequestSchema, null).success).toBe(false);
      expect(validateInput(exportRequestSchema, { ...valid, records: 'rows' }).success).toBe(false);
      expect(
        validateInput(exportRequestSchema, { ...valid, records: [{ Tutar: { nested: 1 } }] })
          .success
      ).toBe(false);
      expect(validateInput(exportRequestSchema, { ...valid, filename: '' }).success).toBe(false);
      expect(
        validateInput(exportRequestSchema, { ...valid, filename: 'x'.repeat(1001) }).success
      ).toBe(false);
      expect(
        validateInput(exportRequestSchema, { ...valid, filename: 'Uzun Adlı Şirket '.repeat(20) })
          .success
      ).toBe(true);
      expect(
        validateInput(exportRequestSchema, { ...valid, metadata: { summaryStartIndex: -1 } })
          .success
      ).toBe(false);
    });
  });
});

describe('IPC argument schemas', () => {
  it('explains a bad conflict choice and a bad Drive download in the user language', () => {
    expect(() => parseInput(conflictChoiceSchema, 'merge')).toThrow(
      i18n.t('main.sync.invalidChoice')
    );
    expect(() => parseInput(driveDownloadSchema, { fileId: '', fileName: 'a.db' })).toThrow(
      i18n.t('main.gdrive.invalidFileId')
    );
    expect(() => parseInput(driveDownloadSchema, { fileId: 'x', fileName: 42 })).toThrow(
      i18n.t('main.gdrive.invalidFileName')
    );
    expect(parseInput(driveDownloadSchema, { fileId: 'x', fileName: 'a.db' })).toEqual({
      fileId: 'x',
      fileName: 'a.db',
    });
  });

  it('never shows field names or English default texts', () => {
    const result = validateInput(transactionSchema, { scope: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toMatch(/scope|Invalid|expected/);
    }
  });
});
