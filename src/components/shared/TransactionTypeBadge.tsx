import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionTypeLabel } from '../../utils/constants';
import { getTransactionColor } from '../../utils/transactionHelpers';
import type { TransactionType } from '../../types';
import { cn } from '../../utils/cn';

interface TransactionTypeBadgeProps {
  type: TransactionType;
  size?: 'sm' | 'md';
  className?: string;
}

const sizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

export const TransactionTypeBadge = memo(function TransactionTypeBadge({
  type,
  size = 'sm',
  className = '',
}: TransactionTypeBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-center text-white',
        sizes[size],
        'leading-tight',
        getTransactionColor(type),
        className
      )}
    >
      {t(transactionTypeLabel(type))}
    </span>
  );
});
