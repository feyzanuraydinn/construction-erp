import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { AmountField } from '../ui/AmountField';
import { MATERIAL_CATEGORIES, MATERIAL_UNITS } from '../../utils/constants';
import { materialSchema, type MaterialFormInput } from '../../utils/schemas';
import type { Material } from '../../types';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';
import { useSaveAction } from '../../hooks/useSaveAction';

export interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  onSave: (isNew: boolean) => void;
  className?: string;
}

const materialDefaults: MaterialFormInput = {
  code: '',
  name: '',
  category: '',
  unit: 'adet',
  min_stock: '',
  current_stock: '0',
  notes: '',
};

export function MaterialModal({
  isOpen,
  onClose,
  material,
  onSave,
  className,
}: MaterialModalProps) {
  const { t } = useTranslation();
  const categoryOptions = useTranslatedOptions(MATERIAL_CATEGORIES);
  const unitOptions = useTranslatedOptions(MATERIAL_UNITS);
  const { saving: loading, runSave } = useSaveAction();

  const {
    register,
    control,
    handleSubmit: rhfHandleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MaterialFormInput>({
    resolver: zodResolver(materialSchema),
    defaultValues: materialDefaults,
    mode: 'onBlur',
  });

  const category = watch('category');
  const unit = watch('unit');

  useEffect(() => {
    const initForm = async () => {
      if (material) {
        reset({
          code: material.code,
          name: material.name,
          category: material.category || '',
          unit: material.unit,
          min_stock: material.min_stock ? String(material.min_stock) : '',
          current_stock: material.current_stock ? String(material.current_stock) : '',
          notes: material.notes || '',
        });
      } else {
        const code = await window.electronAPI.material.generateCode();
        reset({ ...materialDefaults, code });
      }
    };
    if (isOpen) initForm();
  }, [material, isOpen, reset]);

  const onSubmit = (formValues: MaterialFormInput) =>
    runSave(async () => {
      const parsed = materialSchema.parse(formValues);
      const data = {
        ...parsed,
        category: parsed.category ?? undefined,
        notes: parsed.notes ?? undefined,
      };

      if (material) {
        await window.electronAPI.material.update(material.id, data);
        onSave(false);
      } else {
        await window.electronAPI.material.create(data);
        onSave(true);
      }
    });

  return (
    <Modal
      className={className}
      isOpen={isOpen}
      onClose={onClose}
      title={material ? t('stock.editMaterial') : t('stock.newMaterial')}
    >
      <form
        onSubmit={rhfHandleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('stock.form.materialCode')}
              {...register('code')}
              error={errors.code?.message}
              disabled={!!material}
            />
            <Select
              label={t('stock.form.category')}
              options={categoryOptions}
              value={category ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('category', e.target.value, { shouldValidate: true })
              }
              error={errors.category?.message}
              required
            />
          </div>

          <Input
            label={t('stock.form.materialName')}
            {...register('name')}
            error={errors.name?.message}
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <Select
              label={t('stock.form.unit')}
              options={unitOptions}
              value={unit}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('unit', e.target.value, { shouldValidate: true })
              }
              error={errors.unit?.message}
              required
            />
            <AmountField
              control={control}
              name="min_stock"
              label={t('stock.form.minStock')}
              error={errors.min_stock?.message}
            />
            {!material && (
              <AmountField
                control={control}
                name="current_stock"
                label={t('stock.form.currentStock')}
                error={errors.current_stock?.message}
              />
            )}
          </div>

          <Textarea
            label={t('stock.form.notes')}
            {...register('notes')}
            error={errors.notes?.message}
            rows={2}
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
