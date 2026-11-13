import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Category } from '../../../types';
import type { InvoiceType } from '../../../utils/transactionKinds';
import { defaultDocumentCategory, type RestChoice } from './formState';

interface RestChoiceOptions {
  initial: RestChoice | null;
  advanceAllowed: boolean;
  categories: Category[];
  documentType: InvoiceType;
}

export type RestChoiceState = ReturnType<typeof useRestChoice>;

export function useRestChoice({
  initial,
  advanceAllowed,
  categories,
  documentType,
}: RestChoiceOptions) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState(initial);
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const choice = advanceAllowed || chosen !== 'advance' ? chosen : null;
  const documentCategories = categories.filter((c) => c.type === documentType);

  const choose = (next: RestChoice) => {
    setChosen(next);
    setError(null);
    if (next === 'document' && !categoryId)
      setCategoryId(defaultDocumentCategory(documentCategories, documentType));
  };

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setError(null);
  };

  const reset = () => {
    setChosen(null);
    setCategoryId('');
    setError(null);
  };

  const validate = (required: boolean): boolean => {
    let problem: string | null = null;
    if (required && choice === null) problem = t('transactionModal.restChoiceRequired');
    else if (required && choice === 'document' && !categoryId)
      problem = t('transactionModal.restCategoryRequired');
    setError(problem);
    return problem === null;
  };

  return {
    choice,
    categoryId,
    error,
    advanceAllowed,
    documentCategories,
    choose,
    selectCategory,
    reset,
    validate,
  };
}
