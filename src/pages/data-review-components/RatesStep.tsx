import { useTranslation } from 'react-i18next';
import type { RateIssue } from '../../database/dataReview';
import { AmountInput } from '../../components/ui/AmountInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { transactionTypeLabel } from '../../utils/constants';
import { roundMoney } from '../../utils/money';
import { cn } from '../../utils/cn';
import { StepActions, StepCard } from './StepCard';
import { CellNote, ReviewCell, ReviewRow, ReviewTable, REVIEW_SELECT_CLASS } from './ReviewTable';
import type { ReviewStep } from './useDataReview';

interface RatesStepProps {
  issues: RateIssue[];
  rates: Record<number, string>;
  onRateChange: (id: number, value: string) => void;
  busy: ReviewStep | null;
  onApply: () => void;
  className?: string;
}

export function RatesStep({
  issues,
  rates,
  onRateChange,
  busy,
  onApply,
  className,
}: RatesStepProps) {
  const { t } = useTranslation();

  return (
    <StepCard
      number={2}
      title={t('dataReview.rates.title')}
      description={t('dataReview.rates.description')}
      done={issues.length === 0}
      className={className}
    >
      <ReviewTable
        head={[
          t('common.date'),
          t('common.description'),
          t('dataReview.rates.account'),
          t('common.amount'),
          t('dataReview.rates.storedRate'),
          t('dataReview.rates.newRate'),
        ]}
      >
        {issues.map((issue) => {
          const rate = parseFloat(rates[issue.id] ?? '');
          return (
            <ReviewRow key={issue.id}>
              <ReviewCell>{formatDate(issue.date)}</ReviewCell>
              <ReviewCell>
                {issue.description}
                <CellNote>{t(transactionTypeLabel(issue.type))}</CellNote>
              </ReviewCell>
              <ReviewCell>
                {[issue.companyName, issue.projectName].filter(Boolean).join(' · ') || '-'}
              </ReviewCell>
              <ReviewCell>{formatCurrency(issue.amount, issue.currency)}</ReviewCell>
              <ReviewCell className="text-red-600 dark:text-red-400">
                {issue.exchangeRate ?? '-'}
              </ReviewCell>
              <ReviewCell>
                <AmountInput
                  bare
                  decimals={4}
                  value={rates[issue.id] ?? ''}
                  onValueChange={(value) => onRateChange(issue.id, value)}
                  aria-label={t('dataReview.rates.rateFor', {
                    name: issue.description,
                    currency: issue.currency,
                  })}
                  placeholder={t('dataReview.rates.ratePlaceholder', { currency: issue.currency })}
                  className={cn('w-28', REVIEW_SELECT_CLASS)}
                />
                {rate > 1 && (
                  <CellNote className="mt-1">
                    = {formatCurrency(roundMoney(issue.amount * rate))}
                  </CellNote>
                )}
              </ReviewCell>
            </ReviewRow>
          );
        })}
      </ReviewTable>
      <StepActions
        step="rates"
        busy={busy}
        blocked={!Object.values(rates).some((r) => parseFloat(r) > 1)}
        hint={t('dataReview.rates.hint')}
        label={t('dataReview.rates.apply')}
        onClick={onApply}
      />
    </StepCard>
  );
}
