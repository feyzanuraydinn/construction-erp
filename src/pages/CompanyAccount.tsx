import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiBriefcase, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { PrintPreviewModal } from '../components/modals/PrintPreviewModal';
import { CompanyAccountPrintView } from '../components/shared/PrintView';
import {
  TransactionPageActions,
  TransactionBulkDelete,
} from '../components/transaction-list/TransactionListParts';
import { TransactionTable } from '../components/transaction-list/TransactionTable';
import { TransactionListDialogs } from '../components/transaction-list/TransactionListDialogs';
import { TransactionPrintOptions } from '../components/transaction-list/TransactionPrintOptions';
import { TransactionExportPreview } from '../components/transaction-list/TransactionExportPreview';
import { categoryOptions, companyAccountTypeOptions } from '../components/transaction-list/options';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Select } from '../components/ui/Input';
import { StatCard, signColor } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionList } from '../hooks/useTransactionList';
import { calculateTransactionTotals } from '../utils/financials';
import { getPaginationProps } from '../hooks/usePagination';
import { formatCurrency } from '../utils/formatters';
import { expenseTotalsByCategory } from '../utils/categories';
import { useLoadedData } from '../hooks/useLoadedData';
import { NO_ITEMS } from '../utils/emptyList';
import { PageHeader } from '../components/shared/PageHeader';

const loadCompanyAccount = () =>
  Promise.all([
    window.electronAPI.transaction.getAll({ scope: 'company' }),
    window.electronAPI.category.getAll(),
  ]).then(([transactions, categories]) => ({ transactions, categories }));

function CompanyAccount() {
  const { t } = useTranslation();
  const { data, loading, reload } = useLoadedData(
    loadCompanyAccount,
    'Company account load error:'
  );
  const transactions = data?.transactions ?? NO_ITEMS;
  const categories = data?.categories ?? NO_ITEMS;

  const list = useTransactionList({
    transactions,
    loadData: reload,
    exportPrefix: t('export.filenames.companyAccount'),
  });
  const { ui, dispatch, printRef, filteredTransactions, printTransactions, pagination } = list;

  const { totalIncome, totalExpense, netBalance } = calculateTransactionTotals(transactions);

  const typeChoices = companyAccountTypeOptions(t);
  const categoryChoices = categoryOptions(
    t,
    categories.filter(
      (c) => c.type === 'invoice_in' || c.type === 'invoice_out' || c.type === 'payment'
    )
  );

  const expenseByCategory = useMemo(
    () => expenseTotalsByCategory(t, transactions),
    [transactions, t]
  );

  return (
    <div className="page-container">
      <PageHeader
        title={t('companyAccount.pageTitle')}
        subtitle={t('companyAccount.pageDescription')}
      >
        <TransactionPageActions list={list} printOptions />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        <StatCard
          title={t('companyAccount.stats.generalIncome')}
          value={formatCurrency(totalIncome)}
          icon={FiTrendingUp}
          color="green"
        />
        <StatCard
          title={t('companyAccount.stats.generalExpense')}
          value={formatCurrency(totalExpense)}
          icon={FiTrendingDown}
          color="red"
        />
        <StatCard
          title={t('companyAccount.stats.netStatus')}
          value={formatCurrency(netBalance)}
          icon={FiBriefcase}
          color={signColor(netBalance)}
          highlighted
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{t('companyAccount.expenseBreakdown')}</h3>
          </CardHeader>
          <CardBody>
            {Object.keys(expenseByCategory).length === 0 ? (
              <p className="p-4 text-sm text-center text-gray-500 dark:text-gray-400">
                {t('companyAccount.noExpenseRecords')}
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {Object.entries(expenseByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between gap-2 px-4 py-3"
                    >
                      <span
                        className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0"
                        title={category}
                      >
                        {category}
                      </span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap flex-shrink-0">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{t('companyAccount.transactions')}</h3>
                <TransactionBulkDelete list={list} />
              </div>
              <div className="flex gap-2">
                <Select
                  options={typeChoices}
                  value={ui.filterType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    dispatch({ type: 'SET_FILTER', filterType: e.target.value })
                  }
                  placeholder={t('companyAccount.filters.typePlaceholder')}
                  className="w-28"
                />
                <Select
                  options={categoryChoices}
                  value={ui.filterCategory}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    dispatch({ type: 'SET_FILTER', filterCategory: e.target.value })
                  }
                  placeholder={t('companyAccount.filters.categoryPlaceholder')}
                  className="w-40"
                />
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <LoadingSpinner />
              ) : filteredTransactions.length === 0 ? (
                <EmptyState
                  icon={FiBriefcase}
                  title={t('shared.transactionNotFound')}
                  description={t('companyAccount.emptyDescription')}
                  action={() => dispatch({ type: 'OPEN_NEW_TRANSACTION' })}
                  actionLabel={t('shared.newTransaction')}
                  actionIcon={FiPlus}
                />
              ) : (
                <TransactionTable list={list} variant="simple" />
              )}
              <Pagination {...getPaginationProps(pagination)} />
            </CardBody>
          </Card>
        </div>
      </div>

      <TransactionListDialogs list={list} scope="company" categories={categories} mode="simple" />

      <TransactionPrintOptions
        list={list}
        typeOptions={typeChoices}
        categoryOptions={categoryChoices}
      />

      <PrintPreviewModal
        isOpen={ui.printPreviewOpen}
        onClose={() => dispatch({ type: 'CLOSE_PRINT_PREVIEW' })}
      >
        <CompanyAccountPrintView
          ref={printRef}
          transactions={printTransactions}
          filters={ui.printFilters}
          categories={categories}
        />
      </PrintPreviewModal>

      <TransactionExportPreview
        list={list}
        typeOptions={typeChoices}
        categoryOptions={categoryChoices}
      />
    </div>
  );
}

export default CompanyAccount;
