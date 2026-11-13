import { useTranslation } from 'react-i18next';
import type { LegacyFirmPayment } from '../../database/dataReview';
import type { Category } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ReviewSection } from './ReviewSection';
import { ReviewCell, ReviewRow, ReviewTable } from './ReviewTable';
import { ReviewCheckbox } from './ReviewCheckbox';
import { CategorySelect } from './CategorySelect';
import type { FirmChoice, FirmChoices } from './reviewChoices';

interface LegacyFirmPaymentsProps {
  payments: LegacyFirmPayment[];
  choices: FirmChoices;
  categories: Category[];
  onChange: (id: number, choice: FirmChoice) => void;
  className?: string;
}

export function LegacyFirmPayments({
  payments,
  choices,
  categories,
  onChange,
  className,
}: LegacyFirmPaymentsProps) {
  const { t } = useTranslation();

  return (
    <ReviewSection
      title={t('dataReview.unmatched.firmTitle', { count: payments.length })}
      hint={t('dataReview.unmatched.firmHint')}
      className={className}
    >
      <ReviewTable
        head={[
          '',
          t('common.date'),
          t('common.description'),
          t('common.amount'),
          t('dataReview.unmatched.becomes'),
          t('common.category'),
        ]}
      >
        {payments.map((payment) => {
          const choice = choices[payment.id] ?? { convert: true, categoryId: '' };
          const update = (patch: Partial<FirmChoice>) =>
            onChange(payment.id, { ...choice, ...patch });
          return (
            <ReviewRow key={payment.id}>
              <ReviewCell>
                <ReviewCheckbox
                  label={t('dataReview.unmatched.convertThis', { name: payment.description })}
                  checked={choice.convert}
                  onChange={(convert) => update({ convert })}
                />
              </ReviewCell>
              <ReviewCell>{formatDate(payment.date)}</ReviewCell>
              <ReviewCell>{payment.description}</ReviewCell>
              <ReviewCell>{formatCurrency(payment.amountTry)}</ReviewCell>
              <ReviewCell>
                {payment.becomes === 'invoice_out'
                  ? t('companyAccount.types.income')
                  : t('companyAccount.types.expense')}
              </ReviewCell>
              <ReviewCell>
                <CategorySelect
                  categories={categories}
                  type={payment.becomes}
                  name={payment.description}
                  value={choice.categoryId}
                  onChange={(categoryId) => update({ categoryId })}
                />
              </ReviewCell>
            </ReviewRow>
          );
        })}
      </ReviewTable>
    </ReviewSection>
  );
}
