import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiUploadCloud, FiDownloadCloud, FiX } from 'react-icons/fi';
import { useSync } from '../contexts/SyncContext';
import { useToast } from '../contexts/ToastContext';

export const SyncConflictModal: React.FC = () => {
  const { conflict, clearConflict } = useSync();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const [resolving, setResolving] = useState<'use-local' | 'use-remote' | 'cancel' | null>(null);

  if (!conflict) return null;

  const handleResolve = async (choice: 'use-local' | 'use-remote' | 'cancel') => {
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
      toast.error(t('sync.unexpectedError', { error: err instanceof Error ? err.message : String(err) }));
    } finally {
      setResolving(null);
    }
  };

  const locale = i18n.language === 'tr' ? 'tr-TR' : undefined;
  const remoteTime = new Date(conflict.remoteModifiedTime).toLocaleString(locale);
  const lastSync = conflict.lastSyncSuccess
    ? new Date(conflict.lastSyncSuccess).toLocaleString(locale)
    : t('sync.neverInTr');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
            <FiAlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('sync.conflictTitle')}</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">{t('sync.conflictSubtitle')}</p>
          </div>
        </div>

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
            <button
              onClick={() => handleResolve('use-local')}
              disabled={resolving !== null}
              className="w-full flex items-center gap-3 p-3 border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <FiUploadCloud size={20} className="text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{t('sync.useLocal')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('sync.useLocalHint')} {resolving === 'use-local' && t('sync.useLocalUploading')}
                </div>
              </div>
            </button>

            <button
              onClick={() => handleResolve('use-remote')}
              disabled={resolving !== null}
              className="w-full flex items-center gap-3 p-3 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <FiDownloadCloud size={20} className="text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{t('sync.useRemote')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('sync.useRemoteHint')} {resolving === 'use-remote' && t('sync.useRemoteDownloading')}
                </div>
              </div>
            </button>

            <button
              onClick={() => handleResolve('cancel')}
              disabled={resolving !== null}
              className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <FiX size={20} className="text-gray-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{t('sync.decideLater')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('sync.decideLaterHint')}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
