import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getPrintTransactionTextColor, isPositiveTransaction } from '../../utils/transactionHelpers';
import { calculateProjectFinancials, calculateTransactionTotals } from '../../utils/financials';
import type {
  Project,
  Company,
  TransactionWithDetails,
  AccountType,
  Category,
} from '../../types';

// ==================== SHARED PRINT UTILITIES ====================

interface PrintFilters {
  type?: string;
  category_id?: string | number;
  startDate?: string;
  endDate?: string;
}

function getCategoryName(categoryId: string | number, categories: Category[]): string | null {
  const cat = categories.find(
    (c) => c.id === (typeof categoryId === 'string' ? parseInt(categoryId) : categoryId)
  );
  return cat ? cat.name : null;
}

function buildFilterDescription(
  filters: PrintFilters,
  categories: Category[],
  t: (key: string, options?: Record<string, unknown>) => string
): string[] {
  const parts: string[] = [];
  if (filters.type)
    parts.push(
      t('print.filterType', { value: t(`print.transactionTypeLabels.${filters.type}`, { defaultValue: filters.type }) })
    );
  if (filters.category_id) {
    const catName = getCategoryName(filters.category_id, categories);
    if (catName) parts.push(t('print.filterCategory', { value: catName }));
  }
  if (filters.startDate) parts.push(t('print.filterStartDate', { value: formatDate(filters.startDate) }));
  if (filters.endDate) parts.push(t('print.filterEndDate', { value: formatDate(filters.endDate) }));
  return parts;
}

// Print header component
interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  date?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, date }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-6 pb-4 border-b-2 border-gray-800">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      <p className="text-sm text-gray-500 mt-2">
        {t('print.reportDate')} {formatDate(date || new Date().toISOString())}
      </p>
    </div>
  );
};

// Stats row for print
interface PrintStat {
  label: string;
  value: string;
  color?: string;
}

interface PrintStatsProps {
  stats: PrintStat[];
}

