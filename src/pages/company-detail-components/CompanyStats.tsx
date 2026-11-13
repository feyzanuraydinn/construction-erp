import { useTranslation } from 'react-i18next';
import { StatCard, signColor, type StatCardColor } from '../../components/ui/StatCard';
import { formatCurrency } from '../../utils/formatters';
import type { CompanyFinancials } from '../../utils/financials';
import { cn } from '../../utils/cn';

interface FlowCard {
  amount: 'totalInvoiceOut' | 'totalPaymentIn' | 'totalInvoiceIn' | 'totalPaymentOut';
  titleKey: string;
  subtitleKey: string;
  color: StatCardColor;
}

const FLOW_CARDS: FlowCard[] = [
  {
    amount: 'totalInvoiceOut',
    titleKey: 'companyDetail.stats.salesInvoices',
    subtitleKey: 'companyDetail.stats.salesInvoicesSubtitle',
    color: 'green',
  },
  {
    amount: 'totalPaymentIn',
    titleKey: 'companyDetail.stats.collections',
    subtitleKey: 'companyDetail.stats.collectionsSubtitle',
    color: 'blue',
  },
  {
    amount: 'totalInvoiceIn',
    titleKey: 'companyDetail.stats.purchaseInvoices',
    subtitleKey: 'companyDetail.stats.purchaseInvoicesSubtitle',
    color: 'red',
  },
  {
    amount: 'totalPaymentOut',
    titleKey: 'companyDetail.stats.payments',
    subtitleKey: 'companyDetail.stats.paymentsSubtitle',
    color: 'orange',
  },
];

interface CompanyStatsProps {
  financials: CompanyFinancials;
  className?: string;
}

export function CompanyFlowStats({ financials, className }: CompanyStatsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 xl:grid-cols-4', className)}>
      {FLOW_CARDS.map(({ amount, titleKey, subtitleKey, color }) => (
        <StatCard
          key={amount}
          title={t(titleKey)}
          value={formatCurrency(financials[amount])}
          subtitle={t(subtitleKey)}
          color={color}
        />
      ))}
    </div>
  );
}

export function CompanyBalanceStats({ financials, className }: CompanyStatsProps) {
  const { t } = useTranslation();
  const { receivable, payable, balance, receivableFromOverpayment, payableFromOverpayment } =
    financials;

  return (
    <div className={cn('grid grid-cols-1 gap-4 mb-6 md:grid-cols-3', className)}>
      <StatCard
        title={t('companyDetail.stats.receivableBalance')}
        value={formatCurrency(receivable)}
        subtitle={
          receivableFromOverpayment
            ? t('companyDetail.stats.overpaymentMade')
            : t('companyDetail.stats.owesToUs')
        }
        color={receivableFromOverpayment ? 'purple' : 'green'}
      />
      <StatCard
        title={t('companyDetail.stats.debtBalance')}
        value={formatCurrency(payable)}
        subtitle={
          payableFromOverpayment
            ? t('companyDetail.stats.overpaymentReceived')
            : t('companyDetail.stats.weOwe')
        }
        color={payableFromOverpayment ? 'purple' : 'red'}
      />
      <StatCard
        title={t('companyDetail.stats.netBalance')}
        value={formatCurrency(balance)}
        subtitle={
          balance >= 0
            ? t('companyDetail.stats.netReceivable')
            : t('companyDetail.stats.netPayable')
        }
        color={signColor(balance)}
        highlighted
      />
    </div>
  );
}
