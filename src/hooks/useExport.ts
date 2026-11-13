import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import {
  formatRecordsForExport,
  exportToExcel,
  shareExcel,
  type ExportColumn,
} from '../utils/exportUtils';
import type { ExportMetadata } from '../utils/schemas';

function exportRows<T>(
  data: T[],
  columns: ExportColumn[],
  summaryRows?: Record<string, string>[]
): Record<string, string>[] {
  const rows = formatRecordsForExport(data, columns);
  if (summaryRows && summaryRows.length > 0) rows.push(...summaryRows);
  return rows;
}

export type ExportAction = <T>(
  filename: string,
  data: T[],
  columns: ExportColumn[],
  summaryRows?: Record<string, string>[],
  metadata?: ExportMetadata
) => Promise<void>;

export function useExport() {
  const { t } = useTranslation();
  const toast = useToast();

  const handleExport = useCallback<ExportAction>(
    async (filename, data, columns, summaryRows, metadata) => {
      try {
        const exportData = exportRows(data, columns, summaryRows);
        const result = await exportToExcel(filename, exportData, metadata);
        if (result) {
          toast.success(t('common.exportSuccess'));
        }
      } catch {
        toast.error(t('common.exportError'));
      }
    },
    [t, toast]
  );

  const handleShare = useCallback<ExportAction>(
    async (filename, data, columns, summaryRows, metadata) => {
      try {
        const exportData = exportRows(data, columns, summaryRows);
        await shareExcel(filename, exportData, metadata);
        toast.success(t('export.share.success'));
      } catch (error) {
        console.error('Share error:', error);
        toast.error(t('export.share.error'));
      }
    },
    [t, toast]
  );

  return { handleExport, handleShare };
}
