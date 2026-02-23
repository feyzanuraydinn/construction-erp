import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiList, FiEdit2, FiTrash2, FiDownload } from 'react-icons/fi';
import {
  useDebounce,
  usePagination,
  paginateArray,
  calculateTransactionTotals,
  invalidateCachePattern,
  useSelection,
  useBulkDelete,
  useExport,
  getPaginationProps,
} from '../hooks';
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
  ConfirmDialog,
  Pagination,
  Button,
  LoadingSpinner,
  Divider,
  SelectAllCheckbox,
  RowCheckbox,
} from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate, formatDateForInput } from '../utils/formatters';
import {
  getTransactionColor,
  getTransactionTextColor,
  isPositiveTransaction,
} from '../utils/transactionHelpers';
import { TRANSACTION_TYPE_LABELS } from '../utils/constants';
import { transactionColumns } from '../utils/exportUtils';
import {
  TransactionStats,
  TransactionFiltersPanel,
  TransactionDetailModal,
} from './transactions-components';
import type { TransactionUIFilters, TransactionDetailFormData } from './transactions-components';
import type {
  TransactionWithDetails,
  Company,
  Project,
  Category,
  BadgeVariant,
} from '../types';

function Transactions() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionUIFilters>({
    search: '',
    scope: '',
    type: '',
    company_id: '',
    project_id: '',
    start_date: '',
    end_date: '',
  });
  const debouncedSearch = useDebounce(filters.search, 300);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<TransactionDetailFormData>({
    date: '',
    type: 'invoice_out',
    scope: 'company',
    company_id: '',
    project_id: '',
    category_id: '',
    amount: '',
    currency: 'TRY',
    description: '',
    document_no: '',
  });

  // Bulk selection hooks
  const { selectedIds, handleSelectAll, handleSelectOne, clearSelection } = useSelection();
  const { bulkDeleteConfirm, setBulkDeleteConfirm, handleBulkDelete: bulkDelete } = useBulkDelete({
    deleteFn: (id) => window.electronAPI.transaction.delete(id),
    entityKey: 'transactions',
    onSuccess: () => {
      clearSelection();
      invalidateCachePattern('dashboard:.*');
      loadData();
    },
  });
  const { handleExport: exportAction } = useExport();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txData, companiesData, projectsData, categoriesData] = await Promise.all([
        window.electronAPI.transaction.getAll({}),
        window.electronAPI.company.getAll(),
        window.electronAPI.project.getAll(),
        window.electronAPI.category.getAll(),
      ]);
      setTransactions(txData);
      setCompanies(companiesData);
      setProjects(projectsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Load error:', error);
      toast.error(t('common.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const populateFormData = (tx: TransactionWithDetails): TransactionDetailFormData => ({
    date: formatDateForInput(tx.date),
    type: tx.type,
    scope: tx.scope,
    company_id: tx.company_id ? String(tx.company_id) : '',
    project_id: tx.project_id ? String(tx.project_id) : '',
    category_id: tx.category_id ? String(tx.category_id) : '',
    amount: tx.amount.toString(),
    currency: (tx.currency || 'TRY') as TransactionDetailFormData['currency'],
    description: tx.description,
    document_no: tx.document_no || '',
  });

  const handleViewTransaction = (tx: TransactionWithDetails) => {
    setSelectedTransaction(tx);
    setFormData(populateFormData(tx));
    setEditMode(false);
    setShowModal(true);
  };

  const handleEditTransaction = (tx: TransactionWithDetails) => {
    setSelectedTransaction(tx);
    setFormData(populateFormData(tx));
    setEditMode(true);
    setShowModal(true);
  };

  const handleSaveTransaction = async () => {
    if (!selectedTransaction) return;
    try {
      await window.electronAPI.transaction.update(selectedTransaction.id, {
        ...formData,
        amount: parseFloat(formData.amount),
        company_id: formData.company_id || undefined,
        project_id: formData.project_id || undefined,
        category_id: formData.category_id || undefined,
      });
      setShowModal(false);
      toast.success(t('transactions.updateSuccess'));
      invalidateCachePattern('dashboard:.*');
      loadData();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(t('transactions.updateError'));
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTransaction) return;
    try {
      await window.electronAPI.transaction.delete(selectedTransaction.id);
      setShowDeleteConfirm(false);
      setShowModal(false);
      toast.success(t('transactions.deleteSuccess'));
      invalidateCachePattern('dashboard:.*');
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('transactions.deleteError'));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
    setEditMode(false);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        !debouncedSearch ||
        tx.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (tx.company_name &&
          tx.company_name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (tx.project_name && tx.project_name.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchesScope = !filters.scope || tx.scope === filters.scope;
      const matchesType = !filters.type || tx.type === filters.type;
      const matchesCompany = !filters.company_id || tx.company_id === parseInt(filters.company_id);
      const matchesProject = !filters.project_id || tx.project_id === parseInt(filters.project_id);
      const matchesStartDate = !filters.start_date || tx.date >= filters.start_date;
      const matchesEndDate = !filters.end_date || tx.date <= filters.end_date;

      return (
        matchesSearch &&
        matchesScope &&
        matchesType &&
        matchesCompany &&
        matchesProject &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    transactions,
    debouncedSearch,
    filters.scope,
    filters.type,
    filters.company_id,
    filters.project_id,
    filters.start_date,
    filters.end_date,
  ]);

  // Pagination
  const pagination = usePagination({
    totalItems: filteredTransactions.length,
    initialPageSize: 25,
  });

  // Reset to first page when filters change
  useEffect(() => {
    pagination.goToPage(1);
  }, [
    debouncedSearch,
    filters.scope,
    filters.type,
    filters.company_id,
    filters.project_id,
    filters.start_date,
    filters.end_date,
  ]);

  const paginatedTransactions = useMemo(() => {
    return paginateArray(filteredTransactions, pagination.currentPage, pagination.pageSize);
  }, [filteredTransactions, pagination.currentPage, pagination.pageSize]);

  // Transaction totals
  const {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    netProfit,
    netCashFlow,
  } = calculateTransactionTotals(filteredTransactions);

  const getScopeLabel = (scope: string): { label: string; variant: BadgeVariant } => {
    switch (scope) {
      case 'cari':
        return { label: t('transactions.scope.cari'), variant: 'info' };
      case 'project':
        return { label: t('transactions.scope.project'), variant: 'purple' };
      case 'company':
        return { label: t('transactions.scope.company'), variant: 'default' };
      default:
        return { label: scope, variant: 'default' };
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('transactions.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('transactions.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button variant="ghost-danger" size="sm" icon={FiTrash2} onClick={() => setBulkDeleteConfirm(true)}>
                {t('transactions.bulkDeleteCount', { count: selectedIds.size })}
              </Button>
              <Divider />
            </>
          )}
          <Button variant="secondary" icon={FiDownload} onClick={() => exportAction('islemler', filteredTransactions, transactionColumns)} title={t('common.exportToExcel')}>
            {t('common.exportToExcel')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <TransactionStats
        totalInvoiceOut={totalInvoiceOut}
        totalPaymentIn={totalPaymentIn}
        totalInvoiceIn={totalInvoiceIn}
        totalPaymentOut={totalPaymentOut}
        netProfit={netProfit}
        netCashFlow={netCashFlow}
        filteredTransactions={filteredTransactions}
      />

      {/* Filters */}
      <TransactionFiltersPanel
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
      />

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <LoadingSpinner />
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon={FiList}
              title={t('transactions.noTransactions')}
              description={t('transactions.noTransactionsDesc')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="w-10">
                    <SelectAllCheckbox
                      itemIds={paginatedTransactions.map((tx) => tx.id)}
                      selectedIds={selectedIds}
                      onSelectAll={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('transactions.table.date')}</TableHead>
                  <TableHead>{t('transactions.table.source')}</TableHead>
                  <TableHead>{t('transactions.table.type')}</TableHead>
                  <TableHead>{t('transactions.table.companyProject')}</TableHead>
                  <TableHead>{t('transactions.table.description')}</TableHead>
                  <TableHead>{t('transactions.table.category')}</TableHead>
                  <TableHead className="text-right">{t('transactions.table.amount')}</TableHead>
                  <TableHead className="w-20 text-center">{t('transactions.table.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx) => {
                  const scopeConfig = getScopeLabel(tx.scope);
                  return (
                    <TableRow
                      key={tx.id}
                      selected={selectedIds.has(tx.id)}
                      onClick={() => handleViewTransaction(tx)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <RowCheckbox
                          id={tx.id}
                          selectedIds={selectedIds}
                          onSelectOne={handleSelectOne}
                        />
                      </TableCell>
                      <TableCell>{formatDate(tx.date)}</TableCell>
                      <TableCell>
                        <Badge variant={scopeConfig.variant}>{scopeConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(tx.type)} text-white`}
                        >
                          {t(TRANSACTION_TYPE_LABELS[tx.type])}
                        </span>
                      </TableCell>
                      <TableCell>
                        {tx.company_name ? (
                          <span
                            className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/companies/${tx.company_id}`);
                            }}
                          >
                            {tx.company_name}
                          </span>
                        ) : tx.project_name ? (
                          <span
                            className="text-purple-600 dark:text-purple-400 cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${tx.project_id}`);
                            }}
                          >
                            {tx.project_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">{t('transactions.companyGeneral')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.description}</p>
                        {tx.document_no && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('transactions.table.document', { no: tx.document_no })}
                          </p>
                        )}
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
                      <TableCell
                        className={`text-right font-medium ${getTransactionTextColor(tx.type)}`}
                      >
                        {isPositiveTransaction(tx.type) ? '+' : '-'}
                        {formatCurrency(tx.amount, tx.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost-warning"
                            size="icon"
                            icon={FiEdit2}
                            onClick={() => handleEditTransaction(tx)}
                            title={t('common.edit')}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {filteredTransactions.length > 0 && (
            <Pagination {...getPaginationProps(pagination)} />
          )}
        </CardBody>
      </Card>

      {/* View/Edit Modal */}
      <TransactionDetailModal
        isOpen={showModal}
        editMode={editMode}
        formData={formData}
        companies={companies}
        projects={projects}
        categories={categories}
        onClose={closeModal}
        onEdit={() => setEditMode(true)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteClick}
        onFormChange={setFormData}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title={t('transactions.deleteTitle')}
        message={t('transactions.deleteMessage')}
        type="danger"
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={() => bulkDelete(selectedIds)}
        title={t('transactions.bulkDeleteTitle')}
        message={t('transactions.bulkDeleteMessage', { count: selectedIds.size })}
        type="danger"
        confirmText={t('transactions.bulkDeleteConfirm')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
}

export default Transactions;
