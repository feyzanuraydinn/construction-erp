import { formatCurrency, formatDate } from './formatters';
import type { TFunction } from 'i18next';

// Column definitions for different data types
export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: unknown) => string;
}

// Metadata for styled Excel exports
export interface ExportMetadata {
  summaryStartIndex?: number;
  amountColumnLabel?: string;
  balanceColumnLabel?: string;
  receivableColumnLabel?: string;
  payableColumnLabel?: string;
  typeColumnLabel?: string;
  expenseTypeValues?: string[];
  redSummaryLabels?: string[];
  greenSummaryLabels?: string[];
  highlightSummaryLabels?: string[];
}

// Transaction export columns (accepts t function for i18n)
export function getTransactionColumns(t: TFunction): ExportColumn[] {
  return [
    { key: 'date', label: t('export.columns.date'), format: (v) => formatDate(v as string) },
    {
      key: 'type',
      label: t('export.columns.type'),
      format: (v) => t(`enums.transactionType.${v}`, v as string),
    },
    { key: 'description', label: t('export.columns.description') },
    { key: 'company_name', label: t('export.columns.companyAccount') },
    { key: 'project_name', label: t('export.columns.project') },
    { key: 'category_name', label: t('export.columns.category') },
    { key: 'amount', label: t('export.columns.amount'), format: (v) => formatCurrency(v as number) },
    { key: 'currency', label: t('export.columns.currency') },
    { key: 'document_no', label: t('export.columns.documentNo') },
  ];
}

// Company export columns
export function getCompanyColumns(t: TFunction): ExportColumn[] {
  return [
    { key: 'code', label: t('export.columns.code') },
    { key: 'name', label: t('export.columns.companyName') },
    { key: 'type', label: t('export.columns.type'), format: (v) => t(`enums.companyType.${v}`, v as string) },
    {
      key: 'account_type',
      label: t('export.columns.accountType'),
      format: (v) => t(`enums.accountType.${v}`, v as string),
    },
    { key: 'tax_number', label: t('export.columns.taxNumber') },
    { key: 'phone', label: t('export.columns.phone') },
    { key: 'email', label: t('export.columns.email') },
    { key: 'address', label: t('export.columns.address') },
    { key: 'receivable', label: t('export.columns.receivable'), format: (v) => formatCurrency(v as number) },
    { key: 'payable', label: t('export.columns.payable'), format: (v) => formatCurrency(v as number) },
    { key: 'balance', label: t('export.columns.balance'), format: (v) => formatCurrency(v as number) },
  ];
}

// Project export columns
export function getProjectColumns(t: TFunction): ExportColumn[] {
  return [
    { key: 'code', label: t('export.columns.code') },
    { key: 'name', label: t('export.columns.projectName') },
    {
      key: 'status',
      label: t('export.columns.status'),
      format: (v) => t(`enums.projectStatus.${v}`, v as string),
    },
    {
      key: 'ownership_type',
      label: t('export.columns.ownership'),
      format: (v) => t(`enums.ownershipType.${v}`, v as string),
    },
    { key: 'location', label: t('export.columns.location') },
    { key: 'estimated_budget', label: t('export.columns.budget'), format: (v) => formatCurrency(v as number) },
    { key: 'total_income', label: t('export.columns.totalIncome'), format: (v) => formatCurrency(v as number) },
    { key: 'total_expense', label: t('export.columns.totalExpense'), format: (v) => formatCurrency(v as number) },
    { key: 'total_collected', label: t('export.columns.totalCollected'), format: (v) => formatCurrency(v as number) },
    { key: 'total_paid', label: t('export.columns.totalPaid'), format: (v) => formatCurrency(v as number) },
  ];
}

// Format records for export based on column definitions
export function formatRecordsForExport<T>(
  records: T[],
  columns: ExportColumn[]
): Record<string, string>[] {
  return records.map((record) => {
    const formatted: Record<string, string> = {};
    columns.forEach((col) => {
      const value = (record as Record<string, unknown>)[col.key];
      formatted[col.label] = col.format
        ? col.format(value, record)
        : value === null || value === undefined
          ? ''
          : String(value);
    });
    return formatted;
  });
}

