import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
} from '../ui';
import { formatDateForInput } from '../../utils/formatters';
import { MOVEMENT_TYPES } from '../../utils/constants';
import { stockMovementSchema } from '../../utils/schemas';
import type { StockMovementFormInput } from '../../utils/schemas';
import type { Material, Project, Company } from '../../types';

export interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  projects: Project[];
  companies: Company[];
  onSave: (isNew: boolean) => void;
}

export function MovementModal({
  isOpen,
  onClose,
  materials,
  projects,
  companies,
  onSave,
}: MovementModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const movementDefaults: StockMovementFormInput = {
    material_id: '',
    movement_type: 'in',
    quantity: '',
    unit_price: '',
    project_id: '',
    company_id: '',
    date: formatDateForInput(new Date().toISOString()),
    description: '',
    document_no: '',
  };

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockMovementFormInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: movementDefaults,
    mode: 'onBlur',
  });

  const movementType = watch('movement_type');
  const materialId = watch('material_id');
  const projectId = watch('project_id');
  const companyId = watch('company_id');

  useEffect(() => {
    if (isOpen) {
      reset({
        ...movementDefaults,
        date: formatDateForInput(new Date().toISOString()),
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (formValues: StockMovementFormInput) => {
    setLoading(true);
    try {
      const parsed = stockMovementSchema.parse(formValues);

      await window.electronAPI.stock.create({
        ...parsed,
        project_id: parsed.project_id ?? undefined,
        company_id: parsed.company_id ?? undefined,
        unit_price: parsed.unit_price ?? undefined,
        description: parsed.description ?? undefined,
        document_no: parsed.document_no ?? undefined,
      });
      onSave(true);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('common.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const selectedMaterial = materials.find((m) => m.id === parseInt(String(materialId)));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('stock.stockMovement')} size="md">
      <form onSubmit={rhfHandleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ModalBody className="space-y-4">
          {/* Movement Type */}
          <div className="grid grid-cols-4 gap-2">
            {MOVEMENT_TYPES.map((type) => (
              <label key={type.value}>
                <input
                  type="radio"
                  name="movement_type_radio"
                  value={type.value}
                  checked={movementType === type.value}
                  onChange={() =>
                    setValue('movement_type', type.value as 'in' | 'out' | 'adjustment' | 'waste', { shouldValidate: true })
                  }
                  className="sr-only"
                />
                <div
                  className={`p-2 border-2 rounded-lg cursor-pointer text-center text-sm transition-all ${
                    movementType === type.value
                      ? type.value === 'in'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : type.value === 'out'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t(type.label).split(' ')[0]}
                </div>
              </label>
            ))}
          </div>
          {errors.movement_type && (
            <p className="text-sm text-red-500 dark:text-red-400">{errors.movement_type.message}</p>
          )}

          <Select
            label={t('stock.form.material')}
            options={materials.map((m) => ({
              value: m.id,
              label: `${m.code} - ${m.name} (Stok: ${m.current_stock} ${m.unit})`,
            }))}
            value={String(materialId ?? '')}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setValue('material_id', e.target.value, { shouldValidate: true })
            }
            error={errors.material_id?.message}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`${t('stock.form.quantity')} * ${selectedMaterial ? `(${selectedMaterial.unit})` : ''}`}
              type="number"
              step="0.01"
              min="0"
              {...register('quantity')}
              error={errors.quantity?.message}
              required
            />
            {movementType === 'in' && (
              <Input
                label={t('stock.form.unitPrice')}
                type="number"
                step="0.01"
                min="0"
                {...register('unit_price')}
                error={errors.unit_price?.message}
              />
            )}
          </div>

          {movementType === 'in' && (
            <Select
              label={t('stock.form.supplier')}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={String(companyId ?? '')}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('company_id', e.target.value, { shouldValidate: true })
              }
              error={errors.company_id?.message}
              placeholder={t('stock.form.selectSupplier')}
            />
          )}

          {movementType === 'out' && (
            <Select
              label={t('stock.form.project')}
              options={projects.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
              value={String(projectId ?? '')}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('project_id', e.target.value, { shouldValidate: true })
              }
              error={errors.project_id?.message}
              placeholder={t('stock.form.selectProject')}
              required
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('stock.form.date')}
              type="date"
              {...register('date')}
              error={errors.date?.message}
              required
            />
            <Input
              label={t('stock.form.documentNo')}
              {...register('document_no')}
              error={errors.document_no?.message}
              placeholder={t('stock.form.documentPlaceholder')}
            />
          </div>

          <Input
            label={t('stock.form.description')}
            {...register('description')}
            error={errors.description?.message}
          />
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('common.save')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
