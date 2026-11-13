import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useExport, type ExportAction } from './useExport';
import {
  formatRecordsForExport,
  getTransactionColumns,
  buildTransactionSummary,
} from '../utils/exportUtils';
import { toLocalDateString } from '../utils/dates';
import type { TransactionWithDetails } from '../types';

export function useTransactionExport() {
  const { t } = useTranslation();
  const { handleExport, handleShare } = useExport();

  const previewRows = useCallback(
    (transactions: TransactionWithDetails[]) =>
      formatRecordsForExport(transactions, getTransactionColumns(t)),
    [t]
  );

  const run = useCallback(
    (action: ExportAction, prefix: string, transactions: TransactionWithDetails[]) => {
      const { rows: summaryRows, metadata } = buildTransactionSummary(transactions, t);
      return action(
        `${prefix}_${toLocalDateString()}`,
        transactions,
        getTransactionColumns(t),
        summaryRows,
        metadata
      );
    },
    [t]
  );

  const exportTransactions = useCallback(
    (prefix: string, transactions: TransactionWithDetails[]) =>
      run(handleExport, prefix, transactions),
    [run, handleExport]
  );

  const shareTransactions = useCallback(
    (prefix: string, transactions: TransactionWithDetails[]) =>
      run(handleShare, prefix, transactions),
    [run, handleShare]
  );

  return { previewRows, exportTransactions, shareTransactions };
}
