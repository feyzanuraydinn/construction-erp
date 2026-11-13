import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { ipcErrorMessage } from '../utils/ipcError';

export function useReportLoadError(): (label: string, error: unknown) => void {
  const { t } = useTranslation();
  const toast = useToast();
  return useCallback(
    (label: string, error: unknown) => {
      console.error(label, error);
      toast.error(t('common.loadError', { error: ipcErrorMessage(error) }));
    },
    [toast, t]
  );
}
