import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

/**
 * Yazdırma işlemlerini yöneten hook.
 * electronAPI.app.print() çağrısını sararak hata yönetimini merkezi hale getirir.
 */
export function usePrint() {
  const toast = useToast();
  const { t } = useTranslation();

  const executePrint = useCallback(async () => {
    try {
      const result = await window.electronAPI.app.print();
      if (!result.success) {
        toast.error(t('common.printError', { error: result.error || 'Unknown' }));
      }
    } catch {
      toast.error(t('common.printUnknownError'));
    }
  }, [toast, t]);

  return { executePrint };
}
