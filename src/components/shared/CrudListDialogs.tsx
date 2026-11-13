import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ExportPreviewModal } from '../modals/ExportPreviewModal';

interface CrudDialogState {
  deleteConfirm: unknown;
  bulkDeleteConfirm: boolean;
  setBulkDeleteConfirm: (open: boolean) => void;
  handleBulkDelete: () => Promise<void>;
  selectedIds: Set<number>;
  exportPreviewOpen: boolean;
  setExportPreviewOpen: (open: boolean) => void;
  exportPreviewData: Record<string, string>[];
  handleExport: (selectedIndices?: number[]) => void;
}

interface CrudListDialogsProps {
  crud: CrudDialogState;
  keyPrefix: 'companies' | 'projects';
  deleteMessage: string;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export function CrudListDialogs({
  crud,
  keyPrefix,
  deleteMessage,
  onCancelDelete,
  onConfirmDelete,
}: CrudListDialogsProps) {
  const { t } = useTranslation();
  const count = crud.selectedIds.size;
  return (
    <>
      <ConfirmDialog
        isOpen={!!crud.deleteConfirm}
        onClose={onCancelDelete}
        onConfirm={onConfirmDelete}
        title={t(`${keyPrefix}.deleteTitle`)}
        message={deleteMessage}
        type="danger"
        confirmText={t('common.delete')}
      />
      <ConfirmDialog
        isOpen={crud.bulkDeleteConfirm}
        onClose={() => crud.setBulkDeleteConfirm(false)}
        onConfirm={() => crud.handleBulkDelete()}
        title={t(`${keyPrefix}.bulkDeleteTitle`)}
        message={t(`${keyPrefix}.bulkDeleteMessage`, { count })}
        type="danger"
        confirmText={t(`${keyPrefix}.bulkDeleteConfirm`, { count })}
      />
      <ExportPreviewModal
        isOpen={crud.exportPreviewOpen}
        onClose={() => crud.setExportPreviewOpen(false)}
        data={crud.exportPreviewData}
        onExport={(selectedIndices) => crud.handleExport(selectedIndices)}
        mode="selection"
      />
    </>
  );
}
