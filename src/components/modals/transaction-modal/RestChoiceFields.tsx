import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../../ui/Input';
import { formatCurrency } from '../../../utils/formatters';
import { categoryLabel } from '../../../utils/categories';
import { cn } from '../../../utils/cn';
import type { RestChoiceState } from './useRestChoice';

interface RestOptionProps {
  checked: boolean;
  disabled?: boolean;
  onChoose: () => void;
  title: ReactNode;
  hint: ReactNode;
  className?: string;
}

interface RestChoiceFieldsProps {
  rest: RestChoiceState;
  unmatched: number;
  isIncome: boolean;
  className?: string;
}

function RestOption({
  checked,
  disabled = false,
  onChoose,
  title,
  hint,
  className,
}: RestOptionProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-2 text-xs',
        disabled ? 'opacity-60' : 'cursor-pointer',
        className
      )}
    >
      <input
        type="radio"
        name="restChoice"
        checked={checked}
        disabled={disabled}
        onChange={onChoose}
        className="mt-0.5"
      />
      <span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
        <span className="block text-gray-500 dark:text-gray-400">{hint}</span>
      </span>
    </label>
  );
}

export function RestChoiceFields({ rest, unmatched, isIncome, className }: RestChoiceFieldsProps) {
  const { t } = useTranslation();

  return (
    <fieldset
      className={cn('pt-2 space-y-2 border-t border-gray-200 dark:border-gray-700', className)}
    >
      <legend className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {t('transactionModal.restTitle', { amount: formatCurrency(unmatched) })}
      </legend>
      <RestOption
        checked={rest.choice === 'advance'}
        disabled={!rest.advanceAllowed}
        onChoose={() => rest.choose('advance')}
        title={t('transactionModal.restAdvance')}
        hint={
          rest.advanceAllowed
            ? t('transactionModal.restAdvanceHint')
            : t('transactionModal.restAdvanceNoCompany')
        }
      />
      <RestOption
        checked={rest.choice === 'document'}
        onChoose={() => rest.choose('document')}
        title={isIncome ? t('transactionModal.restIncome') : t('transactionModal.restExpense')}
        hint={
          isIncome ? t('transactionModal.restIncomeHint') : t('transactionModal.restExpenseHint')
        }
      />
      {rest.choice === 'document' && (
        <Select
          label={t('transactionModal.restCategory')}
          options={rest.documentCategories.map((c) => ({
            value: c.id,
            label: categoryLabel(t, c.name),
          }))}
          value={rest.categoryId}
          onChange={(e) => rest.selectCategory(e.target.value)}
        />
      )}
      {rest.error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {rest.error}
        </p>
      )}
    </fieldset>
  );
}
