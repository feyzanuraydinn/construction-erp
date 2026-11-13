import { formatCurrency, formatDate } from './formatters';
import type { TFunction } from 'i18next';
import type { Currency } from '../types';
import type { ExportRecord, ExportMetadata } from './schemas';
import {
  calculateTransactionTotals,
  sumNetPositions,
  type MoneyRecord,
  splitNetBalance,
} from './financials';
import { isRecord, toText } from './typeGuards';

function rowCurrency(row: unknown): Currency {
  if (!isRecord(row)) return 'TRY';
  const { currency } = row;
  return currency === 'USD' || currency === 'EUR' ? currency : 'TRY';
}

function amountOrNull(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: unknown): string {
  return formatCurrency(amountOrNull(value));
}

function enumLabel(t: TFunction, group: string) {
  return (value: unknown) => t(`enums.${group}.${toText(value)}`, toText(value));
}

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: unknown) => string;
}

export function getTransactionColumns(t: TFunction): ExportColumn[] {
  return [
    { key: 'date', label: t('export.columns.date'), format: (v) => formatDate(toText(v)) },
    {
      key: 'type',
      label: t('export.columns.type'),
      format: enumLabel(t, 'transactionType'),
    },
    { key: 'description', label: t('export.columns.description') },
    { key: 'company_name', label: t('export.columns.companyAccount') },
    { key: 'project_name', label: t('export.columns.project') },
    { key: 'category_name', label: t('export.columns.category') },
    {
      key: 'amount',
      label: t('export.columns.amount'),
      format: (v, row) => formatCurrency(amountOrNull(v), rowCurrency(row)),
    },
    { key: 'currency', label: t('export.columns.currency') },
    { key: 'document_no', label: t('export.columns.documentNo') },
  ];
}

export function getCompanyColumns(t: TFunction): ExportColumn[] {
  return [
    { key: 'code', label: t('export.columns.code') },
    { key: 'name', label: t('export.columns.companyName') },
    { key: 'type', label: t('export.columns.type'), format: enumLabel(t, 'companyType') },
    {
      key: 'account_type',
      label: t('export.columns.accountType'),
      format: enumLabel(t, 'accountType'),
    },
    { key: 'tax_number', label: t('export.columns.taxNumber') },
    { key: 'phone', label: t('export.columns.phone') },
    { key: 'email', label: t('export.columns.email') },
    { key: 'address', label: t('export.columns.address') },
    { key: 'receivable', label: t('export.columns.receivable'), format: money },
    { key: 'payable', label: t('export.columns.payable'), format: money },
    { key: 'balance', label: t('export.columns.balance'), format: money },
  ];
}

export function getProjectColumns(t: TFunction): ExportColumn[] {
  return [
    { key: 'code', label: t('export.columns.code') },
    { key: 'name', label: t('export.columns.projectName') },
    {
      key: 'status',
      label: t('export.columns.status'),
      format: enumLabel(t, 'projectStatus'),
    },
    {
      key: 'ownership_type',
      label: t('export.columns.ownership'),
      format: enumLabel(t, 'ownershipType'),
    },
    { key: 'location', label: t('export.columns.location') },
    { key: 'estimated_budget', label: t('export.columns.budget'), format: money },
    { key: 'total_income', label: t('export.columns.totalIncome'), format: money },
    { key: 'total_expense', label: t('export.columns.totalExpense'), format: money },
    { key: 'total_collected', label: t('export.columns.totalCollected'), format: money },
    { key: 'total_paid', label: t('export.columns.totalPaid'), format: money },
  ];
}

export function formatRecordsForExport<T>(
  records: T[],
  columns: ExportColumn[]
): Record<string, string>[] {
  return records.map((record) => {
    const formatted: Record<string, string> = {};
    columns.forEach((col) => {
      const value = isRecord(record) ? record[col.key] : undefined;
      formatted[col.label] = col.format
        ? col.format(value, record)
        : value === null || value === undefined
          ? ''
          : String(value);
    });
    return formatted;
  });
}

