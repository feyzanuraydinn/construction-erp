import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import { AmountInput } from '../../ui/AmountInput';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { roundMoney } from '../../../utils/money';
import { cn } from '../../../utils/cn';
import type { MatchCandidate } from '../../../types';

interface MatchCandidateRowProps {
  candidate: MatchCandidate;
  amount: number;
  isPayment: boolean;
  poolProjectId: number | null;
  onAmountChange: (value: number) => void;
  onRemove: () => void;
  className?: string;
}

export function MatchCandidateRow({
  candidate,
  amount,
  isPayment,
  poolProjectId,
  onAmountChange,
  onRemove,
  className,
}: MatchCandidateRowProps) {
  const { t } = useTranslation();
  const otherProject =
    candidate.project_name && candidate.project_id !== poolProjectId
      ? candidate.project_name
      : null;
  const name = candidate.document_no || candidate.description;

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 bg-white border rounded dark:bg-gray-800',
        amount > 0
          ? 'border-indigo-300 dark:border-indigo-700'
          : 'border-gray-100 dark:border-gray-700',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-900 truncate dark:text-gray-100">{name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(candidate.date)} — {formatCurrency(candidate.amount_try)}
          {' · '}
          {isPayment
            ? t('transactionModal.remaining')
            : t('transactionModal.unmatchedOnPayment')}:{' '}
          {formatCurrency(Math.max(0, roundMoney(candidate.remaining - amount)))}
          {otherProject && <> · {t('transactionModal.otherProject', { name: otherProject })}</>}
        </div>
      </div>
      <AmountInput
        bare
        value={amount || ''}
        onValueChange={(value) => onAmountChange(parseFloat(value) || 0)}
        placeholder="0"
        aria-label={t('transactionModal.matchAmountFor', { name })}
        className="w-24 px-2 py-1 text-xs text-right bg-white border border-gray-200 rounded dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={amount <= 0}
        title={t('transactionModal.removeMatch')}
        aria-label={t('transactionModal.removeMatch')}
        className="p-1 text-gray-400 rounded hover:text-red-600 disabled:invisible dark:hover:text-red-400"
      >
        <FiX size={14} />
      </button>
    </div>
  );
}
