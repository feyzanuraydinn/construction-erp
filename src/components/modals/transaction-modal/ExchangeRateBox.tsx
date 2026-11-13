import { useTranslation } from 'react-i18next';
import { AmountInput } from '../../ui/AmountInput';
import { formatCurrency, formatNumber } from '../../../utils/formatters';
import { roundMoney } from '../../../utils/money';
import { cn } from '../../../utils/cn';
import type { Currency } from '../../../types';

interface ExchangeRateBoxProps {
  currency: Currency;
  rate: string;
  currentRate: number | null;
  amount: string;
  error: string | null;
  onRateChange: (value: string) => void;
  onApplyCurrentRate: () => void;
  className?: string;
}

export function ExchangeRateBox({
  currency,
  rate,
  currentRate,
  amount,
  error,
  onRateChange,
  onApplyCurrentRate,
  className,
}: ExchangeRateBoxProps) {
  const { t } = useTranslation();
  const rateValue = parseFloat(rate);
  const amountValue = parseFloat(amount);

  return (
    <div
      className={cn(
        'p-3 space-y-2 text-sm border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20',
        className
      )}
    >
      <AmountInput
        label={`${t('transactionModal.exchangeRate', { currency })} *`}
        decimals={4}
        value={rate}
        onValueChange={onRateChange}
        error={error ?? undefined}
      />
      {currentRate !== null && (
        <div className="flex items-center justify-between">
          <span className="text-blue-700 dark:text-blue-400">
            {t('transactionModal.currentRateLine', {
              currency,
              rate: formatNumber(currentRate, 4),
            })}
          </span>
          {rateValue !== currentRate && (
            <button
              type="button"
              onClick={onApplyCurrentRate}
              className="font-medium text-blue-700 underline dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            >
              {t('transactionModal.useCurrentRate')}
            </button>
          )}
        </div>
      )}
      {rateValue > 0 && amountValue > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-blue-700 dark:text-blue-400">
            {t('transactionModal.tryEquivalent')}:
          </span>
          <span className="font-medium text-blue-900 dark:text-blue-300">
            {formatCurrency(roundMoney(amountValue * rateValue))}
          </span>
        </div>
      )}
    </div>
  );
}
