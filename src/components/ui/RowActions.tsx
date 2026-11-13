import { useTranslation } from 'react-i18next';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function RowActions({ onEdit, onDelete, className = '' }: RowActionsProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn('flex items-center justify-center gap-1', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost-warning"
        size="icon"
        icon={FiEdit2}
        onClick={onEdit}
        title={t('common.edit')}
      />
      <Button
        variant="ghost-danger"
        size="icon"
        icon={FiTrash2}
        onClick={onDelete}
        title={t('common.delete')}
      />
    </div>
  );
}
