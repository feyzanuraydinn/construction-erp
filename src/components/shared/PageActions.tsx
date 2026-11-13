import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiShare2, FiPrinter, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button } from '../ui/Button';
import { Divider } from '../ui/Divider';
import { cn } from '../../utils/cn';

interface PageActionsProps {
  onExport: () => void;
  onShare: () => void;
  onPrint?: () => void;
  onNew?: () => void;
  newLabel?: string;
  leading?: ReactNode;
  className?: string;
}

export function PageActions({
  onExport,
  onShare,
  onPrint,
  onNew,
  newLabel,
  leading,
  className = '',
}: PageActionsProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {leading}
      <Button variant="secondary" icon={FiDownload} onClick={onExport}>
        {t('common.exportToExcel')}
      </Button>
      <Button variant="secondary" icon={FiShare2} onClick={onShare}>
        {t('common.share')}
      </Button>
      {onPrint && (
        <Button variant="secondary" icon={FiPrinter} onClick={onPrint}>
          {t('common.print')}
        </Button>
      )}
      {onNew && (
        <Button icon={FiPlus} onClick={onNew}>
          {newLabel}
        </Button>
      )}
    </div>
  );
}

interface BulkDeleteActionProps {
  count: number;
  label: string;
  onClick: () => void;
  divider: 'before' | 'after';
  className?: string;
}

export function BulkDeleteAction({
  count,
  label,
  onClick,
  divider,
  className,
}: BulkDeleteActionProps) {
  if (count === 0) return null;
  return (
    <>
      {divider === 'before' && <Divider />}
      <Button
        variant="ghost-danger"
        size="sm"
        icon={FiTrash2}
        onClick={onClick}
        className={className}
      >
        {label}
      </Button>
      {divider === 'after' && <Divider />}
    </>
  );
}
