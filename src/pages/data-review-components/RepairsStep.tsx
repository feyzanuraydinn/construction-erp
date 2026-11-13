import { useTranslation } from 'react-i18next';
import type { DataReviewReport } from '../../database/dataReview';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { transactionTypeLabel } from '../../utils/constants';
import { StepActions, StepCard } from './StepCard';
import { ReviewSection } from './ReviewSection';
import { ReviewCell, ReviewRow, ReviewTable } from './ReviewTable';
import { ReviewCheckbox } from './ReviewCheckbox';
import type { ReviewStep } from './useDataReview';

interface RepairsStepProps {
  report: DataReviewReport;
  danglingEntries: [string, number][];
  selection: Set<number>;
  onToggle: (id: number, checked: boolean) => void;
  busy: ReviewStep | null;
  onApply: () => void;
  className?: string;
}

export function RepairsStep({
  report,
  danglingEntries,
  selection,
  onToggle,
  busy,
  onApply,
  className,
}: RepairsStepProps) {
  const { t } = useTranslation();
  const done =
    report.amountFixes.length === 0 && danglingEntries.length === 0 && report.orphans.length === 0;

  return (
    <StepCard
      number={1}
      title={t('dataReview.repairs.title')}
      description={t('dataReview.repairs.description')}
      done={done}
      className={className}
    >
      {report.amountFixes.length > 0 && (
        <ReviewSection
          title={t('dataReview.repairs.amountFixes', { count: report.amountFixes.length })}
        >
          <ReviewTable
            head={[
              t('common.date'),
              t('common.description'),
              t('common.amount'),
              t('dataReview.repairs.storedTry'),
              t('dataReview.repairs.correctTry'),
            ]}
          >
            {report.amountFixes.map((fix) => (
              <ReviewRow key={fix.id}>
                <ReviewCell>{formatDate(fix.date)}</ReviewCell>
                <ReviewCell>{fix.description}</ReviewCell>
                <ReviewCell>{formatCurrency(fix.amount, fix.currency)}</ReviewCell>
                <ReviewCell className="text-red-600 dark:text-red-400">
                  {fix.storedTry === null ? '-' : formatCurrency(fix.storedTry)}
                </ReviewCell>
                <ReviewCell className="font-medium text-green-700 dark:text-green-400">
                  {formatCurrency(fix.correctTry)}
                </ReviewCell>
              </ReviewRow>
            ))}
          </ReviewTable>
        </ReviewSection>
      )}

      {danglingEntries.length > 0 && (
        <ReviewSection title={t('dataReview.repairs.brokenLinks')} className="space-y-1">
          <ul className="pl-5 space-y-1 text-sm text-gray-700 list-disc dark:text-gray-300">
            {danglingEntries.map(([key, count]) => (
              <li key={key}>{t(`dataReview.dangling.${key}`, { count })}</li>
            ))}
          </ul>
        </ReviewSection>
      )}

      {report.orphans.length > 0 && (
        <ReviewSection
          title={t('dataReview.repairs.orphans', { count: report.orphans.length })}
          hint={t('dataReview.repairs.orphansHint')}
        >
          <ReviewTable
            head={[
              '',
              t('common.date'),
              t('common.description'),
              t('common.type'),
              t('common.amount'),
              t('dataReview.repairs.deleted'),
            ]}
          >
            {report.orphans.map((orphan) => (
              <ReviewRow key={orphan.id}>
                <ReviewCell>
                  <ReviewCheckbox
                    label={t('dataReview.repairs.moveToTrash', { name: orphan.description })}
                    checked={selection.has(orphan.id)}
                    onChange={(checked) => onToggle(orphan.id, checked)}
                  />
                </ReviewCell>
                <ReviewCell>{formatDate(orphan.date)}</ReviewCell>
                <ReviewCell>{orphan.description}</ReviewCell>
                <ReviewCell>{t(transactionTypeLabel(orphan.type))}</ReviewCell>
                <ReviewCell>{formatCurrency(orphan.amount, orphan.currency)}</ReviewCell>
                <ReviewCell>
                  {orphan.missing === 'company'
                    ? t('dataReview.repairs.deletedCompany')
                    : t('dataReview.repairs.deletedProject')}
                </ReviewCell>
              </ReviewRow>
            ))}
          </ReviewTable>
        </ReviewSection>
      )}

      <StepActions
        step="repairs"
        busy={busy}
        label={t('dataReview.repairs.apply')}
        onClick={onApply}
      />
    </StepCard>
  );
}
