import { useTranslation } from 'react-i18next';
import { SignedAmount } from '../../components/ui/SignedAmount';
import { formatDate } from '../../utils/formatters';
import {
  getTransactionColor,
  getTransactionTextColor,
  transactionSign,
} from '../../utils/transactionHelpers';
import { transactionTypeLabel } from '../../utils/constants';
import type { TransactionWithDetails } from '../../types';
import { DashboardListCard } from './DashboardListCard';

interface RecentTransactionsCardProps {
  transactions: TransactionWithDetails[];
  onSelect: (transaction: TransactionWithDetails) => void;
  className?: string;
}

export function RecentTransactionsCard({
  transactions,
  onSelect,
  className,
}: RecentTransactionsCardProps) {
  const { t } = useTranslation();
  return (
    <DashboardListCard
      title={t('dashboard.recentTransactions')}
      viewAllTo="/transactions"
      emptyText={t('dashboard.noTransactions')}
      isEmpty={transactions.length === 0}
      className={className}
    >
      {transactions.map((tx) => (
        <button
          key={tx.id}
          type="button"
          className="w-full text-left px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          onClick={() => onSelect(tx)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${getTransactionColor(tx.type)}`} />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {tx.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(transactionTypeLabel(tx.type))} •{' '}
                {tx.company_name || tx.project_name || t('dashboard.companyGeneral')} •{' '}
                {formatDate(tx.date)}
              </p>
            </div>
          </div>
          <span className={`font-medium ${getTransactionTextColor(tx.type)}`}>
            <SignedAmount
              sign={transactionSign(tx.type)}
              amount={tx.amount}
              currency={tx.currency}
            />
          </span>
        </button>
      ))}
    </DashboardListCard>
  );
}
