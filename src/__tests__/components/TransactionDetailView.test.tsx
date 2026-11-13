import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n';
import { TransactionDetailView } from '../../components/shared/TransactionDetailView';
import { DetailLayout, DetailAside, DetailMain } from '../../components/shared/DetailLayout';
import type { TransactionWithDetails } from '../../types';

const payment = {
  id: 7,
  scope: 'cari',
  type: 'payment_out',
  amount: 60000,
  amount_try: 60000,
  currency: 'TRY',
  exchange_rate: 1,
  date: '2026-11-10',
  description: 'Kasım siparişi ön ödeme',
  company_id: 1,
  company_name: 'Demir Tedarik Ltd.',
  project_id: null,
  category_id: null,
  document_no: null,
  linked_invoice_id: null,
  notes: null,
  created_at: '2026-11-10',
  updated_at: '2026-11-10',
} satisfies TransactionWithDetails;

describe('TransactionDetailView', () => {
  it('shows a payment with the same sign and badge as the tables', () => {
    render(
      <TransactionDetailView
        transaction={payment}
        allocations={[]}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('-₺60.000,00')).toBeInTheDocument();
    const badge = screen.getAllByText('Ödeme').find((el) => el.className.includes('rounded-full'));
    expect(badge?.className).toContain('bg-orange-500');
  });
});

describe('DetailLayout', () => {
  it('puts the side cards and the main content in their slots', () => {
    render(
      <DetailLayout>
        <DetailAside>
          <p>İletişim</p>
        </DetailAside>
        <DetailMain>
          <p>İşlem Geçmişi</p>
        </DetailMain>
      </DetailLayout>
    );

    const aside = screen.getByText('İletişim').parentElement;
    const main = screen.getByText('İşlem Geçmişi').parentElement;
    expect(aside?.className).toContain('md:grid-cols-2');
    expect(main?.className).toContain('min-[1600px]:col-span-2');
    expect(aside?.parentElement).toBe(main?.parentElement);
  });
});
