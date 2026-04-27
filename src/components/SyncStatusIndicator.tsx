import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCloud, FiCloudOff, FiUploadCloud, FiDownloadCloud, FiAlertCircle, FiCheckCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import { useSync } from '../contexts/SyncContext';
import type { SyncStatusValue } from '../types/electron';

interface Props {
  collapsed: boolean;
}

const getStatusInfo = (
  status: SyncStatusValue,
  t: (key: string) => string,
): { icon: React.ReactNode; color: string; label: string } => {
  switch (status) {
    case 'synced':
      return { icon: <FiCheckCircle size={16} />, color: 'text-emerald-400', label: t('sync.synced') };
    case 'uploading':
      return { icon: <FiUploadCloud size={16} className="animate-pulse" />, color: 'text-blue-400', label: t('sync.uploading') };
    case 'downloading':
      return { icon: <FiDownloadCloud size={16} className="animate-pulse" />, color: 'text-blue-400', label: t('sync.downloading') };
    case 'pending':
      return { icon: <FiClock size={16} />, color: 'text-amber-400', label: t('sync.pending') };
    case 'conflict':
      return { icon: <FiAlertCircle size={16} />, color: 'text-orange-400', label: t('sync.conflict') };
    case 'error':
      return { icon: <FiAlertCircle size={16} />, color: 'text-red-400', label: t('sync.error') };
    case 'offline':
      return { icon: <FiCloudOff size={16} />, color: 'text-gray-500', label: t('sync.offline') };
    case 'disconnected':
    default:
      return { icon: <FiCloud size={16} />, color: 'text-gray-500', label: t('sync.disconnected') };
  }
};

const useFormatLastSync = () => {
  const { t, i18n } = useTranslation();
  return (iso: string | null | undefined): string => {
    if (!iso) return t('sync.neverSynced');
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('sync.justNow');
    if (mins < 60) return t('sync.minutesAgo', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('sync.hoursAgo', { n: hours });
    return date.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : undefined);
  };
};

export const SyncStatusIndicator: React.FC<Props> = ({ collapsed }) => {
  const { status } = useSync();
  const { t } = useTranslation();
  const formatLastSync = useFormatLastSync();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const info = getStatusInfo(status.status, t);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSyncNow = async () => {
    if (syncing || !window.electronAPI?.sync) return;
    setSyncing(true);
    try {
      await window.electronAPI.sync.check();
    } catch {
      // status will update via event
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${info.color}`}
        title={collapsed ? info.label : ''}
      >
        {info.icon}
        {!collapsed && (
          <div className="flex-1 text-left">
            <div className="text-xs font-medium">{info.label}</div>
            <div className="text-[10px] text-gray-500">{t('sync.lastSyncLabel', { value: formatLastSync(status.lastSyncSuccess) })}</div>
          </div>
        )}
      </button>

      {open && (
        <div
          className={`absolute bottom-full mb-2 bg-slate-800 border border-white/10 rounded-lg shadow-xl p-3 z-50 ${
            collapsed ? 'left-full ml-2 w-60' : 'left-0 right-0'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={info.color}>{info.icon}</span>
            <span className="text-sm font-semibold text-white">{info.label}</span>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>{t('sync.lastSyncFullLabel', { value: formatLastSync(status.lastSyncSuccess) })}</div>
            {status.error && (
              <div className="text-red-400 mt-2 text-[11px] break-words">{t('sync.errorLabel', { error: status.error })}</div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSyncNow}
              disabled={syncing || status.status === 'disconnected' || status.status === 'uploading' || status.status === 'downloading'}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
            >
              <FiRefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {t('sync.syncNow')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
