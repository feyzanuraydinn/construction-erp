import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

export function useCreateBackup(onCreated?: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const busy = useRef(false);

  const createBackup = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setCreating(true);
    try {
      await window.electronAPI.backup.create();
      toast.success(t('app.backupSuccess'));
      onCreated?.();
    } catch (error) {
      console.error('Backup error:', error);
      toast.error(t('app.backupError'));
    } finally {
      busy.current = false;
      setCreating(false);
    }
  }, [onCreated, t, toast]);

  return { creating, createBackup };
}
