import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2 } from 'react-icons/fi';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import type { RestoreProblem } from '../database/repositories/trashBundle';
import type { TrashItem } from '../types';
import { useLoadedData } from '../hooks/useLoadedData';
import { NO_ITEMS } from '../utils/emptyList';
import { PageHeader } from '../components/shared/PageHeader';
import { Notice } from '../components/ui/Notice';
import { getTrashItemName } from './trash-components/trashItemName';
import { TrashTable } from './trash-components/TrashTable';
import { TrashConfirmDialog, type TrashDialogState } from './trash-components/TrashConfirmDialog';

const RESTORE_ERROR_KEYS: Record<RestoreProblem, string> = {
  parent_missing: 'trash.restoreParentMissing',
  not_found: 'trash.restoreNotFound',
  invalid_data: 'trash.restoreInvalidData',
  unknown_type: 'trash.restoreUnknownType',
  failed: 'trash.restoreError',
};

const loadTrashItems = () => window.electronAPI.trash.getAll();

function Trash() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, loading, reload: loadTrash } = useLoadedData(loadTrashItems, 'Trash load error:');
  const items = data ?? NO_ITEMS;
  const [confirmDialog, setConfirmDialog] = useState<TrashDialogState>({
    open: false,
    type: '',
    item: null,
  });

  const closeConfirmDialog = () => setConfirmDialog({ open: false, type: '', item: null });

  const handleRestoreClick = (item: TrashItem) => {
    setConfirmDialog({ open: true, type: 'restore', item });
  };

  const handleRestoreConfirm = async () => {
    if (!confirmDialog.item) return;
    try {
      const result = await window.electronAPI.trash.restore(confirmDialog.item.id);
      closeConfirmDialog();
      if (!result.success) {
        if (result.detail) console.error('Restore failed:', result.detail);
        toast.error(t(RESTORE_ERROR_KEYS[result.error ?? 'failed']));
        return;
      }
      toast.success(t('trash.restoreSuccess'));
      loadTrash();
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(t('trash.restoreError'));
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDialog.item) return;
    try {
      await window.electronAPI.trash.permanentDelete(confirmDialog.item.id);
      closeConfirmDialog();
      toast.success(t('trash.permanentDeleteSuccess'));
      loadTrash();
    } catch (error) {
      console.error('Permanent delete error:', error);
      toast.error(t('trash.permanentDeleteError'));
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await window.electronAPI.trash.empty();
      closeConfirmDialog();
      toast.success(t('trash.emptyTrashSuccess'));
      loadTrash();
    } catch (error) {
      console.error('Empty trash error:', error);
      toast.error(t('trash.emptyTrashError'));
    }
  };

  const dialogItemName = confirmDialog.item ? getTrashItemName(t, confirmDialog.item) : '';

  return (
    <div className="page-container">
      <PageHeader title={t('trash.title')} subtitle={t('trash.subtitle')}>
        {items.length > 0 && (
          <Button
            variant="danger"
            icon={FiTrash2}
            onClick={() => setConfirmDialog({ open: true, type: 'empty', item: null })}
          >
            {t('trash.emptyTrash')}
          </Button>
        )}
      </PageHeader>

      {items.length > 0 && (
        <Notice role="note" className="p-4 mb-6">
          <p className="font-medium">{t('trash.warning')}</p>
          <p>{t('trash.warningMessage')}</p>
        </Notice>
      )}

      <Card>
        <CardHeader>
          <h3 className="font-semibold">{t('trash.deletedItems', { count: items.length })}</h3>
        </CardHeader>
        <CardBody>
          {loading ? (
            <LoadingSpinner className="p-8" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FiTrash2}
              title={t('trash.empty')}
              description={t('trash.emptyDesc')}
            />
          ) : (
            <TrashTable
              items={items}
              onRestore={handleRestoreClick}
              onDelete={(item) => setConfirmDialog({ open: true, type: 'delete', item })}
            />
          )}
        </CardBody>
      </Card>

      <TrashConfirmDialog
        kind="restore"
        state={confirmDialog}
        onClose={closeConfirmDialog}
        onConfirm={handleRestoreConfirm}
        message={t('trash.restoreMessage', { name: dialogItemName })}
      />

      <TrashConfirmDialog
        kind="delete"
        state={confirmDialog}
        onClose={closeConfirmDialog}
        onConfirm={handlePermanentDelete}
        message={t('trash.permanentDeleteMessage', { name: dialogItemName })}
      />

      <TrashConfirmDialog
        kind="empty"
        state={confirmDialog}
        onClose={closeConfirmDialog}
        onConfirm={handleEmptyTrash}
        message={t('trash.emptyTrashMessage', { count: items.length })}
      />
    </div>
  );
}

export default Trash;
