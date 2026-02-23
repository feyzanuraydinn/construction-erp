import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface SelectAllCheckboxProps {
  /** IDs of the items currently on the page */
  itemIds: number[];
  /** Currently selected IDs set */
  selectedIds: Set<number>;
  /** Callback when select-all toggles */
  onSelectAll: (ids: number[], checked: boolean) => void;
  /** ClassName override */
  className?: string;
}

/**
 * Reusable select-all checkbox for table headers.
 * Eliminates the duplicated checkbox pattern across listing pages.
 */
export const SelectAllCheckbox = memo(function SelectAllCheckbox({
  itemIds,
  selectedIds,
  onSelectAll,
  className = 'w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500',
}: SelectAllCheckboxProps) {
  const { t } = useTranslation();
  return (
    <input
      type="checkbox"
      aria-label={t('common.selectAll')}
      checked={itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id))}
      onChange={(e) => onSelectAll(itemIds, e.target.checked)}
      className={className}
    />
  );
});

interface RowCheckboxProps {
  /** ID of the row item */
  id: number;
  /** Currently selected IDs set */
  selectedIds: Set<number>;
  /** Callback when individual checkbox toggles */
  onSelectOne: (id: number, checked: boolean) => void;
  /** ClassName override */
  className?: string;
}

/**
 * Reusable row checkbox for table body rows.
 */
export const RowCheckbox = memo(function RowCheckbox({
  id,
  selectedIds,
  onSelectOne,
  className = 'w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500',
}: RowCheckboxProps) {
  const { t } = useTranslation();
  return (
    <input
      type="checkbox"
      aria-label={t('common.selectRow')}
      checked={selectedIds.has(id)}
      onChange={(e) => onSelectOne(id, e.target.checked)}
      className={className}
    />
  );
});
