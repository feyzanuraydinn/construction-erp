import { useTranslation } from 'react-i18next';
import { FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';
import type { TrashItem, BadgeVariant } from '../../types';
import { getTrashItemName } from './trashItemName';

const TYPE_COLORS: Record<TrashItem['type'], BadgeVariant> = {
  company: 'info',
  project: 'purple',
  transaction: 'success',
  material: 'warning',
  stock_movement: 'gray',
};

interface TrashTableProps {
  items: TrashItem[];
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
  className?: string;
}

export function TrashTable({ items, onRestore, onDelete, className }: TrashTableProps) {
  const { t } = useTranslation();
  const typeLabels: Record<TrashItem['type'], string> = {
    company: t('trash.typeLabels.company'),
    project: t('trash.typeLabels.project'),
    transaction: t('trash.typeLabels.transaction'),
    material: t('trash.typeLabels.material'),
    stock_movement: t('trash.typeLabels.stock_movement'),
  };

  return (
    <Table className={className}>
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
              <Badge variant={TYPE_COLORS[item.type]}>{typeLabels[item.type]}</Badge>
            </TableCell>
            <TableCell>
              <span className="font-medium">{getTrashItemName(t, item)}</span>
            </TableCell>
            <TableCell>{formatDate(item.deleted_at)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost-success"
                  size="icon"
                  icon={FiRefreshCw}
                  onClick={() => onRestore(item)}
                  title={t('common.restore')}
                />
                <Button
                  variant="ghost-danger"
                  size="icon"
                  icon={FiTrash2}
                  onClick={() => onDelete(item)}
                  title={t('common.delete')}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