export const PrintStats: React.FC<PrintStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-gray-50 p-3 rounded border">
          <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
          <p className={`text-lg font-bold ${stat.color || 'text-gray-900'}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

// Transaction table for print
interface PrintTransactionTableProps {
  transactions: TransactionWithDetails[];
  showCompany?: boolean;
}

export const PrintTransactionTable: React.FC<PrintTransactionTableProps> = ({
  transactions,
  showCompany = true,
}) => {
  const { t } = useTranslation();
  const {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    totalIncome,
    totalExpense,
  } = calculateTransactionTotals(transactions);

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{t('print.transactionList')}</h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.date')}</th>
            <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.type')}</th>
            <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.description')}</th>
            {showCompany && <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.company')}</th>}
            <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.category')}</th>
            <th className="border border-gray-300 px-2 py-1.5 text-right">{t('print.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td className="border border-gray-300 px-2 py-1">{formatDate(tx.date)}</td>
              <td className="border border-gray-300 px-2 py-1">
                <span className={getPrintTransactionTextColor(tx.type)}>
                  {t(`print.transactionTypeLabels.${tx.type}`)}
                </span>
              </td>
              <td className="border border-gray-300 px-2 py-1">{tx.description}</td>
              {showCompany && (
                <td className="border border-gray-300 px-2 py-1">{tx.company_name || '-'}</td>
              )}
              <td className="border border-gray-300 px-2 py-1">{tx.category_name ? t(`categories.${tx.category_name}`, tx.category_name) : '-'}</td>
              <td
                className={`border border-gray-300 px-2 py-1 text-right font-medium ${getPrintTransactionTextColor(tx.type)}`}
              >
                {isPositiveTransaction(tx.type) ? '+' : '-'}
                {formatCurrency(tx.amount_try || tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-medium">
            <td
              colSpan={showCompany ? 5 : 4}
              className="border border-gray-300 px-2 py-1.5 text-right"
            >
              {t('print.salesInvoice')}
            </td>
            <td className="border border-gray-300 px-2 py-1.5 text-right text-green-700">
              +{formatCurrency(totalInvoiceOut)}
            </td>
          </tr>
          <tr className="bg-gray-50 font-medium">
            <td
              colSpan={showCompany ? 5 : 4}
              className="border border-gray-300 px-2 py-1.5 text-right"
            >
              {t('print.collection')}
            </td>
            <td className="border border-gray-300 px-2 py-1.5 text-right text-blue-700">
              +{formatCurrency(totalPaymentIn)}
            </td>
          </tr>
          <tr className="bg-gray-50 font-medium">
            <td
              colSpan={showCompany ? 5 : 4}
              className="border border-gray-300 px-2 py-1.5 text-right"
            >
              {t('print.purchaseInvoice')}
            </td>
            <td className="border border-gray-300 px-2 py-1.5 text-right text-red-700">
              -{formatCurrency(totalInvoiceIn)}
            </td>
          </tr>
          <tr className="bg-gray-50 font-medium">
            <td
              colSpan={showCompany ? 5 : 4}
              className="border border-gray-300 px-2 py-1.5 text-right"
            >
              {t('print.payment')}
            </td>
            <td className="border border-gray-300 px-2 py-1.5 text-right text-orange-700">
              -{formatCurrency(totalPaymentOut)}
            </td>
          </tr>
          <tr className="bg-gray-100 font-bold">
            <td
              colSpan={showCompany ? 5 : 4}
              className="border border-gray-300 px-2 py-1.5 text-right"
            >
              {t('print.net')}
            </td>
            <td
              className={`border border-gray-300 px-2 py-1.5 text-right ${totalIncome - totalExpense >= 0 ? 'text-green-700' : 'text-red-700'}`}
            >
              {formatCurrency(totalIncome - totalExpense)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// Category breakdown type
interface CategoryBreakdown {
  category: string;
  total: number;
}

// Project party type
interface ProjectParty {
  id: number;
  role: AccountType;
  company_name: string;
  phone?: string | null;
  email?: string | null;
}

// Project Print View
interface ProjectPrintViewProps {
  project: Project;
  transactions: TransactionWithDetails[];
  categoryBreakdown: CategoryBreakdown[];
  parties?: ProjectParty[];
}

export const ProjectPrintView = forwardRef<HTMLDivElement, ProjectPrintViewProps>(
  ({ project, transactions, categoryBreakdown, parties }, ref) => {
    const { t } = useTranslation();
    const {
      totalIncome,
      totalExpense,
      projectProfit,
      estimatedProfit,
      budgetUsed,
    } = calculateProjectFinancials(transactions, project.ownership_type, project.estimated_budget);

    return (
      <div
        ref={ref}
        className="p-8 bg-white min-h-screen print-content"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <PrintHeader
          title={project.name}
          subtitle={t('print.projectCode', { code: project.code, ownership: project.ownership_type === 'own' ? t('print.ownProject') : t('print.clientProject') })}
        />

        {/* Project Info */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('print.projectInfo')}</h3>
            <table className="text-sm">
              <tbody>
                {project.location && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.location')}</td>
                    <td>{project.location}</td>
                  </tr>
                )}
                {project.total_area && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.area')}</td>
                    <td>{project.total_area} m²</td>
                  </tr>
                )}
                {project.unit_count && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.unitCount')}</td>
                    <td>{project.unit_count}</td>
                  </tr>
                )}
                {project.estimated_budget && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.estimatedBudget')}</td>
                    <td>{formatCurrency(project.estimated_budget)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('print.dates')}</h3>
            <table className="text-sm">
              <tbody>
                {project.planned_start && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.plannedStart')}</td>
                    <td>{formatDate(project.planned_start)}</td>
                  </tr>
                )}
                {project.planned_end && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.plannedEnd')}</td>
                    <td>{formatDate(project.planned_end)}</td>
                  </tr>
                )}
                {project.actual_start && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.actualStart')}</td>
                    <td>{formatDate(project.actual_start)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <PrintStats
          stats={[
            { label: t('print.totalIncome'), value: formatCurrency(totalIncome), color: 'text-green-700' },
            { label: t('print.totalExpense'), value: formatCurrency(totalExpense), color: 'text-red-700' },
            {
              label: t('print.projectProfit'),
              value: formatCurrency(projectProfit),
              color: projectProfit >= 0 ? 'text-green-700' : 'text-red-700',
            },
            {
              label: t('print.budgetUsage'),
              value: project.estimated_budget ? `%${budgetUsed.toFixed(0)}` : '-',
              color: budgetUsed > 100 ? 'text-red-700' : 'text-gray-900',
            },
          ]}
        />
        <PrintStats
          stats={[
            {
              label: t('print.estimatedProfit'),
              value: estimatedProfit !== null ? formatCurrency(estimatedProfit) : '-',
              color: estimatedProfit === null ? 'text-gray-500' : estimatedProfit >= 0 ? 'text-green-700' : 'text-red-700',
            },
            {
              label: t('print.budgetUsage'),
              value: project.estimated_budget ? `%${budgetUsed.toFixed(0)}` : '-',
              color: budgetUsed > 100 ? 'text-red-700' : 'text-gray-900',
            },
          ]}
        />

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">{t('print.expenseBreakdown')}</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.category')}</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">{t('print.amount')}</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">{t('print.ratio')}</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((cat, index) => {
                  const total = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);
                  return (
                    <tr key={index}>
                      <td className="border border-gray-300 px-2 py-1">{cat.category}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {formatCurrency(cat.total)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {((cat.total / total) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Parties */}
        {parties && parties.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">{t('print.stakeholders')}</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.role')}</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.company')}</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.phone')}</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.email')}</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party.id}>
                    <td className="border border-gray-300 px-2 py-1">
                      {t(`print.roleLabels.${party.role}`, party.role)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1">{party.company_name}</td>
                    <td className="border border-gray-300 px-2 py-1">{party.phone || '-'}</td>
                    <td className="border border-gray-300 px-2 py-1">{party.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions */}
        <PrintTransactionTable transactions={transactions} showCompany={true} />

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
          {t('print.footerReport', { date: formatDate(new Date().toISOString()) })}
        </div>
      </div>
    );
  }
);

ProjectPrintView.displayName = 'ProjectPrintView';

// Company Print View
interface CompanyPrintViewProps {
  company: Company;
  transactions: TransactionWithDetails[];
  filters: PrintFilters;
  categories?: Category[];
}

export const CompanyPrintView = forwardRef<HTMLDivElement, CompanyPrintViewProps>(
  ({ company, transactions, filters, categories = [] }, ref) => {
    const { t } = useTranslation();
    // Transactions are already filtered by CompanyDetail, use directly
    const {
      totalIncome,
      totalExpense,
    } = calculateTransactionTotals(transactions);

    const filterParts = buildFilterDescription(filters, categories, t);
    const hasFilters = filterParts.length > 0;

    return (
      <div
        ref={ref}
        className="p-8 bg-white min-h-screen print-content"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <PrintHeader
          title={company.name}
          subtitle={`${t(`print.typeLabels.${company.type}`, company.type)} | ${t(`print.accountTypeLabels.${company.account_type}`, company.account_type)}`}
        />

        {/* Company Info */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('print.contactInfo')}</h3>
            <table className="text-sm">
              <tbody>
                {company.phone && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.phoneLine')}</td>
                    <td>{company.phone}</td>
                  </tr>
                )}
                {company.email && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.emailLine')}</td>
                    <td>{company.email}</td>
                  </tr>
                )}
                {company.address && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.addressLine')}</td>
                    <td>{company.address}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('print.taxInfo')}</h3>
            <table className="text-sm">
              <tbody>
                {company.tax_office && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.taxOffice')}</td>
                    <td>{company.tax_office}</td>
                  </tr>
                )}
                {company.tax_number && (
                  <tr>
                    <td className="pr-4 py-1 text-gray-500">{t('print.taxNumber')}</td>
                    <td>{company.tax_number}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Filter info */}
        {hasFilters && (
          <div className="mb-4 p-3 bg-gray-50 rounded border text-sm">
            <span className="font-medium">{t('print.appliedFilters')} </span>
            {filterParts.join(' | ')}
          </div>
        )}

        {/* Financial Summary */}
        <PrintStats
          stats={[
            { label: t('print.periodIncome'), value: formatCurrency(totalIncome), color: 'text-green-700' },
            { label: t('print.periodExpense'), value: formatCurrency(totalExpense), color: 'text-red-700' },
            {
              label: t('print.periodNet'),
              value: formatCurrency(totalIncome - totalExpense),
              color: totalIncome - totalExpense >= 0 ? 'text-green-700' : 'text-red-700',
            },
            { label: t('print.transactionCount'), value: transactions.length.toString() },
          ]}
        />

        {/* Transactions */}
        <PrintTransactionTable transactions={transactions} showCompany={false} />

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
          {t('print.footerReport', { date: formatDate(new Date().toISOString()) })}
        </div>
      </div>
    );
  }
);

CompanyPrintView.displayName = 'CompanyPrintView';

// Company Account Print View (Firma Hesabı)
interface CompanyAccountPrintViewProps {
  transactions: TransactionWithDetails[];
  filters: PrintFilters;
  categories?: Category[];
}

export const CompanyAccountPrintView = forwardRef<HTMLDivElement, CompanyAccountPrintViewProps>(
  ({ transactions, filters, categories = [] }, ref) => {
    const { t } = useTranslation();
    const {
      totalInvoiceOut,
      totalPaymentIn,
      totalInvoiceIn,
      totalPaymentOut,
      totalIncome,
      totalExpense,
    } = calculateTransactionTotals(transactions);

    const filterParts = buildFilterDescription(filters, categories, t);
    const hasFilters = filterParts.length > 0;

    // Group by category for summary (invoice_in and payment_out are expenses)
    const expenseByCategory = transactions
      .filter((t) => t.type === 'invoice_in' || t.type === 'payment_out')
      .reduce<Record<string, number>>((acc, t) => {
        const catName = t.category_name || 'Other';
        acc[catName] = (acc[catName] || 0) + (t.amount_try || t.amount);
        return acc;
      }, {});

    return (
      <div
        ref={ref}
        className="p-8 bg-white min-h-screen print-content"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <PrintHeader title={t('print.companyAccountReport')} subtitle={t('print.generalCompanyIncomeExpense')} />

        {/* Filter info */}
        {hasFilters && (
          <div className="mb-4 p-3 bg-gray-50 rounded border text-sm">
            <span className="font-medium">{t('print.appliedFilters')} </span>
            {filterParts.join(' | ')}
          </div>
        )}

        {/* Financial Summary */}
        <PrintStats
          stats={[
            { label: t('print.totalIncome'), value: formatCurrency(totalIncome), color: 'text-green-700' },
            { label: t('print.totalExpense'), value: formatCurrency(totalExpense), color: 'text-red-700' },
            {
              label: t('print.netStatus'),
              value: formatCurrency(totalIncome - totalExpense),
              color: totalIncome - totalExpense >= 0 ? 'text-green-700' : 'text-red-700',
            },
            { label: t('print.transactionCount'), value: transactions.length.toString() },
          ]}
        />

        {/* Category Breakdown */}
        {Object.keys(expenseByCategory).length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">{t('print.expenseBreakdown')}</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.category')}</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">{t('print.amount')}</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-right">{t('print.ratio')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(expenseByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount], index) => {
                    return (
                      <tr key={index}>
                        <td className="border border-gray-300 px-2 py-1">{category}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {formatCurrency(amount)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {((amount / totalExpense) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">{t('print.transactionList')}</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.date')}</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.type')}</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.category')}</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">{t('print.description')}</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">{t('print.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="border border-gray-300 px-2 py-1">{formatDate(tx.date)}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    <span className={getPrintTransactionTextColor(tx.type)}>
                      {t(`print.transactionTypeLabels.${tx.type}`)}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-2 py-1">{tx.category_name ? t(`categories.${tx.category_name}`, tx.category_name) : '-'}</td>
                  <td className="border border-gray-300 px-2 py-1">{tx.description}</td>
                  <td
                    className={`border border-gray-300 px-2 py-1 text-right font-medium ${getPrintTransactionTextColor(tx.type)}`}
                  >
                    {isPositiveTransaction(tx.type) ? '+' : '-'}
                    {formatCurrency(tx.amount_try || tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={4} className="border border-gray-300 px-2 py-1.5 text-right">
                  {t('print.salesInvoice')}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right text-green-700">
                  +{formatCurrency(totalInvoiceOut)}
                </td>
              </tr>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={4} className="border border-gray-300 px-2 py-1.5 text-right">
                  {t('print.collection')}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right text-blue-700">
                  +{formatCurrency(totalPaymentIn)}
                </td>
              </tr>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={4} className="border border-gray-300 px-2 py-1.5 text-right">
                  {t('print.purchaseInvoice')}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right text-red-700">
                  -{formatCurrency(totalInvoiceIn)}
                </td>
              </tr>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={4} className="border border-gray-300 px-2 py-1.5 text-right">
                  {t('print.payment')}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right text-orange-700">
                  -{formatCurrency(totalPaymentOut)}
                </td>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={4} className="border border-gray-300 px-2 py-1.5 text-right">
                  {t('print.net')}
                </td>
                <td
                  className={`border border-gray-300 px-2 py-1.5 text-right ${totalIncome - totalExpense >= 0 ? 'text-green-700' : 'text-red-700'}`}
                >
                  {formatCurrency(totalIncome - totalExpense)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
          {t('print.footerReport', { date: formatDate(new Date().toISOString()) })}
        </div>
      </div>
    );
  }
);

CompanyAccountPrintView.displayName = 'CompanyAccountPrintView';
