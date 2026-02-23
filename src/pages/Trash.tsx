import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
  ConfirmDialog,
  LoadingSpinner,
} from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { formatDate, formatCurrency } from '../utils/formatters';
import type { TrashItem, BadgeVariant } from '../types';

interface ConfirmDialogState {
  open: boolean;
  type: string;
  item: TrashItem | null;
}

const TYPE_COLORS: Record<string, BadgeVariant> = {
  company: 'info',
  project: 'purple',
  transaction: 'success',
  material: 'warning',
};

function Trash() {
  const { t } = useTranslation();
  const toast = useToast();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    type: '',
    item: null,
  });

  const TYPE_LABELS: Record<string, string> = {
    company: t('trash.typeLabels.company'),
    project: t('trash.typeLabels.project'),
    transaction: t('trash.typeLabels.transaction'),
    material: t('trash.typeLabels.material'),
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    try {
      const data = await window.electronAPI.trash.getAll();
      setItems(data);
    } catch (error) {
      console.error('Trash load error:', error);
      toast.error(t('common.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (item: TrashItem) => {
    setConfirmDialog({ open: true, type: 'restore', item });
  };

  const handleRestoreConfirm = async () => {
    if (!confirmDialog.item) return;
    try {
      await window.electronAPI.trash.restore(confirmDialog.item.id);
      setConfirmDialog({ open: false, type: '', item: null });
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
      setConfirmDialog({ open: false, type: '', item: null });
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
      setConfirmDialog({ open: false, type: '', item: null });
      toast.success(t('trash.emptyTrashSuccess'));
      loadTrash();
    } catch (error) {
      console.error('Empty trash error:', error);
      toast.error(t('trash.emptyTrashError'));
    }
  };

  const getItemName = (item: TrashItem): string => {
    try {
      const data = JSON.parse(item.data);
      switch (item.type) {
        case 'company':
          return data.name;
        case 'project':
          return data.name;
        case 'transaction':
          return `${data.description || t('trash.transactionLabel')} - ${formatCurrency(data.amount)}`;
        case 'material':
          return data.name;
        default:
          return t('trash.unknown');
      }
    } catch {
      return t('trash.unknown');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('trash.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {t('trash.subtitle')}
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="danger"
            icon={FiTrash2}
            onClick={() => setConfirmDialog({ open: true, type: 'empty', item: null })}
          >
            {t('trash.emptyTrash')}
          </Button>
        )}
      </div>

      {/* Warning */}
      {items.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FiAlertTriangle className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">{t('trash.warning')}</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('trash.warningMessage')}
            </p>
          </div>
        </div>
      )}

      {/* Trash List */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">{t('trash.deletedItems', { count: items.length })}</h3>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <LoadingSpinner className="p-8" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FiTrash2}
              title={t('trash.empty')}
              description={t('trash.emptyDesc')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>{t('trash.table.type')}</TableHead>
                  <TableHead>{t('trash.table.item')}</TableHead>
                  <TableHead>{t('trash.table.deletedAt')}</TableHead>
                  <TableHead> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={TYPE_COLORS[item.type] || 'default'}>
                        {TYPE_LABELS[item.type] || item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{getItemName(item)}</span>
                    </TableCell>
                    <TableCell>{formatDate(item.deleted_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost-success"
                          size="icon"
                          icon={FiRefreshCw}
                          onClick={() => handleRestoreClick(item)}
                          title={t('common.restore')}
                        />
                        <Button
                          variant="ghost-danger"
                          size="icon"
                          icon={FiTrash2}
                          onClick={() => setConfirmDialog({ open: true, type: 'delete', item })}
                          title={t('common.delete')}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Confirm Dialog - Restore */}
      <ConfirmDialog
        isOpen={confirmDialog.open && confirmDialog.type === 'restore'}
        onClose={() => setConfirmDialog({ open: false, type: '', item: null })}
        onConfirm={handleRestoreConfirm}
        title={t('trash.restoreTitle')}
        message={t('trash.restoreMessage', { name: confirmDialog.item ? getItemName(confirmDialog.item) : '' })}
        confirmText={t('trash.restoreConfirm')}
        type="success"
      />

      {/* Confirm Dialog - Permanent Delete */}
      <ConfirmDialog
        isOpen={confirmDialog.open && confirmDialog.type === 'delete'}
        onClose={() => setConfirmDialog({ open: false, type: '', item: null })}
        onConfirm={handlePermanentDelete}
        title={t('trash.permanentDeleteTitle')}
        message={t('trash.permanentDeleteMessage', { name: confirmDialog.item ? getItemName(confirmDialog.item) : '' })}
        confirmText={t('trash.permanentDeleteConfirm')}
        type="danger"
      />

      {/* Confirm Dialog - Empty Trash */}
      <ConfirmDialog
        isOpen={confirmDialog.open && confirmDialog.type === 'empty'}
        onClose={() => setConfirmDialog({ open: false, type: '', item: null })}
        onConfirm={handleEmptyTrash}
        title={t('trash.emptyTrashTitle')}
        message={t('trash.emptyTrashMessage', { count: items.length })}
        confirmText={t('trash.emptyTrashConfirm')}
        type="danger"
      />
    </div>
  );
}

export default Trash;
