import { useTranslation } from 'react-i18next';
import { FiEdit2, FiPackage } from 'react-icons/fi';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StockStatusBadge } from './StockBadges';
import { formatNumber, formatDate } from '../../utils/formatters';
import { isLowStock, materialCategoryLabel, materialUnitLabel } from '../../utils/stock';
import type { Material } from '../../types';
import { DetailField } from './DetailFields';
import { cn } from '../../utils/cn';

interface MaterialDetailViewProps {
  material: Material | null;
  onClose: () => void;
  onEdit: (material: Material) => void;
  className?: string;
}

function StockFigure({
  label,
  value,
  alert = false,
  className,
}: {
  label: string;
  value: string;
  alert?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('p-3 rounded-lg bg-gray-50 dark:bg-gray-800', className)}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p
        className={cn(
          'text-xl font-bold',
          alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MaterialDetailView({
  material,
  onClose,
  onEdit,
  className,
}: MaterialDetailViewProps) {
  const { t } = useTranslation();

  if (!material) return null;

  const low = isLowStock(material);

  return (
    <Modal
      className={className}
      isOpen={!!material}
      onClose={onClose}
      title={t('stock.detail.title')}
      size="md"
    >
      <ModalBody>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <FiPackage className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {material.name}
                </p>
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                  {material.code}
                </p>
              </div>
            </div>
            <StockStatusBadge low={low} large />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StockFigure
              label={t('stock.table.currentStock')}
              value={formatNumber(material.current_stock, 2)}
              alert={low}
            />
            <StockFigure
              label={t('stock.table.minStock')}
              value={formatNumber(material.min_stock, 2)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailField label={t('stock.form.category')}>
              {materialCategoryLabel(t, material.category)}
            </DetailField>
            <DetailField label={t('stock.table.unit')}>
              {materialUnitLabel(t, material.unit)}
            </DetailField>
            {material.notes && (
              <DetailField label={t('stock.form.notes')} wide>
                {material.notes}
              </DetailField>
            )}
            <DetailField label={t('stock.detail.createdAt')}>
              {formatDate(material.created_at)}
            </DetailField>
            <DetailField label={t('stock.detail.updatedAt')}>
              {formatDate(material.updated_at)}
            </DetailField>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          icon={FiEdit2}
          onClick={() => {
            onEdit(material);
            onClose();
          }}
        >
          {t('common.edit')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
