import { memo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import type { Currency } from '../../types';
import { cn } from '../../utils/cn';

interface SignedAmountProps {
  sign: string;
  amount: number;
  currency?: Currency;
  className?: string;
}

export const SignedAmount = memo(function SignedAmount({
  sign,
  amount,
  currency,
  className = '',
}: SignedAmountProps) {
  return (
    <span className={cn('whitespace-nowrap', className)}>
      {sign}
      {formatCurrency(amount, currency)}
    </span>
  );
});
