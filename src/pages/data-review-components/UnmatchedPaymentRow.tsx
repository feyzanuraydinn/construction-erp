import { useTranslation } from 'react-i18next';
import type { UnmatchedPayment } from '../../database/dataReview';
import type { Category } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { transactionTypeLabel } from '../../utils/constants';
import { invoiceTypeFor } from '../../utils/transactionKinds';
import { MONEY_TOLERANCE } from '../../utils/money';
import { cn } from '../../utils/cn';
import { CellNote, ReviewCell, ReviewRow, REVIEW_SELECT_CLASS } from './ReviewTable';
import { ReviewCheckbox } from './ReviewCheckbox';
import { CategorySelect } from './CategorySelect';
import { restOf, type PaymentChoice } from './reviewChoices';

interface UnmatchedPaymentRowProps {
  payment: UnmatchedPayment;
  choice: PaymentChoice;
  categories: Category[];
  onChange: (patch: Partial<PaymentChoice>) => void;
  className?: string;
}

export function UnmatchedPaymentRow({
  payment,
  choice,
  categories,
  onChange,
  className,
}: UnmatchedPaymentRowProps) {
  const { t } = useTranslation();
  const rest = restOf(payment, choice);
  const missing =
    rest > MONEY_TOLERANCE &&
    (choice.rest === null || (choice.rest === 'document' && !choice.categoryId));

  return (
    <ReviewRow className={cn(missing && 'bg-amber-50/60 dark:bg-amber-900/10', className)}>
      <ReviewCell>{formatDate(payment.date)}</ReviewCell>
      <ReviewCell>
        {payment.description}
        <CellNote>
          {t(transactionTypeLabel(payment.type))} ·{' '}
          {formatCurrency(payment.amount, payment.currency)}
        </CellNote>
        {payment.countedByOldProjectPage && (
          <CellNote className="text-amber-700 dark:text-amber-400">
            {payment.type === 'payment_out'
              ? t('dataReview.unmatched.oldCountedExpense')
              : t('dataReview.unmatched.oldCountedIncome')}
          </CellNote>
        )}
      </ReviewCell>
      <ReviewCell>
        {payment.companyName ?? (
          <span className="text-gray-400">{t('dataReview.unmatched.noCompany')}</span>
        )}
        {payment.companyType === 'person' && (
          <CellNote>{t('dataReview.unmatched.person')}</CellNote>
        )}
        {payment.projectName && <CellNote>{payment.projectName}</CellNote>}
      </ReviewCell>
      <ReviewCell className="font-medium">{formatCurrency(payment.unmatched)}</ReviewCell>
      <ReviewCell>
        {payment.matchable > MONEY_TOLERANCE ? (
          <label className="flex items-center gap-2">
            <ReviewCheckbox checked={choice.match} onChange={(match) => onChange({ match })} />
            <span>{formatCurrency(payment.matchable)}</span>
          </label>
        ) : (
          <span className="text-xs text-gray-400">{t('dataReview.unmatched.noOpenInvoice')}</span>
        )}
      </ReviewCell>
      <ReviewCell>
        {rest <= MONEY_TOLERANCE ? (
          <span className="text-xs text-green-700 dark:text-green-400">
            {t('dataReview.unmatched.fullyMatched')}
          </span>
        ) : (
          <div className="space-y-1">
            <CellNote>{t('dataReview.unmatched.rest', { amount: formatCurrency(rest) })}</CellNote>
            <select
              className={REVIEW_SELECT_CLASS}
              aria-label={t('dataReview.unmatched.restChoiceFor', { name: payment.description })}
              value={choice.rest ?? ''}
              onChange={(e) =>
                onChange({
                  rest:
                    e.target.value === ''
                      ? null
                      : e.target.value === 'document'
                        ? 'document'
                        : 'advance',
                })
              }
            >
              <option value="">{t('dataReview.unmatched.choose')}</option>
              <option value="document">
                {payment.type === 'payment_out'
                  ? t('transactionModal.restExpense')
                  : t('transactionModal.restIncome')}
              </option>
              {payment.advanceAllowed && (
                <option value="advance">{t('transactionModal.restAdvance')}</option>
              )}
            </select>
            {choice.rest === 'document' && (
              <CategorySelect
                className="block"
                categories={categories}
                type={invoiceTypeFor(payment.type)}
                name={payment.description}
                value={choice.categoryId}
                onChange={(categoryId) => onChange({ categoryId })}
              />
            )}
          </div>
        )}
      </ReviewCell>
    </ReviewRow>
  );
}
