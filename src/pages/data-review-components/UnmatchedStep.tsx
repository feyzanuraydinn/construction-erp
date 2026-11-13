import { useTranslation } from 'react-i18next';
import type { LegacyFirmPayment, UnmatchedPayment } from '../../database/dataReview';
import type { Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { StepActions, StepCard } from './StepCard';
import { ReviewTable } from './ReviewTable';
import { UnmatchedPaymentRow } from './UnmatchedPaymentRow';
import { LegacyFirmPayments } from './LegacyFirmPayments';
import {
  choiceFor,
  countMissingChoices,
  type FirmChoice,
  type FirmChoices,
  type PaymentChoice,
  type PaymentChoices,
  type RestChoice,
} from './reviewChoices';
import type { ReviewStep } from './useDataReview';

const SET_ALL_OPTIONS: { rest: RestChoice; labelKey: string }[] = [
  { rest: 'document', labelKey: 'dataReview.unmatched.allDocument' },
  { rest: 'advance', labelKey: 'dataReview.unmatched.allAdvance' },
];

interface UnmatchedStepProps {
  payments: UnmatchedPayment[];
  firmPayments: LegacyFirmPayment[];
  choices: PaymentChoices;
  firmChoices: FirmChoices;
  categories: Category[];
  onChoiceChange: (id: number, patch: Partial<PaymentChoice>) => void;
  onSetAllRests: (rest: RestChoice) => void;
  onFirmChoiceChange: (id: number, choice: FirmChoice) => void;
  busy: ReviewStep | null;
  onApply: () => void;
  className?: string;
}

export function UnmatchedStep({
  payments,
  firmPayments,
  choices,
  firmChoices,
  categories,
  onChoiceChange,
  onSetAllRests,
  onFirmChoiceChange,
  busy,
  onApply,
  className,
}: UnmatchedStepProps) {
  const { t } = useTranslation();
  const missingChoices = countMissingChoices(payments, choices);

  return (
    <StepCard
      number={4}
      title={t('dataReview.unmatched.title')}
      description={t('dataReview.unmatched.description')}
      done={payments.length === 0 && firmPayments.length === 0}
      className={className}
    >
      {payments.length > 0 && (
        <>
          <div className="p-3 space-y-1 text-sm text-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:text-gray-300">
            <p>{t('dataReview.unmatched.explainDocument')}</p>
            <p>{t('dataReview.unmatched.explainAdvance')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {t('dataReview.unmatched.setAll')}
            </span>
            {SET_ALL_OPTIONS.map((option) => (
              <Button
                key={option.rest}
                size="sm"
                variant="secondary"
                onClick={() => onSetAllRests(option.rest)}
              >
                {t(option.labelKey)}
              </Button>
            ))}
          </div>
          <ReviewTable
            head={[
              t('common.date'),
              t('common.description'),
              t('dataReview.unmatched.accountProject'),
              t('dataReview.unmatched.unmatchedAmount'),
              t('dataReview.unmatched.matchWithInvoices'),
              t('dataReview.unmatched.restChoice'),
            ]}
          >
            {payments.map((payment) => (
              <UnmatchedPaymentRow
                key={payment.id}
                payment={payment}
                choice={choiceFor(choices, payment)}
                categories={categories}
                onChange={(patch) => onChoiceChange(payment.id, patch)}
              />
            ))}
          </ReviewTable>
        </>
      )}

      {firmPayments.length > 0 && (
        <LegacyFirmPayments
          payments={firmPayments}
          choices={firmChoices}
          categories={categories}
          onChange={onFirmChoiceChange}
        />
      )}

      <StepActions
        step="unmatched"
        busy={busy}
        blocked={missingChoices > 0}
        hint={
          missingChoices > 0
            ? t('dataReview.unmatched.missingChoices', { count: missingChoices })
            : t('dataReview.unmatched.applyHint')
        }
        label={t('dataReview.unmatched.apply')}
        onClick={onApply}
      />
    </StepCard>
  );
}
