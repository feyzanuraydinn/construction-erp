import { describe, it, expect } from 'vitest';
import { i18n } from '../../i18n';
import {
  getTransactionColumns,
  getCompanyColumns,
  getProjectColumns,
  formatRecordsForExport,
} from '../../utils/exportUtils';

describe('getTransactionColumns', () => {
  const amountColumn = () => {
    const column = getTransactionColumns(i18n.t).find((c) => c.key === 'amount');
    if (!column?.format) throw new Error('amount column has no formatter');
    return column.format;
  };

  it('formats a USD amount in dollars, not with a ₺ sign', () => {
    const text = amountColumn()(1000, { amount: 1000, currency: 'USD' });
    expect(text).toContain('$');
    expect(text).not.toContain('₺');
  });

  it('formats TRY (or a missing currency) in lira', () => {
    expect(amountColumn()(1000, { amount: 1000, currency: 'TRY' })).toContain('₺');
    expect(amountColumn()(1000, {})).toContain('₺');
  });
});

describe('export column formatters', () => {
  const columnOf = (columns: ReturnType<typeof getCompanyColumns>, key: string) => {
    const column = columns.find((c) => c.key === key);
    if (!column?.format) throw new Error(`${key} has no formatter`);
    return column.format;
  };

  it('shows a dash for missing amounts and formats numeric text as money', () => {
    const balance = columnOf(getCompanyColumns(i18n.t), 'balance');
    expect(balance(null, {})).toBe('-');
    expect(balance(undefined, {})).toBe('-');
    expect(balance('2500', {})).toBe(balance(2500, {}));
  });

  it('translates enum values and keeps unknown ones as they are', () => {
    const status = columnOf(getProjectColumns(i18n.t), 'status');
    expect(status('active', {})).toBe(i18n.t('enums.projectStatus.active'));
    expect(status('archived', {})).toBe('archived');
  });

  it('writes empty cells for missing fields', () => {
    const rows = formatRecordsForExport(
      [{ code: 'CR-1', name: 'Demir Tedarik' }],
      getCompanyColumns(i18n.t)
    );
    expect(rows[0][i18n.t('export.columns.code')]).toBe('CR-1');
    expect(rows[0][i18n.t('export.columns.phone')]).toBe('');
    expect(rows[0][i18n.t('export.columns.receivable')]).toBe('-');
  });
});