export function buildTransactionSummary(
  records: MoneyRecord[],
  t: TFunction
): { rows: Record<string, string>[]; metadata: ExportMetadata } {
  const { totalInvoiceOut, totalPaymentIn, totalInvoiceIn, totalPaymentOut, netBalance } =
    calculateTransactionTotals(records);
  const positions = sumNetPositions(records);
  const descKey = t('export.columns.description');
  const amtKey = t('export.columns.amount');

  const rows: Record<string, string>[] = [
    {},
    { [descKey]: t('export.summary.header') },
    { [descKey]: t('export.summary.invoiceOut'), [amtKey]: formatCurrency(totalInvoiceOut) },
    { [descKey]: t('export.summary.paymentIn'), [amtKey]: formatCurrency(totalPaymentIn) },
    { [descKey]: t('export.summary.invoiceIn'), [amtKey]: formatCurrency(totalInvoiceIn) },
    { [descKey]: t('export.summary.paymentOut'), [amtKey]: formatCurrency(totalPaymentOut) },
    { [descKey]: t('export.summary.receivable'), [amtKey]: formatCurrency(positions.receivable) },
    { [descKey]: t('export.summary.payable'), [amtKey]: formatCurrency(positions.payable) },
    { [descKey]: t('export.summary.netBalance'), [amtKey]: formatCurrency(netBalance) },
  ];

  return {
    rows,
    metadata: {
      summaryStartIndex: records.length + 1,
      amountColumnLabel: amtKey,
      typeColumnLabel: t('export.columns.type'),
      expenseTypeValues: [
        t('enums.transactionType.invoice_in'),
        t('enums.transactionType.payment_out'),
      ],
      redSummaryLabels: [
        t('export.summary.invoiceIn'),
        t('export.summary.paymentOut'),
        t('export.summary.payable'),
      ],
      greenSummaryLabels: [
        t('export.summary.invoiceOut'),
        t('export.summary.paymentIn'),
        t('export.summary.receivable'),
      ],
      highlightSummaryLabels: [t('export.summary.netBalance')],
    },
  };
}

export function buildCompanySummary(
  records: { balance?: number }[],
  t: TFunction
): { rows: Record<string, string>[]; metadata: ExportMetadata } {
  let totalReceivable = 0;
  let totalPayable = 0;

  for (const r of records) {
    const { receivable, payable } = splitNetBalance(r.balance ?? 0);
    totalReceivable += receivable;
    totalPayable += payable;
  }

  const nameKey = t('export.columns.companyName');
  const balKey = t('export.columns.balance');

  const rows: Record<string, string>[] = [
    {},
    { [nameKey]: t('export.summary.header') },
    { [nameKey]: t('export.summary.totalReceivable'), [balKey]: formatCurrency(totalReceivable) },
    { [nameKey]: t('export.summary.totalPayable'), [balKey]: formatCurrency(totalPayable) },
    {
      [nameKey]: t('export.summary.netBalance'),
      [balKey]: formatCurrency(totalReceivable - totalPayable),
    },
    {
      [nameKey]: t('common.total') + ' (' + t('export.summary.accountCount') + ')',
      [balKey]: String(records.length),
    },
  ];

  const recKey = t('export.columns.receivable');
  const payKey = t('export.columns.payable');

  return {
    rows,
    metadata: {
      summaryStartIndex: records.length + 1,
      balanceColumnLabel: balKey,
      receivableColumnLabel: recKey,
      payableColumnLabel: payKey,
      redSummaryLabels: [t('export.summary.totalPayable')],
      greenSummaryLabels: [t('export.summary.totalReceivable')],
      highlightSummaryLabels: [t('export.summary.netBalance')],
    },
  };
}

export function exportToExcel(
  filename: string,
  records: ExportRecord[],
  metadata?: ExportMetadata
): Promise<string> {
  return window.electronAPI.export.toExcel({ filename, records, metadata });
}

export async function shareExcel(
  filename: string,
  records: ExportRecord[],
  metadata?: ExportMetadata
): Promise<void> {
  await window.electronAPI.export.share({ filename, records, metadata });
}
