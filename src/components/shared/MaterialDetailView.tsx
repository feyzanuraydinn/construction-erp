import { useTranslation } from 'react-i18next';
import { FiEdit2, FiPackage, FiAlertTriangle } from 'react-icons/fi';
import { Modal, ModalBody, ModalFooter, Button, Badge } from '../ui';
import { formatNumber, formatDate } from '../../utils/formatters';
import { MATERIAL_CATEGORIES, MATERIAL_UNITS } from '../../utils/constants';
import type { Material } from '../../types';

interface MaterialDetailViewProps {
  material: Material | null;
  onClose: () => void;
  onEdit: (material: Material) => void;
}

export function MaterialDetailView({
  material,
  onClose,
  onEdit,
}: MaterialDetailViewProps) {
  const { t } = useTranslation();

  if (!material) return null;

  const isLowStock = material.current_stock < material.min_stock;
  const categoryLabel = MATERIAL_CATEGORIES.find((c) => c.value === material.category)?.label;
  const unitLabel = MATERIAL_UNITS.find((u) => u.value === material.unit)?.label;

  return (
    <Modal
      isOpen={!!material}
      onClose={onClose}
      title={t('stock.detail.title')}
      size="md"
    >
      <ModalBody>
        <div className="space-y-4">
          {/* Header: Code + Status */}
          <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <FiPackage className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{material.name}</p>
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{material.code}</p>
              </div>
            </div>
            {isLowStock ? (
              <Badge variant="danger" className="text-sm px-3 py-1.5">
                <FiAlertTriangle size={14} className="mr-1" /> {t('stock.table.critical')}
              </Badge>
            ) : (
              <Badge variant="success" className="text-sm px-3 py-1.5">
                {t('stock.table.normal')}
              </Badge>
            )}
          </div>

          {/* Stock Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stock.table.currentStock')}</p>
              <p className={`text-xl font-bold ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {formatNumber(material.current_stock, 2)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stock.table.minStock')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(material.min_stock, 2)}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">{t('stock.form.category')}</p>
              <p className="font-medium">{categoryLabel ? t(categoryLabel, material.category || '-') : '-'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">{t('stock.table.unit')}</p>
              <p className="font-medium">{unitLabel ? t(unitLabel, material.unit) : material.unit}</p>
            </div>
            {material.notes && (
              <div className="col-span-2">
                <p className="text-gray-500 dark:text-gray-400">{t('stock.form.notes')}</p>
                <p className="font-medium">{material.notes}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 dark:text-gray-400">{t('stock.detail.createdAt')}</p>
              <p className="font-medium">{formatDate(material.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">{t('stock.detail.updatedAt')}</p>
              <p className="font-medium">{formatDate(material.updated_at)}</p>
            </div>
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
