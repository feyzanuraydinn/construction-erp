import { useTranslation } from 'react-i18next';
import { StatCard, signColor } from '../../components/ui/StatCard';
import { Notice } from '../../components/ui/Notice';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { MONEY_TOLERANCE } from '../../utils/money';
import { budgetLevel, type BudgetLevel } from '../../utils/budget';
import type { ProjectFinancials } from '../../utils/financials';
import type { Project } from '../../types';
import { cn } from '../../utils/cn';

const BUDGET_CARD_COLORS: Record<BudgetLevel, 'green' | 'yellow' | 'red'> = {
  ok: 'green',
  warning: 'yellow',
  over: 'red',
};

interface ProjectStatsProps {
  financials: ProjectFinancials;
  isClientProject: boolean;
  className?: string;
}

export function ProjectResultStats({ financials, isClientProject, className }: ProjectStatsProps) {
  const { t } = useTranslation();
  const { totalIncome, totalExpense, totalPaymentIn, totalPaymentOut, projectProfit } = financials;

  return (
    <div className={cn('grid grid-cols-1 gap-4 mb-4 md:grid-cols-3', className)}>
      <StatCard
        title={
          isClientProject
            ? t('projectDetail.stats.projectIncome')
            : t('projectDetail.stats.totalIncome')
        }
        value={formatCurrency(totalIncome)}
        subtitle={t('projectDetail.stats.incomeBreakdown', {
          collected: formatCurrency(totalPaymentIn),
        })}
        color="green"
      />
      <StatCard
        title={
          isClientProject
            ? t('projectDetail.stats.projectCost')
            : t('projectDetail.stats.totalExpense')
        }
        value={formatCurrency(totalExpense)}
        subtitle={t('projectDetail.stats.expenseBreakdown', {
          paid: formatCurrency(totalPaymentOut),
        })}
        color="red"
      />
      <StatCard
        title={
          isClientProject
            ? t('projectDetail.stats.profitMargin')
            : t('projectDetail.stats.projectProfit')
        }
        value={formatCurrency(projectProfit)}
        subtitle={
          isClientProject
            ? t('projectDetail.stats.incomeMinusCost')
            : t('projectDetail.stats.incomeMinusExpense')
        }
        color={signColor(projectProfit)}
        highlighted
      />
    </div>
  );
}

interface UnmatchedPaymentsNoticeProps {
  financials: ProjectFinancials;
  className?: string;
}

export function UnmatchedPaymentsNotice({ financials, className }: UnmatchedPaymentsNoticeProps) {
  const { t } = useTranslation();
  const { unmatchedPaymentIn, unmatchedPaymentOut } = financials;
  const showPayments = unmatchedPaymentOut > MONEY_TOLERANCE;
  const showCollections = unmatchedPaymentIn > MONEY_TOLERANCE;
  if (!showPayments && !showCollections) return null;

  return (
    <Notice className={cn('mb-4', className)}>
      {showPayments && (
        <p>
          {t('projectDetail.stats.unmatchedPaymentsNotice', {
            amount: formatCurrency(unmatchedPaymentOut),
          })}
        </p>
      )}
      {showCollections && (
        <p>
          {t('projectDetail.stats.unmatchedCollectionsNotice', {
            amount: formatCurrency(unmatchedPaymentIn),
          })}
        </p>
      )}
    </Notice>
  );
}

interface ProjectBudgetStatsProps extends ProjectStatsProps {
  estimatedBudget: Project['estimated_budget'];
}

export function ProjectBudgetStats({
  financials,
  isClientProject,
  estimatedBudget,
  className,
}: ProjectBudgetStatsProps) {
  const { t } = useTranslation();
  const { estimatedProfit, budgetUsed, totalExpense, clientReceivable, projectDebt } = financials;

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 mb-6',
        isClientProject ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2',
        className
      )}
    >
      <StatCard
        title={t('projectDetail.stats.estimatedProfit')}
        value={estimatedProfit !== null ? formatCurrency(estimatedProfit) : '-'}
        subtitle={estimatedProfit === null ? t('projectDetail.stats.noBudget') : undefined}
        color={estimatedProfit === null ? 'gray' : signColor(estimatedProfit)}
        highlighted
      />
      <StatCard
        title={t('projectDetail.stats.budgetStatus')}
        value={estimatedBudget ? formatPercent(budgetUsed) : '-'}
        subtitle={
          estimatedBudget
            ? `${formatCurrency(totalExpense)} / ${formatCurrency(estimatedBudget)}`
            : t('projectDetail.stats.noBudget')
        }
        color={estimatedBudget ? BUDGET_CARD_COLORS[budgetLevel(budgetUsed)] : 'gray'}
      />
      {isClientProject && (
        <>
          <StatCard
            title={t('projectDetail.stats.clientReceivable')}
            value={formatCurrency(clientReceivable)}
            subtitle={t('projectDetail.stats.invoiceMinusCollection')}
            color={clientReceivable > 0 ? 'blue' : 'gray'}
          />
          <StatCard
            title={t('projectDetail.stats.projectDebt')}
            value={formatCurrency(projectDebt)}
            subtitle={t('projectDetail.stats.subcontractorDebt')}
            color={projectDebt > 0 ? 'orange' : 'gray'}
          />
        </>
      )}
    </div>
  );
}
