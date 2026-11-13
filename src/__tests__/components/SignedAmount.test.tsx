import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n';
import { SignedAmount } from '../../components/ui/SignedAmount';
import { TransactionTypeBadge } from '../../components/shared/TransactionTypeBadge';

describe('SignedAmount', () => {
  it('keeps the sign and the amount on one line', () => {
    render(<SignedAmount sign="-" amount={60000} />);

    const amount = screen.getByText('-₺60.000,00');
    expect(amount.className).toContain('whitespace-nowrap');
  });

  it('shows the currency it is given', () => {
    render(<SignedAmount sign="+" amount={3000} currency="USD" className="font-bold" />);

    const amount = screen.getByText(/^\+\$3\.000,00$/);
    expect(amount.className).toContain('font-bold');
  });
});

describe('TransactionTypeBadge', () => {
  it('centres its label when the label wraps onto two lines', () => {
    render(<TransactionTypeBadge type="invoice_in" />);

    const badge = screen.getByText('Alış Faturası');
    expect(badge.className).toContain('text-center');
    expect(badge.className).toContain('justify-center');
    expect(badge.className).toContain('bg-red-500');
  });
});
