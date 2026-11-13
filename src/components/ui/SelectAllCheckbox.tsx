import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TableHead, TableCell } from './Table';
import { cn } from '../../utils/cn';

const CHECKBOX_CLASS =
  'w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500';

interface SelectAllCheckboxProps {
  itemIds: number[];
  selectedIds: Set<number>;
  onSelectAll: (ids: number[], checked: boolean) => void;
  className?: string;
}

export const SelectAllCheckbox = memo(function SelectAllCheckbox({
  itemIds,
  selectedIds,
  onSelectAll,
  className,
}: SelectAllCheckboxProps) {
  const { t } = useTranslation();
  return (
    <input
      type="checkbox"
      aria-label={t('common.selectAll')}
      checked={itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id))}
      onChange={(e) => onSelectAll(itemIds, e.target.checked)}
      className={cn(CHECKBOX_CLASS, className)}
    />
  );
});

interface RowCheckboxProps {
  id: number;
  selectedIds: Set<number>;
  onSelectOne: (id: number, checked: boolean) => void;
  className?: string;
}

export const RowCheckbox = memo(function RowCheckbox({
  id,
  selectedIds,
  onSelectOne,
  className,
}: RowCheckboxProps) {
  const { t } = useTranslation();
  return (
    <input
      type="checkbox"
      aria-label={t('common.selectRow')}
      checked={selectedIds.has(id)}
      onChange={(e) => onSelectOne(id, e.target.checked)}
      className={cn(CHECKBOX_CLASS, className)}
    />
  );
});

export function SelectAllHeadCell({
  itemIds,
  selectedIds,
  onSelectAll,
  className,
}: SelectAllCheckboxProps) {
  return (
    <TableHead className={cn('w-10', className)}>
      <SelectAllCheckbox itemIds={itemIds} selectedIds={selectedIds} onSelectAll={onSelectAll} />
    </TableHead>
  );
}

export function RowCheckboxCell({ id, selectedIds, onSelectOne, className }: RowCheckboxProps) {
  return (
    <TableCell className={className} onClick={(e) => e.stopPropagation()}>
      <RowCheckbox id={id} selectedIds={selectedIds} onSelectOne={onSelectOne} />
    </TableCell>
  );
}
