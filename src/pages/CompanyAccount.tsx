import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiBriefcase,
  FiTrendingUp,
  FiTrendingDown,
  FiPrinter,
  FiEye,
  FiDownload,
} from 'react-icons/fi';
import { PrintPreviewModal, TransactionModal } from '../components/modals';
import { TransactionDetailView, CompanyAccountPrintView } from '../components/shared';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Modal,
  ModalBody,
  ModalFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  StatCard,
  Badge,
  EmptyState,
  ConfirmDialog,
  Pagination,
  LoadingSpinner,
  Divider,
  SelectAllCheckbox,
  RowCheckbox,
} from '../components/ui';
import { useTransactionList, calculateTransactionTotals, getPaginationProps } from '../hooks';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getSimpleTransactionTextColor, getSimpleTransactionBadgeVariant, isPositiveTransaction } from '../utils/transactionHelpers';
import type { TransactionWithDetails, Category } from '../types';

function CompanyAccount() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Shared transaction list hook (reducer, handlers, pagination, etc.)
  const {
    ui,
    dispatch,
    printRef,
    viewingAllocations,
    filteredTransactions,
    paginatedTransactions,
    pagination,
    handleDeleteTransaction,
    handleSelectAll,
    handleSelectOne,
    handleBulkDelete,
    handleSaveTransaction,
    handleExport,
  } = useTransactionList({
    transactions,
    loadData,
    exportPrefix: 'firma-hesabi',
  });

  // Firma hesabı için basitleştirilmiş işlem türleri
  const COMPANY_TRANSACTION_TYPES = [
    { value: 'invoice_out', label: t('companyAccount.types.income') },
    { value: 'invoice_in', label: t('companyAccount.types.expense') },
  ];

  // Firma hesabı için basit etiketler
  const COMPANY_TYPE_LABELS: Record<string, string> = {
    invoice_out: t('companyAccount.types.income'),
    payment_in: t('companyAccount.types.income'),
    invoice_in: t('companyAccount.types.expense'),
    payment_out: t('companyAccount.types.expense'),
  };

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    Promise.all([
      window.electronAPI.transaction.getAll({ scope: 'company' }),
      window.electronAPI.category.getAll(),
    ])
      .then(([txData, categoriesData]) => {
        setTransactions(Array.isArray(txData) ? txData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      })
      .catch((error) => console.error('Load error:', error))
      .finally(() => setLoading(false));
  }

  const handlePrint = () => {
    dispatch({ type: 'OPEN_PRINT_MODAL' });
  };

  const getFilteredTransactionsForPrint = () => {
    return transactions.filter((tx) => {
      if (ui.printFilters.type && tx.type !== ui.printFilters.type) return false;
      if (ui.printFilters.category_id && tx.category_id !== parseInt(ui.printFilters.category_id))
        return false;
      if (ui.printFilters.startDate && tx.date < ui.printFilters.startDate) return false;
      if (ui.printFilters.endDate && tx.date > ui.printFilters.endDate) return false;
      return true;
    });
  };

  const showPreview = () => {
    dispatch({ type: 'OPEN_PRINT_PREVIEW' });
  };

  // Merkezi hesaplama fonksiyonu ile firma hesabı toplamları
  const { totalIncome, totalExpense, netBalance } = calculateTransactionTotals(transactions);

  const invoiceCategories = categories.filter(
    (c) => c.type === 'invoice_in' || c.type === 'invoice_out'
  );
  const paymentCategories = categories.filter((c) => c.type === 'payment');

  // Group expenses by category for summary
  const expenseByCategory = useMemo(() => transactions
    .filter((tx) => !isPositiveTransaction(tx.type))
    .reduce<Record<string, number>>((acc, tx) => {
      const catName = tx.category_name || t('companyAccount.otherCategory');
      acc[catName] = (acc[catName] || 0) + (tx.amount_try || tx.amount);
      return acc;
    }, {}), [transactions, t]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('companyAccount.pageTitle')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('companyAccount.pageDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={FiDownload} onClick={handleExport}>{t('common.exportToExcel')}</Button>
          <Button variant="secondary" icon={FiPrinter} onClick={handlePrint}>{t('common.print')}</Button>
          <Button icon={FiPlus} onClick={() => dispatch({ type: 'OPEN_NEW_TRANSACTION' })}>
            {t('shared.newTransaction')}
          </Button>
        </div>
      </div>

      {/* Stats */}
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
          color={netBalance >= 0 ? 'green' : 'red'}
          highlighted
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left - Category Summary */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">{t('companyAccount.expenseBreakdown')}</h3>
          </CardHeader>
          <CardBody className="p-0">
            {Object.keys(expenseByCategory).length === 0 ? (
              <p className="p-4 text-sm text-center text-gray-500 dark:text-gray-400">{t('companyAccount.noExpenseRecords')}</p>
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

        {/* Right - Transactions */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{t('companyAccount.transactions')}</h3>
                {ui.selectedIds.size > 0 && (
                  <>
                    <Divider />
                    <Button variant="ghost-danger" size="sm" icon={FiTrash2} onClick={() => dispatch({ type: 'OPEN_BULK_DELETE' })}>{t('shared.bulkDeleteCount', { count: ui.selectedIds.size })}</Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Select
                  options={COMPANY_TRANSACTION_TYPES}
                  value={ui.filterType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    dispatch({ type: 'SET_FILTER', filterType: e.target.value })
                  }
                  placeholder={t('companyAccount.filters.typePlaceholder')}
                  className="w-28"
                />
                <Select
                  options={[...invoiceCategories, ...paymentCategories].map((c) => ({
                    value: c.id,
                    label: t(`categories.${c.name}`, c.name),
                  }))}
                  value={ui.filterCategory}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    dispatch({ type: 'SET_FILTER', filterCategory: e.target.value })
                  }
                  placeholder={t('companyAccount.filters.categoryPlaceholder')}
                  className="w-40"
                />
              </div>
            </CardHeader>
            <CardBody className="p-0">
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
                <Table>
                  <TableHeader>
                    <TableRow hover={false}>
                      <TableHead className="w-10">
                        <SelectAllCheckbox
                          itemIds={paginatedTransactions.map((tx) => tx.id)}
                          selectedIds={ui.selectedIds}
                          onSelectAll={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>{t('common.type')}</TableHead>
                      <TableHead>{t('common.category')}</TableHead>
                      <TableHead>{t('common.description')}</TableHead>
                      <TableHead className="text-right">{t('common.amount')}</TableHead>
                      <TableHead className="text-center">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        selected={ui.selectedIds.has(tx.id)}
                        onClick={() => dispatch({ type: 'VIEW_TRANSACTION', transaction: tx })}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <RowCheckbox
                            id={tx.id}
                            selectedIds={ui.selectedIds}
                            onSelectOne={handleSelectOne}
                          />
                        </TableCell>
                        <TableCell>{formatDate(tx.date)}</TableCell>
                        <TableCell>
                          <Badge variant={getSimpleTransactionBadgeVariant(tx.type)}>
                            {COMPANY_TYPE_LABELS[tx.type] || tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tx.category_name ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${tx.category_color}20`,
                                color: tx.category_color || undefined,
                              }}
                            >
                              {t(`categories.${tx.category_name}`, tx.category_name)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{tx.description}</p>
                          {tx.document_no && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('companyAccount.documentPrefix', { no: tx.document_no })}</p>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${getSimpleTransactionTextColor(tx.type)}`}
                        >
                          {isPositiveTransaction(tx.type) ? '+' : '-'}
                          {formatCurrency(tx.amount_try || tx.amount)}
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost-warning" size="icon" icon={FiEdit2} onClick={() => dispatch({ type: 'EDIT_TRANSACTION', transaction: tx })} title={t('common.edit')} />
                            <Button variant="ghost-danger" size="icon" icon={FiTrash2} onClick={() => dispatch({ type: 'CONFIRM_DELETE', transaction: tx })} title={t('common.delete')} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {/* Pagination */}
              <Pagination {...getPaginationProps(pagination)} />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={ui.modalOpen}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        transaction={ui.editingTransaction}
        scope="company"
        categories={categories}
        onSave={handleSaveTransaction}
        mode="simple"
      />

      {/* Transaction Detail View Modal */}
      <TransactionDetailView
        transaction={ui.viewingTransaction}
        allocations={viewingAllocations}
        onClose={() => dispatch({ type: 'CLOSE_VIEW' })}
        onEdit={(tx) => {
          dispatch({ type: 'EDIT_TRANSACTION', transaction: tx });
          dispatch({ type: 'CLOSE_VIEW' });
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!ui.deleteConfirm}
        onClose={() => dispatch({ type: 'CANCEL_DELETE' })}
        onConfirm={handleDeleteTransaction}
        title={t('shared.deleteTransaction.title')}
        message={t('shared.deleteTransaction.message')}
        type="danger"
        confirmText={t('common.delete')}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={ui.bulkDeleteConfirm}
        onClose={() => dispatch({ type: 'CANCEL_BULK_DELETE' })}
        onConfirm={handleBulkDelete}
        title={t('shared.bulkDelete.title')}
        message={t('shared.bulkDelete.message', { count: ui.selectedIds.size })}
        type="danger"
        confirmText={t('shared.bulkDelete.confirmText')}
      />

      {/* Print Options Modal */}
      <Modal
        isOpen={ui.printModalOpen}
        onClose={() => dispatch({ type: 'CLOSE_PRINT_MODAL' })}
        title={t('shared.printOptions.title')}
        size="sm"
      >
        <ModalBody className="space-y-4">
          <Select
            label={t('shared.printOptions.transactionType')}
            options={COMPANY_TRANSACTION_TYPES}
            value={ui.printFilters.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              dispatch({ type: 'SET_PRINT_FILTER', filters: { type: e.target.value } })
            }
            placeholder={t('common.all')}
          />
          <Select
            label={t('shared.printOptions.category')}
            options={[...invoiceCategories, ...paymentCategories].map((c) => ({
              value: c.id,
              label: t(`categories.${c.name}`, c.name),
            }))}
            value={ui.printFilters.category_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              dispatch({ type: 'SET_PRINT_FILTER', filters: { category_id: e.target.value } })
            }
            placeholder={t('common.all')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('shared.printOptions.startDate')}
              type="date"
              value={ui.printFilters.startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                dispatch({ type: 'SET_PRINT_FILTER', filters: { startDate: e.target.value } })
              }
            />
            <Input
              label={t('shared.printOptions.endDate')}
              type="date"
              value={ui.printFilters.endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                dispatch({ type: 'SET_PRINT_FILTER', filters: { endDate: e.target.value } })
              }
            />
          </div>
          <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('shared.printOptions.summary', { count: getFilteredTransactionsForPrint().length })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => dispatch({ type: 'CLOSE_PRINT_MODAL' })}>
            {t('common.cancel')}
          </Button>
          <Button icon={FiEye} onClick={showPreview}>
            {t('shared.preview')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={ui.printPreviewOpen}
        onClose={() => dispatch({ type: 'CLOSE_PRINT_PREVIEW' })}
      >
        <CompanyAccountPrintView
          ref={printRef}
          transactions={getFilteredTransactionsForPrint()}
          filters={ui.printFilters}
          categories={categories}
        />
      </PrintPreviewModal>
    </div>
  );
}

export default CompanyAccount;