// Build summary rows + metadata for transaction-based exports
export function buildTransactionSummary(
  records: { type?: string; amount_try?: number; amount?: number }[],
  t: TFunction,
  dataRowCount: number
): { rows: Record<string, string>[]; metadata: ExportMetadata } {
  let totalInvoiceOut = 0;
  let totalPaymentIn = 0;
  let totalInvoiceIn = 0;
  let totalPaymentOut = 0;

  for (const r of records) {
    const amount = r.amount_try ?? r.amount ?? 0;
    switch (r.type) {
      case 'invoice_out': totalInvoiceOut += amount; break;
      case 'payment_in': totalPaymentIn += amount; break;
      case 'invoice_in': totalInvoiceIn += amount; break;
      case 'payment_out': totalPaymentOut += amount; break;
    }
  }

  const netBalance = (totalInvoiceOut + totalPaymentOut) - (totalInvoiceIn + totalPaymentIn);
  const descKey = t('export.columns.description');
  const amtKey = t('export.columns.amount');

  const rows: Record<string, string>[] = [
    {},
    { [descKey]: t('export.summary.header') },
    { [descKey]: t('export.summary.invoiceOut'), [amtKey]: formatCurrency(totalInvoiceOut) },
    { [descKey]: t('export.summary.paymentIn'), [amtKey]: formatCurrency(totalPaymentIn) },
    { [descKey]: t('export.summary.invoiceIn'), [amtKey]: formatCurrency(totalInvoiceIn) },
    { [descKey]: t('export.summary.paymentOut'), [amtKey]: formatCurrency(totalPaymentOut) },
    { [descKey]: t('export.summary.receivable'), [amtKey]: formatCurrency(totalInvoiceOut - totalPaymentIn) },
    { [descKey]: t('export.summary.payable'), [amtKey]: formatCurrency(totalInvoiceIn - totalPaymentOut) },
    { [descKey]: t('export.summary.netBalance'), [amtKey]: formatCurrency(netBalance) },
  ];

  return {
    rows,
    metadata: {
      summaryStartIndex: dataRowCount + 1,
      amountColumnLabel: amtKey,
      typeColumnLabel: t('export.columns.type'),
      expenseTypeValues: [
        t('enums.transactionType.invoice_out'),
        t('enums.transactionType.payment_out'),
      ],
      redSummaryLabels: [
        t('export.summary.invoiceOut'),
        t('export.summary.paymentOut'),
        t('export.summary.payable'),
      ],
      greenSummaryLabels: [
        t('export.summary.invoiceIn'),
        t('export.summary.paymentIn'),
        t('export.summary.receivable'),
      ],
      highlightSummaryLabels: [
        t('export.summary.netBalance'),
      ],
    },
  };
}

// Build summary rows + metadata for company list exports
export function buildCompanySummary(
  records: { balance?: number }[],
  t: TFunction,
  dataRowCount: number
): { rows: Record<string, string>[]; metadata: ExportMetadata } {
  let totalReceivable = 0;
  let totalPayable = 0;

  for (const r of records) {
    const bal = r.balance ?? 0;
    if (bal > 0) totalReceivable += bal;
    else if (bal < 0) totalPayable += Math.abs(bal);
  }

  const nameKey = t('export.columns.companyName');
  const balKey = t('export.columns.balance');

  const rows: Record<string, string>[] = [
    {},
    { [nameKey]: t('export.summary.header') },
    { [nameKey]: t('export.summary.totalReceivable'), [balKey]: formatCurrency(totalReceivable) },
    { [nameKey]: t('export.summary.totalPayable'), [balKey]: formatCurrency(totalPayable) },
    { [nameKey]: t('export.summary.netBalance'), [balKey]: formatCurrency(totalReceivable - totalPayable) },
    { [nameKey]: t('common.total') + ' (' + t('export.summary.accountCount') + ')', [balKey]: String(records.length) },
  ];

  const recKey = t('export.columns.receivable');
  const payKey = t('export.columns.payable');

  return {
    rows,
    metadata: {
      summaryStartIndex: dataRowCount + 1,
      balanceColumnLabel: balKey,
      receivableColumnLabel: recKey,
      payableColumnLabel: payKey,
      redSummaryLabels: [
        t('export.summary.totalPayable'),
      ],
      greenSummaryLabels: [
        t('export.summary.totalReceivable'),
      ],
      highlightSummaryLabels: [
        t('export.summary.netBalance'),
      ],
    },
  };
}

// Export to Excel via electron API
export async function exportToExcel(
  type: string,
  records: unknown[],
  filename?: string,
  metadata?: ExportMetadata
): Promise<string> {
  try {
    const result = await window.electronAPI.export.toExcel({
      type,
      records,
      filename,
      metadata,
    });
    return result;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

// Share Excel — copies file to clipboard and opens its folder in Explorer
export async function shareExcel(
  type: string,
  records: unknown[],
  filename?: string,
  metadata?: ExportMetadata
): Promise<void> {
  await window.electronAPI.export.share({
    type,
    records,
    filename,
    metadata,
  });
}

// Legacy alias
export const exportToCSV = exportToExcel;
