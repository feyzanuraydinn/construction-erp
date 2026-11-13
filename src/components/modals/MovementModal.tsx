import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { AmountField } from '../ui/AmountField';
import { formatDateForInput } from '../../utils/formatters';
import { MOVEMENT_TYPES } from '../../utils/constants';
import { stockMovementSchema, type StockMovementFormInput } from '../../utils/schemas';
import type { Material, Project, Company } from '../../types';
import { MOVEMENT_STYLES, materialUnitLabel } from '../../utils/stock';
import { RadioCard } from '../ui/RadioCard';
import { useSaveAction } from '../../hooks/useSaveAction';

export interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  projects: Project[];
  companies: Company[];
  onSave: () => void;
  className?: string;
}

function movementDefaults(): StockMovementFormInput {
  return {
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
}

export function MovementModal({
  isOpen,
  onClose,
  materials,
  projects,
  companies,
  onSave,
  className,
}: MovementModalProps) {
  const { t } = useTranslation();
  const { saving: loading, runSave } = useSaveAction();

  const {
    register,
    control,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockMovementFormInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: movementDefaults(),
    mode: 'onBlur',
  });

  const movementType = watch('movement_type');
  const materialId = watch('material_id');
  const projectId = watch('project_id');
  const companyId = watch('company_id');

  useEffect(() => {
    if (isOpen) {
      reset(movementDefaults());
    }
  }, [isOpen, reset]);

  const onSubmit = (formValues: StockMovementFormInput) =>
    runSave(async () => {
      const parsed = stockMovementSchema.parse(formValues);

      await window.electronAPI.stock.create({
        ...parsed,
        project_id: parsed.project_id ?? undefined,
        company_id: parsed.company_id ?? undefined,
        unit_price: parsed.unit_price ?? undefined,
        description: parsed.description ?? undefined,
        document_no: parsed.document_no ?? undefined,
      });
      onSave();
    });

  const selectedMaterial = materials.find((m) => m.id === parseInt(String(materialId)));

  return (
    <Modal
      className={className}
      isOpen={isOpen}
      onClose={onClose}
      title={t('stock.stockMovement')}
      size="md"
    >
      <form
        onSubmit={rhfHandleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {MOVEMENT_TYPES.map((type) => (
              <RadioCard
                key={type.value}
                name="movement_type_radio"
                value={type.value}
                checked={movementType === type.value}
                onSelect={() => setValue('movement_type', type.value, { shouldValidate: true })}
                selectedClassName={MOVEMENT_STYLES[type.value].selectedClass}
                cardClassName="p-2 text-center text-sm"
              >
                {t(`enums.movementTypeShort.${type.value}`)}
              </RadioCard>
            ))}
          </div>
          {errors.movement_type && (
            <p className="text-sm text-red-500 dark:text-red-400">{errors.movement_type.message}</p>
          )}

          <Select
            label={t('stock.form.material')}
            options={materials.map((m) => ({
              value: m.id,
              label: t('stock.form.materialOption', {
                code: m.code,
                name: m.name,
                stock: m.current_stock,
                unit: materialUnitLabel(t, m.unit),
              }),
            }))}
            value={String(materialId ?? '')}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setValue('material_id', e.target.value, { shouldValidate: true })
            }
            error={errors.material_id?.message}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <AmountField
              control={control}
              name="quantity"
              label={`${t('stock.form.quantity')} * ${selectedMaterial ? `(${materialUnitLabel(t, selectedMaterial.unit)})` : ''}`}
              error={errors.quantity?.message}
              required
            />
            {movementType === 'in' && (
              <AmountField
                control={control}
                name="unit_price"
                label={t('stock.form.unitPrice')}
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
