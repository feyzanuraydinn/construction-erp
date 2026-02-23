import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { formatRecordsForExport, exportToCSV, type ExportColumn } from '../utils/exportUtils';

export function useExport() {
  const { t } = useTranslation();
  const toast = useToast();

  const handleExport = useCallback(async <T,>(
    filename: string,
    data: T[],
    columns: ExportColumn[]
  ) => {
    try {
      const exportData = formatRecordsForExport(data, columns);
      const result = await exportToCSV(filename, exportData);
      if (result) {
        toast.success(t('common.exportSuccess'));
      }
    } catch {
      toast.error(t('common.exportError'));
    }
  }, [t, toast]);

  return { handleExport };
}
