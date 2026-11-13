import { useTranslation } from 'react-i18next';
import type { Category } from '../../types';
import type { InvoiceType } from '../../utils/transactionKinds';
import { categoryLabel } from '../../utils/categories';
import { cn } from '../../utils/cn';
import { REVIEW_SELECT_CLASS } from './ReviewTable';

interface CategorySelectProps {
  categories: Category[];
  type: InvoiceType;
  name: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CategorySelect({
  categories,
  type,
  name,
  value,
  onChange,
  className,
}: CategorySelectProps) {
  const { t } = useTranslation();
  return (
    <select
      className={cn(REVIEW_SELECT_CLASS, className)}
      aria-label={t('dataReview.unmatched.categoryFor', { name })}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{t('dataReview.unmatched.chooseCategory')}</option>
      {categories
        .filter((c) => c.type === type)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {categoryLabel(t, c.name)}
          </option>
        ))}
    </select>
  );
}
