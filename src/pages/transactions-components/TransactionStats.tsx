import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import type { TransactionWithDetails } from '../../types';

interface TransactionStatsProps {
  totalInvoiceOut: number;
  totalPaymentIn: number;
  totalInvoiceIn: number;
  totalPaymentOut: number;
  netProfit: number;
  netCashFlow: number;
  filteredTransactions: TransactionWithDetails[];
}

export const TransactionStats = memo(function TransactionStats({
  totalInvoiceOut,
  totalPaymentIn,
  totalInvoiceIn,
  totalPaymentOut,
  netProfit,
  netCashFlow,
  filteredTransactions,
}: TransactionStatsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Stats - Row 1: Invoices and Payments */}
      <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
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

      {/* Stats - Row 2: Summaries */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        <StatCard
          title={t('transactions.stats.profitLoss')}
          value={formatCurrency(netProfit)}
          subtitle={t('transactions.stats.profitLossSubtitle')}
          color={netProfit >= 0 ? 'green' : 'red'}
          highlighted
        />
        <StatCard
          title={t('transactions.stats.cashFlow')}
          value={formatCurrency(netCashFlow)}
          subtitle={t('transactions.stats.cashFlowSubtitle')}
          color={netCashFlow >= 0 ? 'green' : 'red'}
          highlighted
        />
        <StatCard
          title={t('transactions.stats.netStatus')}
          value={formatCurrency(netProfit + netCashFlow)}
          subtitle={t('transactions.stats.netStatusSubtitle')}
          color={netProfit + netCashFlow >= 0 ? 'green' : 'red'}
          highlighted
        />
      </div>
    </>
  );
});
