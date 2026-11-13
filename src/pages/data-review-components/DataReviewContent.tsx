import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiShield } from 'react-icons/fi';
import type { DataReviewReport } from '../../database/dataReview';
import type { Category } from '../../types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Notice } from '../../components/ui/Notice';
import { PageHeader } from '../../components/shared/PageHeader';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { useDataReview } from './useDataReview';
import { RepairsStep } from './RepairsStep';
import { RatesStep } from './RatesStep';
import { MatchesStep } from './MatchesStep';
import { UnmatchedStep } from './UnmatchedStep';
import { SummaryCard } from './SummaryCard';

interface DataReviewContentProps {
  initialReport: DataReviewReport;
  categories: Category[];
  className?: string;
}

export function DataReviewContent({
  initialReport,
  categories,
  className,
}: DataReviewContentProps) {
  const { t } = useTranslation();
  const review = useDataReview(initialReport);
  const { report, busy } = review;
  const [confirmComplete, setConfirmComplete] = useState(false);

  const danglingEntries = useMemo(
    () => Object.entries(report.dangling).filter(([, count]) => count > 0),
    [report]
  );
  const openItems =
    report.amountFixes.length +
    danglingEntries.length +
    report.orphans.length +
    report.rateIssues.length +
    report.allocationIssues.length;

  const complete = () => {
    setConfirmComplete(false);
    review.complete();
  };

  return (
    <div className={cn('page-container', className)}>
      <PageHeader
        icon={FiShield}
        title={t('dataReview.title')}
        subtitle={t('dataReview.subtitle')}
      />

      {report.completed ? (
        <Notice tone="success" className="p-4 mb-6">
          <p>
            {t('dataReview.completedInfo', {
              date: report.completedAt ? formatDate(report.completedAt) : '',
            })}
          </p>
        </Notice>
      ) : (
        <Notice role="note" className="p-4 mb-6">
          <p>{t('dataReview.intro1')}</p>
          <p>{t('dataReview.intro2')}</p>
        </Notice>
      )}

      <div className="space-y-6">
        <RepairsStep
          report={report}
          danglingEntries={danglingEntries}
          selection={review.orphanSelection}
          onToggle={review.toggleOrphan}
          busy={busy}
          onApply={review.applyRepairs}
        />
        <RatesStep
          issues={report.rateIssues}
          rates={review.rates}
          onRateChange={review.setRate}
          busy={busy}
          onApply={review.applyRates}
        />
        <MatchesStep
          issues={report.allocationIssues}
          selection={review.issueSelection}
          onToggle={review.toggleIssue}
          busy={busy}
          onApply={review.applyMatches}
        />
        {!report.completed && (
          <UnmatchedStep
            payments={report.unmatchedPayments}
            firmPayments={report.legacyFirmPayments}
            choices={review.choices}
            firmChoices={review.firmChoices}
            categories={categories}
            onChoiceChange={review.setChoice}
            onSetAllRests={review.setAllRests}
            onFirmChoiceChange={review.setFirmChoice}
            busy={busy}
            onApply={review.applyUnmatched}
          />
        )}
        <SummaryCard report={report} busy={busy} onComplete={() => setConfirmComplete(true)} />
      </div>

      <ConfirmDialog
        isOpen={confirmComplete}
        onClose={() => setConfirmComplete(false)}
        onConfirm={complete}
        title={t('dataReview.summary.confirmTitle')}
        message={
          openItems + report.unmatchedPayments.length > 0
            ? t('dataReview.summary.confirmWithOpen', {
                open: openItems,
                unmatched: report.unmatchedPayments.length,
              })
            : t('dataReview.summary.confirmClean')
        }
        type="warning"
        confirmText={t('dataReview.summary.complete')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
}
