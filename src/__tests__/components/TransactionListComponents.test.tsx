import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { i18n } from '../../i18n';
import { useTransactionList } from '../../hooks/useTransactionList';
import { TransactionTable } from '../../components/transaction-list/TransactionTable';
import { TransactionFilterPanel } from '../../components/transaction-list/TransactionFilterPanel';
import { TransactionListDialogs } from '../../components/transaction-list/TransactionListDialogs';
import { TransactionPrintOptions } from '../../components/transaction-list/TransactionPrintOptions';
import { TransactionExportPreview } from '../../components/transaction-list/TransactionExportPreview';
import {
  TransactionPageActions,
  TransactionBulkDelete,
  TransactionQuickFilters,
} from '../../components/transaction-list/TransactionListParts';
import { AmountField } from '../../components/ui/AmountField';
import type { OptionList } from '../../components/transaction-list/options';
import type { TransactionType, TransactionWithDetails } from '../../types';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => toast }));

const t = i18n.t.bind(i18n);

function tx(
  id: number,
  type: TransactionType,
  amount: number,
  description: string,
  category_id: number
): TransactionWithDetails {
  return {
    id,
    scope: 'cari',
    company_id: 1,
    company_name: 'Demir Tedarik',
    project_id: null,
    type,
    category_id,
    category_name: null,
    date: `2026-0${id}-10`,
    description,
    amount,
    currency: 'TRY',
    exchange_rate: 1,
    amount_try: amount,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

const TRANSACTIONS = [
  tx(1, 'invoice_out', 150000, 'Daire satışı', 1),
  tx(2, 'invoice_in', 80000, 'Beton alımı', 2),
  tx(3, 'payment_in', 5000, 'Küçük tahsilat', 1),
];

const TYPE_OPTIONS: OptionList = [
  { value: 'invoice_out', label: 'Satış' },
  { value: 'invoice_in', label: 'Alış' },
  { value: 'payment_in', label: 'Tahsilat' },
];

const CATEGORY_OPTIONS: OptionList = [
  { value: 1, label: 'Satış' },
  { value: 2, label: 'Malzeme' },
];

function Harness({ loadData }: { loadData: () => void }) {
  const list = useTransactionList({
    transactions: TRANSACTIONS,
    loadData,
    exportPrefix: 'islemler',
  });
  return (
    <>
      <TransactionPageActions list={list} printOptions />
      <TransactionQuickFilters list={list} />
      <TransactionBulkDelete list={list} />
      <TransactionFilterPanel list={list} categoryOptions={CATEGORY_OPTIONS} />
      <TransactionTable list={list} counterpart="company" />
      <TransactionPrintOptions
        list={list}
        typeOptions={TYPE_OPTIONS}
        categoryOptions={CATEGORY_OPTIONS}
      />
      <TransactionExportPreview
        list={list}
        typeOptions={TYPE_OPTIONS}
        categoryOptions={CATEGORY_OPTIONS}
      />
      <TransactionListDialogs list={list} scope="cari" categories={[]} />
    </>
  );
}

function setAmount(input: HTMLElement, value: string) {
  fireEvent.change(input, {
    target: { value, selectionStart: value.length, selectionEnd: value.length },
  });
}

describe('transaction list components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.transaction.delete = vi.fn().mockResolvedValue({ success: true });
  });

  it('filters rows by amount and clears the filters again', () => {
    render(<Harness loadData={vi.fn()} />);
    expect(screen.getByText('Küçük tahsilat')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('common.filter') }));
    setAmount(screen.getByRole('textbox', { name: t('shared.filters.minAmountLabel') }), '50000');

    expect(screen.queryByText('Küçük tahsilat')).not.toBeInTheDocument();
    expect(screen.getByText('Beton alımı')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('shared.clearFilters') }));
    expect(screen.getByText('Küçük tahsilat')).toBeInTheDocument();
  });

  it('deletes the selected rows after confirmation', async () => {
    const loadData = vi.fn();
    render(<Harness loadData={loadData} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(
      screen.getByRole('button', { name: t('shared.bulkDelete.buttonLabel', { count: 2 }) })
    );

    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(t('shared.bulkDelete.message', { count: 2 }))
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: t('shared.bulkDelete.confirmText') })
    );

    await waitFor(() => expect(loadData).toHaveBeenCalledTimes(1));
    expect(window.electronAPI.transaction.delete).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith(t('transactions.bulkDeleteSuccess', { count: 2 }));
  });

  it('deletes a single row from its row actions', async () => {
    const loadData = vi.fn();
    render(<Harness loadData={loadData} />);

    const row = screen.getByText('Beton alımı').closest('tr');
    if (!row) throw new Error('row not found');
    fireEvent.click(within(row).getByTitle(t('common.delete')));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(t('shared.deleteTransaction.title'))).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: t('common.delete') }));

    await waitFor(() => expect(loadData).toHaveBeenCalledTimes(1));
    expect(window.electronAPI.transaction.delete).toHaveBeenCalledWith(2);
  });

  it('counts the rows the print options will include', () => {
    render(<Harness loadData={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: t('common.print') }));
    const dialog = screen.getByRole('dialog', { name: t('shared.printOptions.title') });
    expect(
      within(dialog).getByText(t('shared.printOptions.summary', { count: 3 }))
    ).toBeInTheDocument();

    fireEvent.change(
      within(dialog).getByRole('combobox', { name: t('shared.printOptions.transactionType') }),
      {
        target: { value: 'invoice_in' },
      }
    );
    expect(
      within(dialog).getByText(t('shared.printOptions.summary', { count: 1 }))
    ).toBeInTheDocument();
  });

  it('opens a row in the detail view and moves on to editing it', async () => {
    render(<Harness loadData={vi.fn()} />);

    fireEvent.click(screen.getByText('Beton alımı'));
    const detail = await screen.findByRole('dialog', { name: t('shared.transactionDetail.title') });
    expect(window.electronAPI.transaction.getAllocationsForInvoice).toHaveBeenCalledWith(2);
    fireEvent.click(within(detail).getByRole('button', { name: t('common.edit') }));

    expect(
      await screen.findByRole('dialog', { name: t('transactionModal.editTitle') })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: t('shared.transactionDetail.title') })
    ).not.toBeInTheDocument();
  });

  it('closes the delete question without deleting on cancel', () => {
    render(<Harness loadData={vi.fn()} />);
    const row = screen.getByText('Daire satışı').closest('tr');
    if (!row) throw new Error('row not found');
    fireEvent.click(within(row).getByTitle(t('common.delete')));

    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: t('common.cancel') })
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(window.electronAPI.transaction.delete).not.toHaveBeenCalled();
  });

  it('narrows the export preview by type', () => {
    render(<Harness loadData={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: t('common.exportToExcel') }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(t('export.preview.recordCount', { count: 3 }))
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getAllByRole('combobox')[0], {
      target: { value: 'payment_in' },
    });
    expect(
      within(dialog).getByText(t('export.preview.recordCount', { count: 1 }))
    ).toBeInTheDocument();
  });
});

function AmountForm({ onValue }: { onValue: (value: string | number) => void }) {
  const { control, watch } = useForm<{ price: string | number }>({
    defaultValues: { price: 1234.5 },
  });
  onValue(watch('price'));
  return <AmountField control={control} name="price" label="Fiyat" error="Zorunlu alan" required />;
}

describe('AmountField', () => {
  it('shows the form value grouped and writes typed amounts back to the form', () => {
    const onValue = vi.fn();
    render(<AmountForm onValue={onValue} />);
    const input = screen.getByRole('textbox', { name: /Fiyat/ });

    expect(input).toHaveValue('1.234,5');
    expect(screen.getByText('Zorunlu alan')).toBeInTheDocument();

    setAmount(input, '2.500');
    expect(onValue).toHaveBeenLastCalledWith('2500');
  });
});
