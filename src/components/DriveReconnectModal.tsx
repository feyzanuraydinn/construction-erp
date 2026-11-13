import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { FiCloudOff, FiLink, FiShield, FiAlertCircle, FiKey } from 'react-icons/fi';
import { useSync } from '../contexts/SyncContext';
import { DialogShell } from './ui/BlockingDialog';
import { Button } from './ui/Button';
import {
  DriveCredentialsFields,
  EMPTY_DRIVE_CREDENTIALS,
  trimmedDriveCredentials,
  type DriveCredentials,
} from './shared/DriveCredentialsFields';
import { useLoadedData } from '../hooks/useLoadedData';
import { ipcErrorMessage } from '../utils/ipcError';
import { cn } from '../utils/cn';
import { Notice } from './ui/Notice';

interface DriveReconnectModalProps {
  className?: string;
}

const ignoreEscape = (): void => undefined;

const loadHasCredentials = () =>
  window.electronAPI.gdrive.hasCredentials().catch((error: unknown) => {
    console.error('Drive credentials check error:', error);
    return false;
  });

export function DriveReconnectModal({ className }: DriveReconnectModalProps) {
  const { status } = useSync();
  const open = status.status === 'disconnected' && status.driveRequired === true;
  const titleId = useId();
  const descriptionId = useId();

  return (
    <DialogShell
      open={open}
      onDismiss={ignoreEscape}
      labelledBy={titleId}
      describedBy={descriptionId}
      overlayClassName={cn('z-[110] bg-gray-900/70', className)}
      className="max-w-md rounded-2xl fade-in"
    >
      <ReconnectBody titleId={titleId} descriptionId={descriptionId} />
    </DialogShell>
  );
}

function ReasonItem({
  icon: Icon,
  iconClassName,
  children,
  className,
}: {
  icon: IconType;
  iconClassName: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={cn('flex gap-2', className)}>
      <Icon className={cn('mt-0.5 flex-shrink-0', iconClassName)} />
      <span>{children}</span>
    </li>
  );
}

function ReconnectBody({
  titleId,
  descriptionId,
  className,
}: {
  titleId: string;
  descriptionId: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { status, refresh } = useSync();
  const { data: storedCredentials } = useLoadedData(
    loadHasCredentials,
    'Drive credentials check error:'
  );
  const [savedNow, setSavedNow] = useState(false);
  const hasCredentials = savedNow ? true : storedCredentials;
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<DriveCredentials>(EMPTY_DRIVE_CREDENTIALS);
  const [savingCredentials, setSavingCredentials] = useState(false);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await window.electronAPI.gdrive.connect();
      if (result.success) await refresh();
      else setError(result.error || t('driveLock.connectFailed'));
    } catch (connectError) {
      setError(ipcErrorMessage(connectError));
    } finally {
      setConnecting(false);
    }
  };

  const saveCredentials = async () => {
    const trimmed = trimmedDriveCredentials(credentials);
    if (!trimmed) {
      setError(t('settings.credentialsRequired'));
      return;
    }
    setSavingCredentials(true);
    setError(null);
    try {
      await window.electronAPI.gdrive.saveCredentials(trimmed.clientId, trimmed.clientSecret);
      setSavedNow(true);
      setCredentials(EMPTY_DRIVE_CREDENTIALS);
    } catch (saveError) {
      setError(ipcErrorMessage(saveError));
    } finally {
      setSavingCredentials(false);
    }
  };

  return (
    <div className={className}>
      <div className="px-6 pt-7 pb-5 text-center border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-center mx-auto mb-4 rounded-full w-14 h-14 bg-amber-100 dark:bg-amber-900/40">
          <FiCloudOff size={26} className="text-amber-600 dark:text-amber-400" />
        </div>
        <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('driveLock.title')}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {status.reason === 'expired'
            ? t('driveLock.reasonExpired')
            : t('driveLock.reasonDisconnected')}
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <ReasonItem icon={FiShield} iconClassName="text-emerald-600 dark:text-emerald-400">
            {t('driveLock.dataSafe')}
          </ReasonItem>
          <ReasonItem icon={FiAlertCircle} iconClassName="text-amber-600 dark:text-amber-400">
            {t('driveLock.blocked')}
          </ReasonItem>
        </ul>

        {hasCredentials === false && (
          <div className="p-4 space-y-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <p className="flex gap-2 text-xs text-gray-600 dark:text-gray-300">
              <FiKey className="mt-0.5 flex-shrink-0" />
              <span>{t('driveLock.credentialsMissing')}</span>
            </p>
            <DriveCredentialsFields value={credentials} onChange={setCredentials} />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void saveCredentials()}
              loading={savingCredentials}
            >
              {t('driveLock.saveCredentials')}
            </Button>
          </div>
        )}

        {error && (
          <Notice tone="danger" role="alert">
            {t('driveLock.connectError', { error })}
          </Notice>
        )}

        <Button
          className="w-full justify-center"
          icon={FiLink}
          onClick={() => void connect()}
          loading={connecting}
          disabled={hasCredentials !== true || savingCredentials}
        >
          {connecting ? t('driveLock.waiting') : t('driveLock.connect')}
        </Button>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          {connecting ? t('driveLock.waitingHint') : t('driveLock.sameAccountHint')}
        </p>
      </div>
    </div>
  );
}
