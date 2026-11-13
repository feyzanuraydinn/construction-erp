import { useTranslation } from 'react-i18next';
import { FiPackage } from 'react-icons/fi';
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
import { MovementTypeBadge } from '../../components/shared/StockBadges';
import type { UsePaginationReturn } from '../../hooks/usePagination';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { materialUnitLabel, MOVEMENT_STYLES } from '../../utils/stock';
import type { StockMovementWithDetails } from '../../types';
import { StockListCard } from './StockListCard';
import type { StockBulkSelection } from './stockBulkDelete';

interface MovementsCardProps {
  loading: boolean;
  movements: StockMovementWithDetails[];
  totalCount: number;
  pagination: UsePaginationReturn;
  selection: StockBulkSelection;
  onNew: () => void;
  className?: string;
}

export function MovementsCard({
  loading,
  movements,
  totalCount,
  pagination,
  selection,
  onNew,
  className,
}: MovementsCardProps) {
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
          title={t('stock.noMovements')}
          action={onNew}
          actionLabel={t('stock.newMovement')}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow hover={false}>
            <SelectAllHeadCell
              itemIds={movements.map((m) => m.id)}
              selectedIds={selection.selectedIds}
              onSelectAll={selection.handleSelectAll}
            />
            <TableHead>{t('stock.table.date')}</TableHead>
            <TableHead>{t('stock.table.type')}</TableHead>
            <TableHead>{t('stock.table.material')}</TableHead>
            <TableHead className="text-right">{t('stock.table.quantity')}</TableHead>
            <TableHead>{t('stock.table.project')}</TableHead>
            <TableHead>{t('stock.table.supplier')}</TableHead>
            <TableHead className="text-right">{t('stock.table.amount')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id} selected={selection.selectedIds.has(movement.id)}>
              <RowCheckboxCell
                id={movement.id}
                selectedIds={selection.selectedIds}
                onSelectOne={selection.handleSelectOne}
              />
              <TableCell>{formatDate(movement.date)}</TableCell>
              <TableCell>
                <MovementTypeBadge type={movement.movement_type} />
              </TableCell>
              <TableCell>
                <span className="font-medium">{movement.material_name}</span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {movement.material_code}
                </span>
              </TableCell>
              <TableCell
                className={`text-right font-medium ${MOVEMENT_STYLES[movement.movement_type].amountClass}`}
              >
                {MOVEMENT_STYLES[movement.movement_type].sign}
                {formatNumber(movement.quantity, 2)} {materialUnitLabel(t, movement.material_unit)}
              </TableCell>
              <TableCell>{movement.project_name || '-'}</TableCell>
              <TableCell>{movement.company_name || '-'}</TableCell>
              <TableCell className="text-right">
                {movement.total_price ? formatCurrency(movement.total_price) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </StockListCard>
  );
}
