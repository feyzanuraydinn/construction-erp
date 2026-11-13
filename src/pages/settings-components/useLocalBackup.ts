import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { useLoadedData } from '../../hooks/useLoadedData';
import { useCreateBackup } from '../../hooks/useCreateBackup';

export type BackupInfo =
  | { exists: false }
  | { exists: true; path: string; size: number; date: string };

const loadBackupInfo = async (): Promise<BackupInfo> => {
  const [latest] = await window.electronAPI.backup.list();
  return latest
    ? { exists: true, path: latest.path, size: latest.size, date: latest.date }
    : { exists: false };
};

export function useLocalBackup() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: backupInfo, reload: reloadBackupInfo } = useLoadedData(
    loadBackupInfo,
    'Backup info load error:'
  );
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);

  const { creating, createBackup } = useCreateBackup(reloadBackupInfo);

  const restore = async () => {
    if (!backupInfo?.exists) return;
    setRestoring(true);
    try {
      const result = await window.electronAPI.backup.restore(backupInfo.path);
      if (result.success) {
        toast.success(t('settings.restoreSuccess'));
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(t('settings.restoreError', { error: result.error }));
      }
    } catch (error) {
      toast.error(t('settings.restoreGeneralError'));
      console.error('Restore error:', error);
    } finally {
      setRestoring(false);
      setRestoreConfirm(false);
    }
  };

  const openFolder = async () => {
    try {
      await window.electronAPI.backup.openFolder();
    } catch (error) {
      console.error('Open folder error:', error);
    }
  };

  return {
    backupInfo,
    reloadBackupInfo,
    creating,
    createBackup,
    restoring,
    restoreConfirm,
    setRestoreConfirm,
    restore,
    openFolder,
  };
}
