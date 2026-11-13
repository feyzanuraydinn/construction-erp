import { describe, it, expect } from 'vitest';
import {
  isValidCalendarDate,
  isValidTcNumber,
  isValidIban,
  companySchema,
  projectSchema,
  transactionSchema,
  stockMovementSchema,
  validateInput,
} from '../../utils/schemas';
import { normalizePhoneInput, removeLastPhoneDigit } from '../../utils/phone';

describe('isValidCalendarDate', () => {
  it('accepts real dates, including leap days', () => {
    expect(isValidCalendarDate('2026-11-11')).toBe(true);
    expect(isValidCalendarDate('2024-02-29')).toBe(true);
  });

  it('rejects dates that do not exist or are malformed', () => {
    expect(isValidCalendarDate('2024-13-45')).toBe(false);
    expect(isValidCalendarDate('2024-02-30')).toBe(false);
    expect(isValidCalendarDate('2023-02-29')).toBe(false);
    expect(isValidCalendarDate('2024-1-5')).toBe(false);
  });
});

describe('isValidTcNumber', () => {
  it('accepts a number with correct check digits', () => {
    expect(isValidTcNumber('10000000146')).toBe(true);
  });

  it('rejects wrong check digits, a leading zero and wrong length', () => {
    expect(isValidTcNumber('10000000147')).toBe(false);
    expect(isValidTcNumber('00000000000')).toBe(false);
    expect(isValidTcNumber('1234567890')).toBe(false);
  });
});

describe('isValidIban', () => {
  it('accepts valid IBANs with or without spaces', () => {
    expect(isValidIban('TR330006100519786457841326')).toBe(true);
    expect(isValidIban('TR33 0006 1005 1978 6457 8413 26')).toBe(true);
    expect(isValidIban('GB82WEST12345698765432')).toBe(true);
  });

  it('rejects a wrong check, a partial value and a short Turkish IBAN', () => {
    expect(isValidIban('TR340006100519786457841326')).toBe(false);
    expect(isValidIban('TR12 34')).toBe(false);
    expect(isValidIban('TR3300061005197864578413')).toBe(false);
  });
});

describe('schemas', () => {
  const company = { type: 'company', account_type: 'customer', name: 'Acme' };

  it('treats an empty IBAN or the bare "TR" prefix as no IBAN, but rejects a partial one', () => {
    expect(validateInput(companySchema, { ...company, iban: '' }).success).toBe(true);
    expect(validateInput(companySchema, { ...company, iban: 'TR' }).success).toBe(true);
    expect(validateInput(companySchema, { ...company, iban: 'TR12 34' }).success).toBe(false);
    expect(
      validateInput(companySchema, { ...company, iban: 'TR33 0006 1005 1978 6457 8413 26' }).success
    ).toBe(true);
  });

  it('rejects a TC number with wrong check digits', () => {
    expect(
      validateInput(companySchema, { ...company, type: 'person', tc_number: '12345678901' }).success
    ).toBe(false);
    expect(
      validateInput(companySchema, { ...company, type: 'person', tc_number: '10000000146' }).success
    ).toBe(true);
  });

  const project = { code: 'P1', name: 'P', ownership_type: 'own' };

  it('rejects a project that ends before it starts', () => {
    expect(
      validateInput(projectSchema, {
        ...project,
        planned_start: '2026-05-01',
        planned_end: '2026-04-01',
      }).success
    ).toBe(false);
    expect(
      validateInput(projectSchema, {
        ...project,
        actual_start: '2026-05-01',
        actual_end: '2026-04-30',
      }).success
    ).toBe(false);
    expect(
      validateInput(projectSchema, {
        ...project,
        planned_start: '2026-05-01',
        planned_end: '2026-05-01',
      }).success
    ).toBe(true);
  });

  it('rejects negative budgets, areas and unit prices', () => {
    expect(validateInput(projectSchema, { ...project, estimated_budget: -1 }).success).toBe(false);
    expect(validateInput(projectSchema, { ...project, total_area: '-5' }).success).toBe(false);
    expect(
      validateInput(stockMovementSchema, {
        material_id: 1,
        movement_type: 'in',
        quantity: 1,
        unit_price: -3,
        date: '2026-01-01',
      }).success
    ).toBe(false);
  });

  it('rejects a transaction dated on a day that does not exist', () => {
    const tx = { scope: 'cari', type: 'invoice_out', description: 'x', amount: 1, currency: 'TRY' };
    expect(validateInput(transactionSchema, { ...tx, date: '2024-02-30' }).success).toBe(false);
    expect(validateInput(transactionSchema, { ...tx, date: '2024-02-29' }).success).toBe(true);
  });
});

describe('phone input', () => {
  it('accepts landlines and 0850 numbers (it used to force 05)', () => {
    expect(normalizePhoneInput('02125551234')).toBe('0(212) 555 12 34');
    expect(normalizePhoneInput('08502223344')).toBe('0(850) 222 33 44');
  });

  it('adds the leading 0 to a national number and formats mobiles', () => {
    expect(normalizePhoneInput('5321234567')).toBe('0(532) 123 45 67');
  });

  it('keeps international numbers', () => {
    expect(normalizePhoneInput('+49 30 1234567')).toBe('+49301234567');
  });

  it('removes the last digit, skipping formatting', () => {
    expect(removeLastPhoneDigit('0(212) 555 12 34')).toBe('0(212) 555 12 3');
    expect(removeLastPhoneDigit('+4')).toBe('');
    expect(removeLastPhoneDigit('0')).toBe('');
  });
});
