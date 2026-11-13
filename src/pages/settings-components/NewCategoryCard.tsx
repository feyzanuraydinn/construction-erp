import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus } from 'react-icons/fi';
import { Button } from '../../components/ui/Button';
import { Input, Select, FieldLabel } from '../../components/ui/Input';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';
import { pickOption } from '../../utils/typeGuards';
import { cn } from '../../utils/cn';
import { SettingsCard } from './SettingsCard';
import { CATEGORY_COLORS, CATEGORY_TYPES, type NewCategory } from './settingsOptions';

interface NewCategoryCardProps {
  value: NewCategory;
  onChange: (value: NewCategory) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
}

export function NewCategoryCard({ value, onChange, onSubmit, className }: NewCategoryCardProps) {
  const { t } = useTranslation();
  const categoryTypeOptions = useTranslatedOptions(CATEGORY_TYPES);
  return (
    <SettingsCard title={t('settings.newCategory')} className={className}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label={t('settings.categoryName')}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder={t('settings.categoryNamePlaceholder')}
          required
        />
        <Select
          label={t('settings.categoryType')}
          options={categoryTypeOptions}
          value={value.type}
          onChange={(e) =>
            onChange({ ...value, type: pickOption(CATEGORY_TYPES, e.target.value) ?? '' })
          }
          required
        />
        <div>
          <FieldLabel label={t('settings.categoryColor')} />
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ ...value, color })}
                className={cn(
                  'w-8 h-8 rounded-lg transition-transform',
                  value.color === color
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-800 scale-110'
                    : 'hover:scale-105'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <Button type="submit" icon={FiPlus}>
          {t('common.save')}
        </Button>
      </form>
    </SettingsCard>
  );
}
