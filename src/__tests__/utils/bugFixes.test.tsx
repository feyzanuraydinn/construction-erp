import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { i18n } from '../../i18n';
import { TransactionDetailView } from '../../components/shared/TransactionDetailView';
import { matchesSearchText } from '../../utils/formatters';
import { expenseTotalsByCategory } from '../../utils/categories';
import { toLocalDateString } from '../../utils/dates';
import type { PaymentAllocationWithDetails, TransactionWithDetails } from '../../types';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => toast }));
const exports = vi.hoisted(() => ({
  exportToExcel: vi.fn().mockResolvedValue('x.xlsx'),
  shareExcel: vi.fn(),
}));
vi.mock('../../utils/exportUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/exportUtils')>();
  return { ...actual, exportToExcel: exports.exportToExcel, shareExcel: exports.shareExcel };
});

import { useTransactionList } from '../../hooks/useTransactionList';

function tx(overrides: Partial<TransactionWithDetails>): TransactionWithDetails {
  return {
    id: 1,
    scope: 'cari',
    type: 'invoice_in',
    amount: 1000,
    amount_try: 1000,
    currency: 'TRY',
    exchange_rate: 1,
    date: '2026-11-10',
    description: 'Demir faturası',
    company_id: 1,
    project_id: null,
    category_id: null,
    created_at: '2026-11-10',
    updated_at: '2026-11-10',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('invoice detail', () => {
  it('lists the matched payments with their own description and date', () => {
    const allocation: PaymentAllocationWithDetails = {
      id: 3,
      payment_id: 9,
      invoice_id: 1,
      amount: 400,
      created_at: '2026-11-11',
      payment_description: 'Havale ile ödeme',
      payment_date: '2026-11-11',
      payment_document_no: 'DK-12',
    };
    render(
      <TransactionDetailView
        transaction={tx({})}
        allocations={[allocation]}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Havale ile ödeme')).toBeInTheDocument();
    expect(screen.getByText('(DK-12)')).toBeInTheDocument();
    expect(screen.getByText('11.11.2026')).toBeInTheDocument();
  });
});

describe('Turkish search', () => {
  it('matches dotted and dotless i in both directions', () => {
    expect(matchesSearchText('istanbul', 'İSTANBUL ŞUBESİ')).toBe(true);
    expect(matchesSearchText('IŞIK', 'Işık Yapı')).toBe(true);
    expect(matchesSearchText('ışık', 'IŞIK YAPI')).toBe(true);
    expect(matchesSearchText('İnşaat', 'inşaat taahhüt')).toBe(true);
    expect(matchesSearchText('çelik', 'Demir', null, 'ÇELİK TEDARİK')).toBe(true);
    expect(matchesSearchText('beton', 'Demir', undefined)).toBe(false);
    expect(matchesSearchText('', 'Herhangi')).toBe(true);
  });
});

describe('expense breakdown', () => {
  it('counts expense documents and payments under translated category names', () => {
    const totals = expenseTotalsByCategory(i18n.t, [
      tx({ type: 'invoice_in', category_name: 'Diğer', amount: 100, amount_try: 100 }),
      tx({ type: 'payment_out', category_name: null, amount: 50, amount_try: 50 }),
      tx({ type: 'invoice_out', category_name: 'Diğer', amount: 999, amount_try: 999 }),
    ]);

    expect(Object.keys(totals)).toEqual([i18n.t('analytics.other')]);
    expect(Object.values(totals).reduce((sum, value) => sum + value, 0)).toBe(150);
  });
});

describe('export file names', () => {
  it('use the local date, not the UTC date, just after midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 13, 0, 30));
    const { result } = renderHook(() =>
      useTransactionList({
        transactions: [tx({})],
        loadData: vi.fn(),
        exportPrefix: 'cari_islemleri',
      })
    );

    await act(async () => {
      await result.current.handleExport();
    });

    expect(toLocalDateString()).toBe('2026-11-13');
    expect(exports.exportToExcel).toHaveBeenCalledWith(
      'cari_islemleri_2026-11-13',
      expect.any(Array),
      expect.anything()
    );
  });
});
