import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiUploadCloud } from 'react-icons/fi';

/**
 * In-app confirmation modal triggered when the user clicks the window's close
 * button. The main process intercepts the close, sends `app:close-requested`,
 * and waits for either `app.confirmClose()` (do backup + cloud upload + quit)
 * or `app.cancelClose()` (do nothing).
 */
export const CloseConfirmModal: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.app?.onCloseRequested) return;
    const off = window.electronAPI.app.onCloseRequested(({ hasPendingChanges }) => {
      setHasPendingChanges(hasPendingChanges);
      setClosing(false);
      setOpen(true);
    });
    return off;
  }, []);

  const handleCancel = async () => {
    if (closing) return;
    setOpen(false);
    try {
      await window.electronAPI?.app.cancelClose();
    } catch {
      /* ignore */
    }
  };

  const handleConfirm = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await window.electronAPI?.app.confirmClose();
      // The main process will close the window — we don't need to flip state.
    } catch {
      // If the close failed for some reason, restore the modal so the user
      // isn't left with a stuck overlay.
      setClosing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
            <FiAlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('app.closeConfirmTitle')}</h2>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{t('app.closeConfirmMessage')}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {hasPendingChanges ? t('app.closeConfirmDetailPending') : t('app.closeConfirmDetail')}
          </p>

          {closing && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
              <FiUploadCloud size={14} className="animate-pulse" />
              <span>{t('app.closeInProgress')}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={closing}
            className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={closing}
            className="btn text-sm bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {closing ? (
              <>
                <div className="spinner w-3.5 h-3.5" />
                {t('common.closing')}
              </>
            ) : (
              t('common.close')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
