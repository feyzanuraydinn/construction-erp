import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiTrendingDown, FiUsers, FiCreditCard } from 'react-icons/fi';
import { TbCurrencyLira } from 'react-icons/tb';
import { StatCard, signColor } from '../../components/ui/StatCard';
import { formatCurrency } from '../../utils/formatters';
import type { DashboardFinancials } from '../../utils/financials';
import type { DashboardStats } from '../../types';
import { cn } from '../../utils/cn';

interface DashboardProfitCardsProps {
  financials: DashboardFinancials;
  className?: string;
}

export function DashboardProfitCards({ financials, className }: DashboardProfitCardsProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4 mb-6', className)}>
      <StatCard
        title={t('dashboard.totalIncome')}
        value={formatCurrency(financials.totalIncome)}
        subtitle={t('dashboard.salesInvoices')}
        icon={FiTrendingUp}
        color="green"
      />
      <StatCard
        title={t('dashboard.totalExpense')}
        value={formatCurrency(financials.totalExpense)}
        subtitle={t('dashboard.purchaseInvoices')}
        icon={FiTrendingDown}
        color="red"
      />
      <StatCard
        title={t('dashboard.netProfit')}
        value={formatCurrency(financials.netProfit)}
        subtitle={financials.netProfit >= 0 ? t('dashboard.profitable') : t('dashboard.loss')}
        icon={TbCurrencyLira}
        color={signColor(financials.netProfit)}
        highlighted
      />
    </div>
  );
}

interface DashboardCashCardsProps {
  financials: DashboardFinancials;
  stats: DashboardStats | null;
  className?: string;
}

export function DashboardCashCards({ financials, stats, className }: DashboardCashCardsProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6', className)}>
      <StatCard
        title={t('dashboard.totalCollected')}
        value={formatCurrency(financials.totalCollected)}
        subtitle={t('dashboard.fromCustomers')}
        icon={FiCreditCard}
        color="blue"
      />
      <StatCard
        title={t('dashboard.totalPaid')}
        value={formatCurrency(financials.totalPaid)}
        subtitle={t('dashboard.toSuppliers')}
        icon={FiCreditCard}
        color="orange"
      />
      <StatCard
        title={t('dashboard.totalReceivables')}
        value={formatCurrency(stats?.totalReceivables)}
        subtitle={t('dashboard.theyOweUs')}
        icon={FiUsers}
        color="green"
      />
      <StatCard
        title={t('dashboard.totalPayables')}
        value={formatCurrency(stats?.totalPayables)}
        subtitle={t('dashboard.weOweThem')}
        icon={FiUsers}
        color="red"
      />
    </div>
  );
}
