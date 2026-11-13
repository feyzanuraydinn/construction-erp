import type { TFunction } from 'i18next';
import { categoryLabel } from '../../utils/categories';
import type { Category, SelectOption } from '../../types';

export type OptionList = SelectOption[];

export function categoryOptions(t: TFunction, categories: Category[]): OptionList {
  return categories.map((c) => ({ value: c.id, label: categoryLabel(t, c.name) }));
}

export function companyAccountTypeOptions(t: TFunction): OptionList {
  return [
    { value: 'invoice_out', label: t('companyAccount.types.income') },
    { value: 'invoice_in', label: t('companyAccount.types.expense') },
  ];
}
