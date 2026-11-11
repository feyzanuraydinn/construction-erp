import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCloudOff, FiLink, FiShield, FiAlertCircle, FiKey } from 'react-icons/fi';
import { useSync } from '../contexts/SyncContext';
import { useModalLayer } from './ui/Modal';
import { Button, Input } from './ui';
import { ipcErrorMessage } from '../utils/ipcError';

interface DriveReconnectModalProps {
  className?: string;
}

const ignoreEscape = (): void => undefined;

export function DriveReconnectModal({ className = '' }: DriveReconnectModalProps) {
  const { t } = useTranslation();
  const { status, refresh } = useSync();
  const open = status.status === 'disconnected' && status.driveRequired === true;
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useModalLayer(open, ignoreEscape, dialogRef);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    window.electronAPI.gdrive
      .hasCredentials()
      .then((has) => {
        if (!cancelled) setHasCredentials(has);
      })
      .catch(() => {
        if (!cancelled) setHasCredentials(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

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
    if (!clientId.trim() || !clientSecret.trim()) {
      setError(t('settings.credentialsRequired'));
      return;
    }
    setSavingCredentials(true);
    setError(null);
    try {
      await window.electronAPI.gdrive.saveCredentials(clientId.trim(), clientSecret.trim());
      setHasCredentials(true);
      setClientId('');
      setClientSecret('');
    } catch (saveError) {
      setError(ipcErrorMessage(saveError));
    } finally {
      setSavingCredentials(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm ${className}`}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl dark:bg-gray-800 fade-in"
      >
        <div className="px-6 pt-7 pb-5 text-center border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center mx-auto mb-4 rounded-full w-14 h-14 bg-amber-100 dark:bg-amber-900/40">
            <FiCloudOff size={26} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('driveLock.title')}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {status.reason === 'expired' ? t('driveLock.reasonExpired') : t('driveLock.reasonDisconnected')}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex gap-2">
              <FiShield className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{t('driveLock.dataSafe')}</span>
            </li>
            <li className="flex gap-2">
              <FiAlertCircle className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{t('driveLock.blocked')}</span>
            </li>
          </ul>

          {hasCredentials === false && (
            <div className="p-4 space-y-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="flex gap-2 text-xs text-gray-600 dark:text-gray-300">
                <FiKey className="mt-0.5 flex-shrink-0" />
                <span>{t('driveLock.credentialsMissing')}</span>
              </p>
              <Input
                label="Client ID"
                value={clientId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientId(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
              />
              <Input
                label="Client Secret"
                type="password"
                value={clientSecret}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSecret(e.target.value)}
                placeholder="GOCSPX-..."
              />
              <Button size="sm" variant="secondary" onClick={() => void saveCredentials()} loading={savingCredentials}>
                {t('driveLock.saveCredentials')}
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className="p-3 text-sm text-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-300">
              {t('driveLock.connectError', { error })}
            </p>
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
    </div>
  );
}
