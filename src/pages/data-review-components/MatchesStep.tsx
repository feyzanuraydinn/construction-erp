import { useTranslation } from 'react-i18next';
import type { AllocationIssue } from '../../database/dataReview';
import { formatCurrency } from '../../utils/formatters';
import { StepActions, StepCard } from './StepCard';
import { ReviewCheckbox } from './ReviewCheckbox';
import type { ReviewStep } from './useDataReview';

interface MatchesStepProps {
  issues: AllocationIssue[];
  selection: Set<string>;
  onToggle: (key: string, checked: boolean) => void;
  busy: ReviewStep | null;
  onApply: () => void;
  className?: string;
}

export function MatchesStep({
  issues,
  selection,
  onToggle,
  busy,
  onApply,
  className,
}: MatchesStepProps) {
  const { t } = useTranslation();

  const issueText = (issue: AllocationIssue): string => {
    const params = {
      payment: issue.paymentDescription,
      invoice: issue.invoiceDescription ?? '',
      company: issue.companyName ?? '',
      amount: formatCurrency(
        issue.kind === 'invoice_over' ? (issue.invoiceTry ?? 0) : issue.paymentTry
      ),
    };
    return t(`dataReview.issues.${issue.kind}`, params);
  };

  return (
    <StepCard
      number={3}
      title={t('dataReview.matches.title')}
      description={t('dataReview.matches.description')}
      done={issues.length === 0}
      className={className}
    >
      <ul className="space-y-2">
        {issues.map((issue) => (
          <li
            key={issue.key}
            className="flex items-start gap-3 p-3 text-sm border border-gray-200 rounded-lg dark:border-gray-700"
          >
            <ReviewCheckbox
              className="mt-1"
              label={t('dataReview.matches.fixThis')}
              checked={selection.has(issue.key)}
              onChange={(checked) => onToggle(issue.key, checked)}
            />
            <div className="space-y-1">
              <p className="text-gray-800 dark:text-gray-200">{issueText(issue)}</p>
              {issue.changes.length > 0 &&
                (issue.kind === 'payment_over' || issue.kind === 'invoice_over') && (
                  <ul className="text-xs text-gray-500 dark:text-gray-400">
                    {issue.changes.map((change) => (
                      <li key={change.allocationId}>
                        {change.invoiceDescription}: {formatCurrency(change.from)} →{' '}
                        {formatCurrency(change.to)}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </li>
        ))}
      </ul>
      <StepActions
        step="matches"
        busy={busy}
        blocked={selection.size === 0}
        label={t('dataReview.matches.apply')}
        onClick={onApply}
      />
    </StepCard>
  );
}
