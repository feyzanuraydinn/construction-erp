import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard, signColor } from '../../components/ui/StatCard';
import { formatCurrency } from '../../utils/formatters';
import type { TransactionWithDetails } from '../../types';

interface TransactionStatsProps {
  totalInvoiceOut: number;
  totalPaymentIn: number;
  totalInvoiceIn: number;
  totalPaymentOut: number;
  netProfit: number;
  netCashFlow: number;
  openBalance: number;
  filteredTransactions: TransactionWithDetails[];
  className?: string;
}

export const TransactionStats = memo(function TransactionStats({
  totalInvoiceOut,
  totalPaymentIn,
  totalInvoiceIn,
  totalPaymentOut,
  netProfit,
  netCashFlow,
  openBalance,
  filteredTransactions,
  className,
}: TransactionStatsProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4 mb-4 xl:grid-cols-4">
        <StatCard
          title={t('transactions.stats.salesInvoices')}
          value={formatCurrency(totalInvoiceOut)}
          subtitle={t('transactions.stats.transactionCount', {
            count: filteredTransactions.filter((tx) => tx.type === 'invoice_out').length,
          })}
          color="green"
        />
        <StatCard
          title={t('transactions.stats.collections')}
          value={formatCurrency(totalPaymentIn)}
          subtitle={t('transactions.stats.transactionCount', {
            count: filteredTransactions.filter((tx) => tx.type === 'payment_in').length,
          })}
          color="blue"
        />
        <StatCard
          title={t('transactions.stats.purchaseInvoices')}
          value={formatCurrency(totalInvoiceIn)}
          subtitle={t('transactions.stats.transactionCount', {
            count: filteredTransactions.filter((tx) => tx.type === 'invoice_in').length,
          })}
          color="red"
        />
        <StatCard
          title={t('transactions.stats.payments')}
          value={formatCurrency(totalPaymentOut)}
          subtitle={t('transactions.stats.transactionCount', {
            count: filteredTransactions.filter((tx) => tx.type === 'payment_out').length,
          })}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        <StatCard
          title={t('transactions.stats.profitLoss')}
          value={formatCurrency(netProfit)}
          subtitle={t('transactions.stats.profitLossSubtitle')}
          color={signColor(netProfit)}
          highlighted
        />
        <StatCard
          title={t('transactions.stats.cashFlow')}
          value={formatCurrency(netCashFlow)}
          subtitle={t('transactions.stats.cashFlowSubtitle')}
          color={signColor(netCashFlow)}
          highlighted
        />
        <StatCard
          title={t('transactions.stats.netStatus')}
          value={formatCurrency(openBalance)}
          subtitle={t('transactions.stats.netStatusSubtitle')}
          color={signColor(openBalance)}
          highlighted
        />
      </div>
    </div>
  );
});
