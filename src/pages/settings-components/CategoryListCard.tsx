import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import { Button } from '../../components/ui/Button';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';
import type { Category } from '../../types';
import { categoryLabel } from '../../utils/categories';
import { cn } from '../../utils/cn';
import { SettingsCard } from './SettingsCard';
import { CATEGORY_TYPES, categoriesOfType } from './settingsOptions';

interface CategoryRowProps {
  category: Category;
  onDelete: (id: number) => void;
  className?: string;
}

function CategoryRow({ category, onDelete, className }: CategoryRowProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="w-4 h-4 rounded" style={{ backgroundColor: category.color }} />
        <span className="text-sm">{categoryLabel(t, category.name)}</span>
        {category.is_default === 1 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ({t('settings.defaultLabel')})
          </span>
        )}
      </div>
      {category.is_default !== 1 && (
        <Button
          variant="ghost-danger"
          size="icon"
          icon={FiX}
          onClick={() => onDelete(category.id)}
          className="!p-1"
          aria-label={t('common.delete')}
        />
      )}
    </div>
  );
}

interface CategoryListCardProps {
  categories: Category[];
  onDelete: (id: number) => void;
  className?: string;
}

export function CategoryListCard({ categories, onDelete, className }: CategoryListCardProps) {
  const { t } = useTranslation();
  const categoryTypeOptions = useTranslatedOptions(CATEGORY_TYPES);
  return (
    <SettingsCard title={t('settings.existingCategories')} className={className}>
      <div className="max-h-[400px] overflow-y-auto">
        {categoryTypeOptions.map((type) => {
          const items = categoriesOfType(categories, type.value);
          return (
            <div key={type.value}>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                {type.label}
              </div>
              {items.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500">
                  {t('settings.noCategories')}
                </div>
              ) : (
                items.map((category) => (
                  <CategoryRow key={category.id} category={category} onDelete={onDelete} />
                ))
              )}
            </div>
          );
        })}
      </div>
    </SettingsCard>
  );
}
