import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { formatRecordsForExport, exportToExcel, shareExcel, type ExportColumn, type ExportMetadata } from '../utils/exportUtils';

export function useExport() {
  const { t } = useTranslation();
  const toast = useToast();

  const handleExport = useCallback(async <T,>(
    filename: string,
    data: T[],
    columns: ExportColumn[],
    summaryRows?: Record<string, string>[],
    metadata?: ExportMetadata
  ) => {
    try {
      const exportData = formatRecordsForExport(data, columns);
      if (summaryRows && summaryRows.length > 0) {
        exportData.push(...summaryRows);
      }
      const result = await exportToExcel(filename, exportData, filename, metadata);
      if (result) {
        toast.success(t('common.exportSuccess'));
      }
    } catch {
      toast.error(t('common.exportError'));
    }
  }, [t, toast]);

  const handleShare = useCallback(async <T,>(
    filename: string,
    data: T[],
    columns: ExportColumn[],
    summaryRows?: Record<string, string>[],
    metadata?: ExportMetadata
  ) => {
    try {
      const exportData = formatRecordsForExport(data, columns);
      if (summaryRows && summaryRows.length > 0) {
        exportData.push(...summaryRows);
      }
      await shareExcel(filename, exportData, filename, metadata);
      toast.success(t('export.share.success'));
    } catch (error) {
      console.error('Share error:', error);
      toast.error(t('export.share.error'));
    }
  }, [t, toast]);

  return { handleExport, handleShare };
}
