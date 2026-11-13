import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { useLoadedData } from '../../hooks/useLoadedData';
import { NO_ITEMS } from '../../utils/emptyList';
import type { DriveBackupFile, DriveOperationResult } from '../../types';
import {
  EMPTY_DRIVE_CREDENTIALS,
  trimmedDriveCredentials,
  type DriveCredentials,
} from '../../components/shared/DriveCredentialsFields';

interface DriveOperation {
  run: () => Promise<DriveOperationResult>;
  onSuccess: () => void;
  failKey: string;
  errorKey: string;
}

interface DriveStatus {
  hasCredentials: boolean;
  connected: boolean;
}

const loadDriveStatus = async (): Promise<DriveStatus> => {
  const hasCredentials = await window.electronAPI.gdrive.hasCredentials();
  const connected = hasCredentials ? await window.electronAPI.gdrive.isConnected() : false;
  return { hasCredentials, connected };
};

const loadDriveBackups = () => window.electronAPI.gdrive.listBackups();

export function useDriveSettings(onLocalBackupsChanged: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    data: status,
    loading: statusLoading,
    reload: reloadStatus,
  } = useLoadedData(loadDriveStatus, 'Drive status check error:');
  const connected = status?.connected ?? false;
  const {
    data: loadedBackups,
    loading: backupsLoading,
    reload: reloadBackups,
  } = useLoadedData(connected ? loadDriveBackups : null, 'Drive backups load error:');
  const backups: DriveBackupFile[] | null = connected
    ? (loadedBackups ?? (backupsLoading ? null : NO_ITEMS))
    : null;
  const [loading, setLoading] = useState(false);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [credentials, setCredentials] = useState<DriveCredentials>(EMPTY_DRIVE_CREDENTIALS);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);

  const withLoading = async (work: () => Promise<void>, errorKey: string) => {
    setLoading(true);
    try {
      await work();
    } catch (error) {
      console.error('Drive operation error:', error);
      toast.error(t(errorKey));
    } finally {
      setLoading(false);
    }
  };

  const runOperation = ({ run, onSuccess, failKey, errorKey }: DriveOperation) =>
    withLoading(async () => {
      const result = await run();
      if (result.success) {
        onSuccess();
      } else {
        toast.error(result.error || t(failKey));
      }
    }, errorKey);

  const saveCredentials = async () => {
    const trimmed = trimmedDriveCredentials(credentials);
    if (!trimmed) {
      toast.error(t('settings.credentialsRequired'));
      return;
    }
    await withLoading(async () => {
      await window.electronAPI.gdrive.saveCredentials(trimmed.clientId, trimmed.clientSecret);
      try {
        await window.electronAPI.gdrive.disconnect();
      } catch (error) {
        console.error('Drive disconnect error:', error);
      }
      reloadStatus();
      setShowCredentialsForm(false);
      setCredentials(EMPTY_DRIVE_CREDENTIALS);
      toast.success(t('settings.credentialsSaved'));
    }, 'settings.credentialsSaveError');
  };

  const connect = () =>
    runOperation({
      run: () => window.electronAPI.gdrive.connect(),
      onSuccess: () => {
        reloadStatus();
        toast.success(t('settings.driveConnectSuccess'));
      },
      failKey: 'settings.connectionError',
      errorKey: 'settings.driveConnectError',
    });

  const upload = () =>
    runOperation({
      run: () => window.electronAPI.gdrive.uploadBackup(),
      onSuccess: () => {
        toast.success(t('settings.driveUploadSuccess'));
        reloadBackups();
        onLocalBackupsChanged();
      },
      failKey: 'settings.uploadError',
      errorKey: 'settings.driveUploadError',
    });

  const download = (file: DriveBackupFile) =>
    runOperation({
      run: () => window.electronAPI.gdrive.downloadBackup(file.id, file.name),
      onSuccess: () => {
        toast.success(t('settings.driveDownloadSuccess'));
        onLocalBackupsChanged();
      },
      failKey: 'settings.downloadError',
      errorKey: 'settings.driveDownloadError',
    });

  const disconnect = () =>
    withLoading(async () => {
      await window.electronAPI.gdrive.disconnect();
      reloadStatus();
      toast.success(t('settings.driveDisconnectSuccess'));
    }, 'settings.driveDisconnectError');

  const confirmDisconnect = async () => {
    setDisconnectConfirm(false);
    await disconnect();
  };

  const toggleCredentialsForm = () => setShowCredentialsForm(!showCredentialsForm);

  const cancelCredentials = () => {
    setShowCredentialsForm(false);
    setCredentials(EMPTY_DRIVE_CREDENTIALS);
  };

  return {
    hasCredentials: status?.hasCredentials ?? null,
    connected,
    statusLoading,
    backups,
    loading,
    backupsLoading,
    showCredentialsForm,
    credentials,
    setCredentials,
    disconnectConfirm,
    setDisconnectConfirm,
    saveCredentials,
    connect,
    upload,
    download,
    confirmDisconnect,
    toggleCredentialsForm,
    cancelCredentials,
  };
}

export type DriveSettings = ReturnType<typeof useDriveSettings>;
