import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiZap } from 'react-icons/fi';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { formatCurrency } from '../../../utils/formatters';
import { MONEY_TOLERANCE } from '../../../utils/money';
import { allocationCounterpart } from '../../../utils/allocations';
import { isPaymentType } from '../../../utils/transactionKinds';
import { cn } from '../../../utils/cn';
import type { TransactionType } from '../../../types';
import { MatchCandidateRow } from './MatchCandidateRow';
import type { MatchCandidatesState } from './useMatchCandidates';

interface MatchPanelProps {
  matching: MatchCandidatesState;
  type: TransactionType;
  targetAmount: number;
  poolProjectId: number | null;
  showNoCompanyHint: boolean;
  children?: ReactNode;
  className?: string;
}

export function MatchPanel({
  matching,
  type,
  targetAmount,
  poolProjectId,
  showNoCompanyHint,
  children,
  className,
}: MatchPanelProps) {
  const { t } = useTranslation();
  const isPayment = isPaymentType(type);
  const { candidates, matches, matchedTotal, unmatched } = matching;
  const emptyText = isPayment
    ? t('transactionModal.noOpenInvoices')
    : t('transactionModal.noOpenPayments');
  const salesTitle =
    type === 'invoice_out'
      ? t('transactionModal.invoiceMatchesTitleSale')
      : t('transactionModal.invoiceMatchesTitle');

  return (
    <div
      className={cn(
        'p-3 space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isPayment ? t('shared.allocations.title') : salesTitle}
        </span>
        <div className="flex items-center gap-1">
          {matchedTotal > 0 && (
            <Button type="button" variant="ghost" size="xs" icon={FiX} onClick={matching.clear}>
              {t('transactionModal.clearMatches')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            icon={FiZap}
            onClick={matching.autoFill}
            disabled={targetAmount <= 0 || candidates.length === 0}
            className="!text-indigo-700 dark:!text-indigo-400 !bg-indigo-100 dark:!bg-indigo-900/30 hover:!bg-indigo-200 dark:hover:!bg-indigo-900/50"
          >
            {t('transactionModal.autoAllocate')}
          </Button>
        </div>
      </div>

      {showNoCompanyHint && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('transactionModal.noCompanyHint')}
        </p>
      )}

      {matching.outsideMatches.map((a) => (
        <Notice key={a.id} role="alert" compact>
          {t('transactionModal.outsideMatch', {
            description: allocationCounterpart(a, isPayment).description || '-',
            amount: formatCurrency(a.amount),
          })}
        </Notice>
      ))}

      {matching.loading || candidates.length === 0 ? (
        <div className="py-3 text-xs text-center text-gray-500 dark:text-gray-400">
          {matching.loading ? t('transactionModal.loadingInvoices') : emptyText}
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-56">
          {candidates.map((candidate) => (
            <MatchCandidateRow
              key={candidate.id}
              candidate={candidate}
              amount={matches[candidate.id] ?? 0}
              isPayment={isPayment}
              poolProjectId={poolProjectId}
              onAmountChange={(value) => matching.setAmount(candidate, value)}
              onRemove={() => matching.remove(candidate.id)}
            />
          ))}
        </div>
      )}

      {targetAmount > 0 && (
        <div className="flex items-center justify-between pt-2 text-xs border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">
            {t('transactionModal.allocation')}: {formatCurrency(matchedTotal)} /{' '}
            {formatCurrency(targetAmount)}
          </span>
          {unmatched > MONEY_TOLERANCE ? (
            <span className="text-amber-600 dark:text-amber-400">
              {isPayment ? t('transactionModal.unallocated') : t('transactionModal.invoiceOpen')}:{' '}
              {formatCurrency(unmatched)}
            </span>
          ) : (
            matchedTotal > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {t('transactionModal.fullMatch')}
              </span>
            )
          )}
        </div>
      )}

      {children}
    </div>
  );
}
