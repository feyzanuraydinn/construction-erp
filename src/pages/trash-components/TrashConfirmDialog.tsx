import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { TrashItem } from '../../types';

export interface TrashDialogState {
  open: boolean;
  type: string;
  item: TrashItem | null;
}

type TrashDialogKind = 'restore' | 'delete' | 'empty';

interface TrashDialogConfig {
  title: string;
  confirmText: string;
  type: 'success' | 'danger';
}

const DIALOG_CONFIG: Record<TrashDialogKind, TrashDialogConfig> = {
  restore: { title: 'trash.restoreTitle', confirmText: 'trash.restoreConfirm', type: 'success' },
  delete: {
    title: 'trash.permanentDeleteTitle',
    confirmText: 'trash.permanentDeleteConfirm',
    type: 'danger',
  },
  empty: { title: 'trash.emptyTrashTitle', confirmText: 'trash.emptyTrashConfirm', type: 'danger' },
};

interface TrashConfirmDialogProps {
  kind: TrashDialogKind;
  state: TrashDialogState;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  className?: string;
}

export function TrashConfirmDialog({
  kind,
  state,
  message,
  onClose,
  onConfirm,
  className,
}: TrashConfirmDialogProps) {
  const { t } = useTranslation();
  const config = DIALOG_CONFIG[kind];
  return (
    <ConfirmDialog
      isOpen={state.open && state.type === kind}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t(config.title)}
      message={message}
      confirmText={t(config.confirmText)}
      type={config.type}
      className={className}
    />
  );
}
