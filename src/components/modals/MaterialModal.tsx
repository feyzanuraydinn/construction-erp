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
  Textarea,
} from '../ui';
import { MATERIAL_CATEGORIES, MATERIAL_UNITS } from '../../utils/constants';
import { materialSchema } from '../../utils/schemas';
import type { MaterialFormInput } from '../../utils/schemas';
import type { Material } from '../../types';

export interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  onSave: (isNew: boolean) => void;
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

export function MaterialModal({ isOpen, onClose, material, onSave }: MaterialModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
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

  const onSubmit = async (formValues: MaterialFormInput) => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('common.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={material ? t('stock.editMaterial') : t('stock.newMaterial')}>
      <form onSubmit={rhfHandleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
              options={MATERIAL_CATEGORIES}
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
              options={MATERIAL_UNITS}
              value={unit}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue('unit', e.target.value, { shouldValidate: true })
              }
              error={errors.unit?.message}
              required
            />
            <Input
              label={t('stock.form.minStock')}
              type="number"
              step="0.01"
              {...register('min_stock')}
              error={errors.min_stock?.message}
            />
            {!material && (
              <Input
                label={t('stock.form.currentStock')}
                type="number"
                step="0.01"
                {...register('current_stock')}
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
