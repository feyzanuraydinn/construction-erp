import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { calculateProjectFinancials, calculateTransactionTotals } from '../../utils/financials';
import type {
  Project,
  Company,
  TransactionWithDetails,
  Category,
  CategoryBreakdown,
} from '../../types';
import { expenseTotalsByCategory, labelBreakdown } from '../../utils/categories';
import { budgetLevel } from '../../utils/budget';
import { PrintPage } from './print/PrintPage';
import { PrintHeader } from './print/PrintHeader';
import { PrintStats, incomeExpenseStats } from './print/PrintStats';
import { PrintFilterSummary } from './print/PrintFilterSummary';
import type { PrintFilters } from '../../hooks/useTransactionList';
import { PrintCategoryTable } from './print/PrintCategoryTable';
import { PrintTransactionTable } from './print/PrintTransactionTable';
import { PrintPartiesTable, type PrintParty } from './print/PrintPartiesTable';
import { ProjectPrintInfo } from './print/ProjectPrintInfo';
import { CompanyPrintInfo } from './print/CompanyPrintInfo';
import { signTextColor } from './print/signTextColor';

interface ProjectPrintViewProps {
  project: Project;
  transactions: TransactionWithDetails[];
  categoryBreakdown: CategoryBreakdown[];
  parties?: PrintParty[];
  className?: string;
}

export const ProjectPrintView = forwardRef<HTMLDivElement, ProjectPrintViewProps>(
  ({ project, transactions, categoryBreakdown, parties, className }, ref) => {
    const { t } = useTranslation();
    const { totalIncome, totalExpense, projectProfit, estimatedProfit, budgetUsed } =
      calculateProjectFinancials(transactions, project.ownership_type, project.estimated_budget);

    return (
      <PrintPage ref={ref} className={className}>
        <PrintHeader
          title={project.name}
          subtitle={t('print.projectCode', {
            code: project.code,
            ownership: t(`enums.ownershipType.${project.ownership_type}`),
          })}
        />

        <ProjectPrintInfo project={project} />

        <PrintStats
          stats={[
            ...incomeExpenseStats(
              { label: t('print.totalIncome'), amount: totalIncome },
              { label: t('print.totalExpense'), amount: totalExpense }
            ),
            {
              label: t('print.projectProfit'),
              value: formatCurrency(projectProfit),
              color: signTextColor(projectProfit),
            },
            {
              label: t('print.budgetUsage'),
              value: project.estimated_budget ? formatPercent(budgetUsed) : '-',
              color: budgetLevel(budgetUsed) === 'over' ? 'text-red-700' : 'text-gray-900',
            },
          ]}
        />
        <PrintStats
          stats={[
            {
              label: t('print.estimatedProfit'),
              value: estimatedProfit !== null ? formatCurrency(estimatedProfit) : '-',
              color: estimatedProfit === null ? 'text-gray-900' : signTextColor(estimatedProfit),
            },
          ]}
        />

        <PrintCategoryTable rows={labelBreakdown(t, categoryBreakdown)} />

        <PrintPartiesTable parties={parties} />

        <PrintTransactionTable transactions={transactions} showCompany={true} />
      </PrintPage>
    );
  }
);

ProjectPrintView.displayName = 'ProjectPrintView';

interface CompanyPrintViewProps {
  company: Company;
  transactions: TransactionWithDetails[];
  filters: PrintFilters;
  categories?: Category[];
  className?: string;
}

export const CompanyPrintView = forwardRef<HTMLDivElement, CompanyPrintViewProps>(
  ({ company, transactions, filters, categories = [], className }, ref) => {
    const { t } = useTranslation();
    const { totalIncome, totalExpense, netBalance } = calculateTransactionTotals(transactions);

    return (
      <PrintPage ref={ref} className={className}>
        <PrintHeader
          title={company.name}
          subtitle={`${t(`enums.companyType.${company.type}`, company.type)} | ${t(`enums.accountType.${company.account_type}`, company.account_type)}`}
        />

        <CompanyPrintInfo company={company} />

        <PrintFilterSummary filters={filters} categories={categories} />

        <PrintStats
          stats={[
            ...incomeExpenseStats(
              { label: t('print.periodIncome'), amount: totalIncome },
              { label: t('print.periodExpense'), amount: totalExpense }
            ),
            {
              label: t('print.periodNet'),
              value: formatCurrency(netBalance),
              color: signTextColor(netBalance),
            },
            { label: t('print.transactionCount'), value: transactions.length.toString() },
          ]}
        />

        <PrintTransactionTable transactions={transactions} showCompany={false} />
      </PrintPage>
    );
  }
);

CompanyPrintView.displayName = 'CompanyPrintView';

interface CompanyAccountPrintViewProps {
  transactions: TransactionWithDetails[];
  filters: PrintFilters;
  categories?: Category[];
  className?: string;
}

export const CompanyAccountPrintView = forwardRef<HTMLDivElement, CompanyAccountPrintViewProps>(
  ({ transactions, filters, categories = [], className }, ref) => {
    const { t } = useTranslation();
    const { totalIncome, totalExpense, netBalance } = calculateTransactionTotals(transactions);

    const expenseByCategory = expenseTotalsByCategory(t, transactions);

    return (
      <PrintPage ref={ref} className={className}>
        <PrintHeader
          title={t('print.companyAccountReport')}
          subtitle={t('print.generalCompanyIncomeExpense')}
        />

        <PrintFilterSummary filters={filters} categories={categories} />

        <PrintStats
          stats={[
            ...incomeExpenseStats(
              { label: t('print.totalIncome'), amount: totalIncome },
              { label: t('print.totalExpense'), amount: totalExpense }
            ),
            {
              label: t('print.netStatus'),
              value: formatCurrency(netBalance),
              color: signTextColor(netBalance),
            },
            { label: t('print.transactionCount'), value: transactions.length.toString() },
          ]}
        />

        <PrintCategoryTable
          rows={Object.entries(expenseByCategory)
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total)}
        />

        <PrintTransactionTable transactions={transactions} showCompany={false} />
      </PrintPage>
    );
  }
);

CompanyAccountPrintView.displayName = 'CompanyAccountPrintView';
