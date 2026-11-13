import React, { useState } from 'react';
import type { IconType } from 'react-icons';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiUploadCloud, FiDownloadCloud, FiX } from 'react-icons/fi';
import { useSync } from '../contexts/SyncContext';
import { useToast } from '../contexts/ToastContext';
import { BlockingDialog } from './ui/BlockingDialog';
import type { ConflictChoice } from '../utils/schemas';
import { cn } from '../utils/cn';
import { ipcErrorMessage } from '../utils/ipcError';
import { formatDateTime } from '../utils/formatters';

export const SyncConflictModal: React.FC<{ className?: string }> = ({ className }) => {
  const { conflict, clearConflict } = useSync();
  const toast = useToast();
  const { t } = useTranslation();
  const [resolving, setResolving] = useState<ConflictChoice | null>(null);

  const handleResolve = async (choice: ConflictChoice) => {
    if (!window.electronAPI?.sync) return;
    setResolving(choice);
    try {
      const result = await window.electronAPI.sync.resolveConflict(choice);
      if (result.success) {
        if (choice === 'use-local') toast.success(t('sync.useLocalSuccess'));
        else if (choice === 'use-remote') toast.success(t('sync.useRemoteSuccess'));
        clearConflict();
      } else {
        toast.error(result.error || t('sync.resolveError'));
      }
    } catch (err) {
      toast.error(t('sync.unexpectedError', { error: ipcErrorMessage(err) }));
    } finally {
      setResolving(null);
    }
  };

  if (!conflict) return null;

  const remoteTime = formatDateTime(conflict.remoteModifiedTime);
  const lastSync = conflict.lastSyncSuccess
    ? formatDateTime(conflict.lastSyncSuccess)
    : t('sync.neverInTr');

  return (
    <BlockingDialog
      open
      onDismiss={() => {
        if (resolving === null) void handleResolve('cancel');
      }}
      icon={FiAlertTriangle}
      title={t('sync.conflictTitle')}
      subtitle={t('sync.conflictSubtitle')}
      size="lg"
      className={className}
    >
      <div className="p-5 space-y-3">
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>{t('sync.conflictExplain', { lastSync })}</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>{t('sync.conflictItem1')}</li>
            <li>{t('sync.conflictItem2', { remoteTime })}</li>
          </ul>
          <p className="text-xs text-red-600 dark:text-red-400 pt-2">
            <strong>{t('common.warning')}:</strong> {t('sync.conflictWarning')}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <ResolveOption
            icon={FiUploadCloud}
            tone="emerald"
            title={t('sync.useLocal')}
            hint={`${t('sync.useLocalHint')} ${resolving === 'use-local' ? t('sync.useLocalUploading') : ''}`}
            disabled={resolving !== null}
            onClick={() => handleResolve('use-local')}
          />
          <ResolveOption
            icon={FiDownloadCloud}
            tone="blue"
            title={t('sync.useRemote')}
            hint={`${t('sync.useRemoteHint')} ${resolving === 'use-remote' ? t('sync.useRemoteDownloading') : ''}`}
            disabled={resolving !== null}
            onClick={() => handleResolve('use-remote')}
          />
          <ResolveOption
            icon={FiX}
            tone="gray"
            title={t('sync.decideLater')}
            hint={t('sync.decideLaterHint')}
            disabled={resolving !== null}
            onClick={() => handleResolve('cancel')}
          />
        </div>
      </div>
    </BlockingDialog>
  );
};

const TONES = {
  emerald: {
    border:
      'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600',
    icon: 'text-emerald-600',
  },
  blue: {
    border: 'border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600',
    icon: 'text-blue-600',
  },
  gray: {
    border: 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500',
    icon: 'text-gray-600',
  },
};

interface ResolveOptionProps {
  icon: IconType;
  tone: keyof typeof TONES;
  title: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}

function ResolveOption({
  icon: Icon,
  tone,
  title,
  hint,
  disabled,
  onClick,
  className,
}: ResolveOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-3 border-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left',
        TONES[tone].border,
        className
      )}
    >
      <Icon size={20} className={cn('flex-shrink-0', TONES[tone].icon)} />
      <div className="flex-1">
        <div className="font-semibold text-sm text-gray-900 dark:text-white">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{hint.trim()}</div>
      </div>
    </button>
  );
}
