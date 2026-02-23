import { formatCurrency, formatDate } from './formatters';
import type { TFunction } from 'i18next';

// Column definitions for different data types
export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: unknown) => string;
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

// Legacy static exports for backward compatibility
export const transactionColumns: ExportColumn[] = getTransactionColumns(((key: string) => key) as unknown as TFunction);
export const companyColumns: ExportColumn[] = getCompanyColumns(((key: string) => key) as unknown as TFunction);
export const projectColumns: ExportColumn[] = getProjectColumns(((key: string) => key) as unknown as TFunction);

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

// Export to CSV via electron API
export async function exportToCSV(
  type: string,
  records: unknown[],
  filename?: string
): Promise<string> {
  try {
    const result = await window.electronAPI.export.toExcel({
      type,
      records,
      filename,
    });
    return result;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}
