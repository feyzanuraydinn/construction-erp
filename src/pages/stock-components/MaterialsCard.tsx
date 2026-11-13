import { useTranslation } from 'react-i18next';
import { FiPlus, FiPackage } from 'react-icons/fi';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectAllHeadCell, RowCheckboxCell } from '../../components/ui/SelectAllCheckbox';
import { RowActions } from '../../components/ui/RowActions';
import { StockStatusBadge } from '../../components/shared/StockBadges';
import type { UsePaginationReturn } from '../../hooks/usePagination';
import { formatNumber } from '../../utils/formatters';
import { isLowStock, materialCategoryLabel, materialUnitLabel } from '../../utils/stock';
import type { Material } from '../../types';
import { StockListCard } from './StockListCard';
import type { StockBulkSelection } from './stockBulkDelete';

interface MaterialsCardProps {
  loading: boolean;
  materials: Material[];
  totalCount: number;
  pagination: UsePaginationReturn;
  selection: StockBulkSelection;
  onNew: () => void;
  onOpen: (material: Material) => void;
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
  className?: string;
}

export function MaterialsCard({
  loading,
  materials,
  totalCount,
  pagination,
  selection,
  onNew,
  onOpen,
  onEdit,
  onDelete,
  className,
}: MaterialsCardProps) {
  const { t } = useTranslation();
  return (
    <StockListCard
      loading={loading}
      itemCount={totalCount}
      pagination={pagination}
      className={className}
      emptyState={
        <EmptyState
          icon={FiPackage}
          title={t('stock.noMaterials')}
          description={t('stock.noMaterialsDesc')}
          action={onNew}
          actionLabel={t('stock.newMaterial')}
          actionIcon={FiPlus}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow hover={false}>
            <SelectAllHeadCell
              itemIds={materials.map((m) => m.id)}
              selectedIds={selection.selectedIds}
              onSelectAll={selection.handleSelectAll}
            />
            <TableHead>{t('stock.table.code')}</TableHead>
            <TableHead>{t('stock.table.materialName')}</TableHead>
            <TableHead>{t('stock.table.category')}</TableHead>
            <TableHead>{t('stock.table.unit')}</TableHead>
            <TableHead className="text-right">{t('stock.table.currentStock')}</TableHead>
            <TableHead className="text-right">{t('stock.table.minStock')}</TableHead>
            <TableHead className="text-center">{t('stock.table.status')}</TableHead>
            <TableHead className="text-center">{t('stock.table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((material) => {
            const low = isLowStock(material);
            return (
              <TableRow
                key={material.id}
                selected={selection.selectedIds.has(material.id)}
                onClick={() => onOpen(material)}
              >
                <RowCheckboxCell
                  id={material.id}
                  selectedIds={selection.selectedIds}
                  onSelectOne={selection.handleSelectOne}
                />
                <TableCell>
                  <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                    {material.code}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {material.name}
                  </span>
                </TableCell>
                <TableCell>{materialCategoryLabel(t, material.category)}</TableCell>
                <TableCell>{materialUnitLabel(t, material.unit)}</TableCell>
                <TableCell
                  className={`text-right font-medium ${low ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}
                >
                  {formatNumber(material.current_stock, 2)}
                </TableCell>
                <TableCell className="text-right text-gray-500 dark:text-gray-400">
                  {formatNumber(material.min_stock, 2)}
                </TableCell>
                <TableCell className="text-center">
                  <StockStatusBadge low={low} />
                </TableCell>
                <TableCell>
                  <RowActions onEdit={() => onEdit(material)} onDelete={() => onDelete(material)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </StockListCard>
  );
}
