import { describe, it, expect } from 'vitest';
import {
  companySchema,
  projectSchema,
  transactionSchema,
  materialSchema,
  categorySchema,
  validateInput,
  validateId,
} from '../utils/schemas';

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

      const result = validateInput(companySchema, validCompany);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Şirketi');
    });

    it('should reject an empty name', () => {
      const invalidCompany = {
        type: 'company',
        account_type: 'customer',
        name: '',
      };

      const result = validateInput(companySchema, invalidCompany);
      expect(result.success).toBe(false);
      expect(result.error).toContain('İsim zorunludur');
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
        tc_number: '123', // Too short
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
        planned_start: '15-01-2024', // Invalid format
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
      const base = { scope: 'project', type: 'invoice_in', date: '2024-01-15', description: 'USD', amount: 100, currency: 'USD' };

      expect(validateInput(transactionSchema, base).success).toBe(false);
      expect(validateInput(transactionSchema, { ...base, exchange_rate: 0 }).success).toBe(false);
      expect(validateInput(transactionSchema, { ...base, exchange_rate: -2 }).success).toBe(false);

      const ok = validateInput(transactionSchema, { ...base, exchange_rate: '34.25' });
      expect(ok.success).toBe(true);
      expect(ok.data?.exchange_rate).toBe(34.25);
    });

    it('should not invent a rate of 1 when none is given', () => {
      const result = validateInput(transactionSchema, {
        scope: 'cari', type: 'invoice_out', date: '2024-01-15', description: 'TL', amount: 100, currency: 'TRY',
      });
      expect(result.success).toBe(true);
      expect(result.data?.exchange_rate).toBeNull();
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

      const result = validateInput(transactionSchema, invalidTransaction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('sıfırdan büyük');
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
        color: 'red', // Should be hex format
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
  });
});
