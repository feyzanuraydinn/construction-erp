import { describe, it, expect } from 'vitest';
import i18n from '../../i18n';
import { getTransactionColumns } from '../../utils/exportUtils';

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
