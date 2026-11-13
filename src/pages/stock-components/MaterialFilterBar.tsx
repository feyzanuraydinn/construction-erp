import { useTranslation } from 'react-i18next';
import { ListFilterBar } from '../../components/shared/ListFilterBar';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';
import { MATERIAL_CATEGORIES } from '../../utils/constants';
import { STOCK_STATUS_OPTIONS } from './materialFilters';

interface MaterialFilterBarProps {
  search: string;
  onSearch: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  className?: string;
}

export function MaterialFilterBar({
  search,
  onSearch,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  className,
}: MaterialFilterBarProps) {
  const { t } = useTranslation();
  const categoryOptions = useTranslatedOptions(MATERIAL_CATEGORIES);
  const statusOptions = useTranslatedOptions(STOCK_STATUS_OPTIONS);
  return (
    <ListFilterBar
      search={search}
      onSearch={onSearch}
      searchPlaceholder={t('stock.searchPlaceholder')}
      filters={[
        {
          value: category,
          onChange: onCategoryChange,
          options: categoryOptions,
          placeholder: t('stock.filterCategory'),
        },
        {
          value: status,
          onChange: onStatusChange,
          options: statusOptions,
          placeholder: t('stock.filterStatus'),
        },
      ]}
      className={className}
    />
  );
}
