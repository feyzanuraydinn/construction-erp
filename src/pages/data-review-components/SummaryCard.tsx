import { useTranslation } from 'react-i18next';
import type { DataReviewReport, Totals } from '../../database/dataReview';
import { Card, CardBody } from '../../components/ui/Card';
import { MutedText } from '../../components/shared/DetailFields';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StepActions, StepHeader } from './StepCard';
import { ReviewSection } from './ReviewSection';
import { ReviewCell, ReviewRow, ReviewTable } from './ReviewTable';
import type { ReviewStep } from './useDataReview';

const TOTAL_ROWS: { key: keyof Totals; labelKey: string }[] = [
  { key: 'income', labelKey: 'dataReview.summary.income' },
  { key: 'expense', labelKey: 'dataReview.summary.expense' },
  { key: 'collected', labelKey: 'dataReview.summary.collected' },
  { key: 'paid', labelKey: 'dataReview.summary.paid' },
];

interface SummaryCardProps {
  report: DataReviewReport;
  busy: ReviewStep | null;
  onComplete: () => void;
  className?: string;
}

export function SummaryCard({ report, busy, onComplete, className }: SummaryCardProps) {
  const { t } = useTranslation();
  const { baseline } = report;

  return (
    <Card className={className}>
      <StepHeader
        title={`${report.completed ? '' : '5. '}${t('dataReview.summary.title')}`}
        description={
          baseline
            ? t('dataReview.summary.description', { date: formatDate(baseline.recordedAt) })
            : t('dataReview.summary.noBaseline')
        }
      />
      <CardBody className="space-y-4">
        <ReviewTable head={['', t('dataReview.summary.before'), t('dataReview.summary.now')]}>
          {TOTAL_ROWS.map((row) => (
            <ReviewRow key={row.key}>
              <ReviewCell className="font-medium">{t(row.labelKey)}</ReviewCell>
              <ReviewCell>{baseline ? formatCurrency(baseline.totals[row.key]) : '-'}</ReviewCell>
              <ReviewCell>{formatCurrency(report.totalsNow[row.key])}</ReviewCell>
            </ReviewRow>
          ))}
        </ReviewTable>

        {report.projectEffects.length > 0 && (
          <ReviewSection title={t('dataReview.summary.projects')}>
            <ReviewTable
              head={[
                t('dataReview.summary.project'),
                t('dataReview.summary.beforeIncomeExpense'),
                t('dataReview.summary.beforeProfit'),
                t('dataReview.summary.nowIncomeExpense'),
                t('dataReview.summary.nowProfit'),
              ]}
            >
              {report.projectEffects.map((effect) => (
                <ReviewRow key={effect.projectId}>
                  <ReviewCell>
                    {effect.code} · {effect.name}
                  </ReviewCell>
                  <ReviewCell>
                    {effect.before
                      ? `${formatCurrency(effect.before.income)} / ${formatCurrency(effect.before.expense)}`
                      : '-'}
                  </ReviewCell>
                  <ReviewCell>
                    {effect.before ? formatCurrency(effect.before.profit) : '-'}
                  </ReviewCell>
                  <ReviewCell>
                    {formatCurrency(effect.now.income)} / {formatCurrency(effect.now.expense)}
                  </ReviewCell>
                  <ReviewCell className="font-medium">
                    {formatCurrency(effect.now.profit)}
                  </ReviewCell>
                </ReviewRow>
              ))}
            </ReviewTable>
            <MutedText className="text-xs">{t('dataReview.summary.projectsHint')}</MutedText>
          </ReviewSection>
        )}

        {!report.completed && (
          <StepActions
            step="complete"
            busy={busy}
            hint={t('dataReview.summary.completeHint')}
            hintClassName="text-sm text-gray-600"
            label={t('dataReview.summary.complete')}
            onClick={onComplete}
            className="pt-2 border-t border-gray-200 dark:border-gray-700"
          />
        )}
      </CardBody>
    </Card>
  );
}
