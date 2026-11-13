import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { ipcErrorMessage } from '../utils/ipcError';

export function useSaveAction(errorKey: string = 'common.saveError') {
  const { t } = useTranslation();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const runSave = async (work: () => Promise<void>) => {
    setSaving(true);
    try {
      await work();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t(errorKey, { error: ipcErrorMessage(error) }));
    } finally {
      setSaving(false);
    }
  };

  return { saving, runSave };
}
