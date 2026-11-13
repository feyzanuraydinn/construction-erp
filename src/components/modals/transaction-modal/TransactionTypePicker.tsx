import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { RadioCard } from '../../ui/RadioCard';
import { cn } from '../../../utils/cn';
import type { TransactionType } from '../../../types';

type TypeColor = 'green' | 'blue' | 'red' | 'orange';

interface TypeOption {
  value: TransactionType;
  label: string;
  color: TypeColor;
  icon?: ReactNode;
}

interface TransactionTypePickerProps {
  isSimple: boolean;
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  className?: string;
}

const COLOR_MAP: Record<TypeColor, string> = {
  green: 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  red: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  orange:
    'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
};

export function TransactionTypePicker({
  isSimple,
  value,
  onChange,
  className,
}: TransactionTypePickerProps) {
  const { t } = useTranslation();

  const options = useMemo<TypeOption[]>(
    () =>
      isSimple
        ? [
            {
              value: 'invoice_out',
              label: t('companyAccount.types.income'),
              color: 'green',
              icon: <FiTrendingUp className="mx-auto mb-2" size={24} />,
            },
            {
              value: 'invoice_in',
              label: t('companyAccount.types.expense'),
              color: 'red',
              icon: <FiTrendingDown className="mx-auto mb-2" size={24} />,
            },
          ]
        : [
            { value: 'invoice_out', label: t('enums.transactionType.invoice_out'), color: 'green' },
            { value: 'payment_in', label: t('enums.transactionType.payment_in'), color: 'blue' },
            { value: 'invoice_in', label: t('enums.transactionType.invoice_in'), color: 'red' },
            {
              value: 'payment_out',
              label: t('enums.transactionType.payment_out'),
              color: 'orange',
            },
          ],
    [t, isSimple]
  );

  return (
    <div className={cn('grid grid-cols-2', isSimple ? 'gap-4' : 'gap-2', className)}>
      {options.map((opt) => (
        <RadioCard
          key={opt.value}
          name="type"
          value={opt.value}
          checked={value === opt.value}
          onSelect={() => onChange(opt.value)}
          selectedClassName={COLOR_MAP[opt.color]}
          cardClassName={cn('text-center', isSimple ? 'p-4' : 'p-2.5')}
        >
          {opt.icon}
          <span className={cn('font-medium', isSimple ? 'text-base' : 'text-sm')}>{opt.label}</span>
        </RadioCard>
      ))}
    </div>
  );
}
