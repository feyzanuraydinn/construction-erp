import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiArrowLeft,
  FiPlus,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCreditCard,
  FiTrash2,
  FiPrinter,
  FiFilter,
  FiEye,
  FiEdit2,
  FiDownload,
} from 'react-icons/fi';
import { PrintPreviewModal, TransactionModal } from '../components/modals';
import { TransactionDetailView, CompanyPrintView } from '../components/shared';
import { useToast } from '../contexts/ToastContext';
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
  TypeBadge,
  AccountTypeBadge,
  EmptyState,
  ConfirmDialog,
  Pagination,
  LoadingSpinner,
  Divider,
  SelectAllCheckbox,
  RowCheckbox,
} from '../components/ui';
import { useTransactionList, calculateCompanyFinancials, getPaginationProps } from '../hooks';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getTransactionColor, getTransactionTextColor, isPositiveTransaction } from '../utils/transactionHelpers';
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from '../utils/constants';
import type {
  Company,
  TransactionWithDetails,
  Project,
  Category,
} from '../types';

function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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
    exportPrefix: 'cari-islemler',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  function loadData() {
    if (!id) return;
    setLoading(true);
    const numericId = parseInt(id, 10);
    Promise.all([
      window.electronAPI.company.getById(numericId),
      window.electronAPI.transaction.getByCompany(numericId),
      window.electronAPI.project.getAll(),
      window.electronAPI.category.getAll(),
    ])
      .then(([companyData, txData, projectsData, categoriesData]) => {
        setCompany(companyData || null);
        setTransactions(txData);
        setProjects(projectsData);
        setCategories(categoriesData);
      })
      .catch((error) => {
        console.error('Load error:', error);
        toast.error(t('common.loadError'));
      })
      .finally(() => setLoading(false));
  }

  const handlePrint = () => {
    dispatch({ type: 'OPEN_PRINT_MODAL' });
  };

  const showPreview = () => {
    dispatch({ type: 'OPEN_PRINT_PREVIEW' });
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

  const clearFilters = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="page-container">
        <EmptyState
          title={t('companyDetail.notFound.title')}
          description={t('companyDetail.notFound.description')}
          action={() => navigate('/companies')}
          actionLabel={t('companyDetail.notFound.actionLabel')}
        />
      </div>
    );
  }

  // Merkezi hesaplama fonksiyonu ile cari hesap finansalları
  const {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    receivable,
    payable,
    balance,
  } = calculateCompanyFinancials(transactions);

  const hasActiveFilters = ui.filterType || ui.filterCategory || ui.filterMinAmount || ui.filterMaxAmount || ui.filterStartDate || ui.filterEndDate;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" icon={FiArrowLeft} onClick={() => navigate('/companies')} aria-label={t('common.back')} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{company.name}</h1>
              <TypeBadge type={company.type} />
              <AccountTypeBadge accountType={company.account_type} />
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {company.type === 'person' ? company.profession : company.contact_person}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={FiDownload} onClick={handleExport}>{t('common.exportToExcel')}</Button>
          <Button variant="secondary" icon={FiPrinter} onClick={handlePrint}>{t('common.print')}</Button>
          <Button icon={FiPlus} onClick={() => dispatch({ type: 'OPEN_NEW_TRANSACTION' })}>
            {t('shared.newTransaction')}
          </Button>
        </div>
      </div>

      {/* Stats - Satır 1: Faturalar */}
      <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('companyDetail.stats.salesInvoices')}
          value={formatCurrency(totalInvoiceOut)}
          subtitle={t('companyDetail.stats.salesInvoicesSubtitle')}
          color="green"
        />
        <StatCard
          title={t('companyDetail.stats.collections')}
          value={formatCurrency(totalPaymentIn)}
          subtitle={t('companyDetail.stats.collectionsSubtitle')}
          color="blue"
        />
        <StatCard
          title={t('companyDetail.stats.purchaseInvoices')}
          value={formatCurrency(totalInvoiceIn)}
          subtitle={t('companyDetail.stats.purchaseInvoicesSubtitle')}
          color="red"
        />
        <StatCard
          title={t('companyDetail.stats.payments')}
          value={formatCurrency(totalPaymentOut)}
          subtitle={t('companyDetail.stats.paymentsSubtitle')}
          color="orange"
        />
      </div>

      {/* Stats - Satır 2: Bakiyeler */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        <StatCard
          title={t('companyDetail.stats.receivableBalance')}
          value={formatCurrency(receivable)}
          subtitle={receivable >= 0 ? t('companyDetail.stats.owesToUs') : t('companyDetail.stats.overpaymentReceived')}
          color={receivable >= 0 ? 'green' : 'purple'}
        />
        <StatCard
          title={t('companyDetail.stats.debtBalance')}
          value={formatCurrency(payable)}
          subtitle={payable >= 0 ? t('companyDetail.stats.weOwe') : t('companyDetail.stats.overpaymentMade')}
          color={payable >= 0 ? 'red' : 'purple'}
        />
        <StatCard
          title={t('companyDetail.stats.netBalance')}
          value={formatCurrency(balance)}
          subtitle={balance >= 0 ? t('companyDetail.stats.netReceivable') : t('companyDetail.stats.netPayable')}
          color={balance >= 0 ? 'green' : 'red'}
          highlighted
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left - Info */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">{t('companyDetail.contactInfo')}</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {company.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <FiPhone className="text-gray-400 dark:text-gray-500" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-3 text-sm">
                  <FiMail className="text-gray-400 dark:text-gray-500" />
                  <span>{company.email}</span>
                </div>
              )}
              {company.address && (
                <div className="flex items-center gap-3 text-sm">
                  <FiMapPin className="text-gray-400 dark:text-gray-500" />
                  <span>{company.address}</span>
                </div>
              )}
              {company.bank_name && (
                <div className="flex items-center gap-3 text-sm">
                  <FiCreditCard className="text-gray-400 dark:text-gray-500" />
                  <div>
                    <p>{company.bank_name}</p>
                    {company.iban && <p className="text-xs text-gray-500 dark:text-gray-400">{company.iban}</p>}
                  </div>
                </div>
              )}
              {!company.phone && !company.email && !company.address && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('companyDetail.noContactInfo')}</p>
              )}
            </CardBody>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">
                {company.type === 'person' ? t('companyDetail.personInfo') : t('companyDetail.companyInfo')}
              </h3>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              {company.type === 'person' ? (
                <>
                  {company.tc_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('companyDetail.fields.tcNumber')}</span>
                      <span>{company.tc_number}</span>
                    </div>
                  )}
                  {company.profession && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('companyDetail.fields.profession')}</span>
                      <span>{company.profession}</span>
                    </div>
                  )}
                  {!company.tc_number && !company.profession && (
                    <p className="text-gray-500 dark:text-gray-400">{t('companyDetail.noPersonInfo')}</p>
                  )}
                </>
              ) : (
                <>
                  {company.tax_office && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('companyDetail.fields.taxOffice')}</span>
                      <span>{company.tax_office}</span>
                    </div>
                  )}
                  {company.tax_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('companyDetail.fields.taxNumber')}</span>
                      <span>{company.tax_number}</span>
                    </div>
                  )}
                  {company.trade_registry_no && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{t('companyDetail.fields.tradeRegistry')}</span>
                      <span>{company.trade_registry_no}</span>
                    </div>
                  )}
                  {!company.tax_office && !company.tax_number && !company.trade_registry_no && (
                    <p className="text-gray-500 dark:text-gray-400">{t('companyDetail.noCompanyInfo')}</p>
                  )}
                </>
              )}
              {company.notes && (
                <div className="pt-2 border-t dark:border-gray-700">
                  <p className="mb-1 text-gray-500 dark:text-gray-400">{t('companyDetail.fields.notes')}</p>
                  <p>{company.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right - Transactions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-col gap-3">
              <div className="flex items-center justify-between h-10">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{t('companyDetail.transactionHistory')}</h3>
                  {ui.selectedIds.size > 0 && (
                    <>
                      <Divider />
                      <Button variant="ghost-danger" size="sm" icon={FiTrash2} onClick={() => dispatch({ type: 'OPEN_BULK_DELETE' })}>{t('shared.bulkDeleteCount', { count: ui.selectedIds.size })}</Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={ui.showFilters ? 'primary' : 'ghost'} size="icon" icon={FiFilter} onClick={() => dispatch({ type: 'TOGGLE_FILTERS' })} aria-label={t('common.filter')} />
                  <Select
                    options={TRANSACTION_TYPES}
                    value={ui.filterType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      dispatch({ type: 'SET_FILTER', filterType: e.target.value })
                    }
                    placeholder={t('common.all')}
                    className="w-32"
                  />
                </div>
              </div>
              {ui.showFilters && (
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.categoryLabel')}</label>
                    <Select
                      options={categories.map((c) => ({ value: c.id, label: t(`categories.${c.name}`, c.name) }))}
                      value={ui.filterCategory}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        dispatch({ type: 'SET_FILTER', filterCategory: e.target.value })
                      }
                      placeholder={t('common.all')}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.startDateLabel')}</label>
                    <Input
                      type="date"
                      value={ui.filterStartDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({ type: 'SET_FILTER', filterStartDate: e.target.value })
                      }
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.endDateLabel')}</label>
                    <Input
                      type="date"
                      value={ui.filterEndDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({ type: 'SET_FILTER', filterEndDate: e.target.value })
                      }
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.minAmountLabel')}</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ui.filterMinAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({ type: 'SET_FILTER', filterMinAmount: e.target.value })
                      }
                      placeholder="0"
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.maxAmountLabel')}</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ui.filterMaxAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({ type: 'SET_FILTER', filterMaxAmount: e.target.value })
                      }
                      placeholder="∞"
                      className="w-28"
                    />
                  </div>
                  {hasActiveFilters && (
                    <Button variant="ghost-danger" size="xs" onClick={clearFilters}>{t('shared.clearFilters')}</Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardBody className="p-0">
              {filteredTransactions.length === 0 ? (
                <EmptyState
                  title={t('shared.transactionNotFound')}
                  description={t('companyDetail.noTransactions')}
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
                      <TableHead>{t('common.description')}</TableHead>
                      <TableHead>{t('shared.transactionDetail.project')}</TableHead>
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
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(tx.type)} text-white`}
                          >
                            {t(TRANSACTION_TYPE_LABELS[tx.type])}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{tx.description}</p>
                          {tx.category_name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t(`categories.${tx.category_name}`, tx.category_name)}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.project_name ? (
                            <span className="text-sm">{tx.project_name}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${getTransactionTextColor(tx.type)}`}
                        >
                          {isPositiveTransaction(tx.type) ? '+' : '-'}
                          {formatCurrency(tx.amount, tx.currency)}
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
        scope="cari"
        entityId={company.id}
        projects={projects}
        categories={categories}
        onSave={handleSaveTransaction}
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
            options={TRANSACTION_TYPES}
            value={ui.printFilters.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              dispatch({ type: 'SET_PRINT_FILTER', filters: { type: e.target.value } })
            }
            placeholder={t('common.all')}
          />
          <Select
            label={t('shared.printOptions.category')}
            options={categories.map((c) => ({ value: c.id, label: t(`categories.${c.name}`, c.name) }))}
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
        <CompanyPrintView
          ref={printRef}
          company={company}
          transactions={getFilteredTransactionsForPrint()}
          filters={ui.printFilters}
          categories={categories}
        />
      </PrintPreviewModal>
    </div>
  );
}

export default CompanyDetail;
