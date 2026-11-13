import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiUploadCloud } from 'react-icons/fi';
import { BlockingDialog } from './ui/BlockingDialog';
import { Button } from './ui/Button';
import { Notice } from './ui/Notice';

export const CloseConfirmModal: React.FC<{ className?: string }> = ({ className }) => {
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
    } catch (error) {
      console.error('Cancel close error:', error);
    }
  };

  const handleConfirm = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await window.electronAPI?.app.confirmClose();
    } catch {
      setClosing(false);
    }
  };

  return (
    <BlockingDialog
      open={open}
      onDismiss={() => void handleCancel()}
      icon={FiAlertCircle}
      title={t('app.closeConfirmTitle')}
      className={className}
    >
      <div className="p-5 space-y-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {t('app.closeConfirmMessage')}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {hasPendingChanges ? t('app.closeConfirmDetailPending') : t('app.closeConfirmDetail')}
        </p>

        {closing && (
          <Notice tone="info" icon={FiUploadCloud} iconClassName="animate-pulse" compact>
            {t('app.closeInProgress')}
          </Notice>
        )}
      </div>

      <div className="px-5 pb-5 flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleCancel()}
          disabled={closing}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => void handleConfirm()}
          loading={closing}
          loadingText={t('common.closing')}
        >
          {t('common.close')}
        </Button>
      </div>
    </BlockingDialog>
  );
};
