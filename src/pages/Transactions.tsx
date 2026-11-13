import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiList } from 'react-icons/fi';
import { useDebounce } from '../hooks/useDebounce';
import { usePaginatedItems, getPaginationProps } from '../hooks/usePagination';
import { calculateTransactionTotals } from '../utils/financials';
import { useTransactionDeletion } from '../hooks/useTransactionDeletion';
import { useTransactionExport } from '../hooks/useTransactionExport';
import { useTransactionAllocations } from '../hooks/useTransactionAllocations';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { TransactionDeleteDialogs } from '../components/transaction-list/TransactionDeleteDialogs';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { PageActions, BulkDeleteAction } from '../components/shared/PageActions';
import { TransactionModal } from '../components/modals/TransactionModal';
import { TransactionDetailView } from '../components/shared/TransactionDetailView';
import { TransactionStats } from './transactions-components/TransactionStats';
import {
  TransactionFiltersPanel,
  type TransactionUIFilters,
} from './transactions-components/TransactionFiltersPanel';
import { AllTransactionsTable } from './transactions-components/AllTransactionsTable';
import { TransactionsExportDialog } from './transactions-components/TransactionsExportDialog';
import {
  EMPTY_LIST_FILTERS,
  matchesFilters,
  matchesSearch,
  type ListFilters,
} from './transactions-components/transactionListFilters';
import type { TransactionWithDetails, TransactionScope } from '../types';
import { useLoadedData } from '../hooks/useLoadedData';
import { NO_ITEMS } from '../utils/emptyList';
import { PageHeader } from '../components/shared/PageHeader';

interface EditTarget {
  scope: TransactionScope;
  entityId?: number;
  mode: 'full' | 'simple';
}

function editTargetFor(tx: TransactionWithDetails): EditTarget {
  if (tx.scope === 'company') return { scope: 'company', mode: 'simple' };
  if (tx.scope === 'project' && tx.project_id)
    return { scope: 'project', entityId: tx.project_id, mode: 'full' };
  if (tx.company_id) return { scope: 'cari', entityId: tx.company_id, mode: 'full' };
  if (tx.project_id) return { scope: 'project', entityId: tx.project_id, mode: 'full' };
  return { scope: tx.scope, mode: 'full' };
}

const loadTransactionsPage = () =>
  Promise.all([
    window.electronAPI.transaction.getAll({}),
    window.electronAPI.company.getAll(),
    window.electronAPI.project.getAll(),
    window.electronAPI.category.getAll(),
  ]).then(([transactions, companies, projects, categories]) => ({
    transactions,
    companies,
    projects,
    categories,
  }));

function Transactions() {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    data,
    loading,
    reload: loadData,
  } = useLoadedData(loadTransactionsPage, 'Transactions load error:');
  const transactions = data?.transactions ?? NO_ITEMS;
  const companies = data?.companies ?? NO_ITEMS;
  const projects = data?.projects ?? NO_ITEMS;
  const categories = data?.categories ?? NO_ITEMS;
  const [filters, setFilters] = useState<TransactionUIFilters>({
    search: '',
    ...EMPTY_LIST_FILTERS,
  });
  const debouncedSearch = useDebounce(filters.search);
  const [viewingTransaction, setViewingTransaction] = useState<TransactionWithDetails | null>(null);
  const viewingAllocations = useTransactionAllocations(viewingTransaction);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);

  const { shareTransactions } = useTransactionExport();
  const exportPrefix = t('export.filenames.transactions');
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState<ListFilters>(EMPTY_LIST_FILTERS);

  const handleEditTransaction = (tx: TransactionWithDetails) => {
    setViewingTransaction(null);
    setEditingTransaction(tx);
  };

  const handleSaved = () => {
    setEditingTransaction(null);
    toast.success(t('shared.transactionUpdated'));
    loadData();
  };

  const editTarget = editingTransaction ? editTargetFor(editingTransaction) : null;

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) => matchesSearch(tx, debouncedSearch) && matchesFilters(tx, filters)
      ),
    [transactions, debouncedSearch, filters]
  );

  const deletion = useTransactionDeletion(filteredTransactions, loadData);
  const { selectedIds } = deletion;

  const { pagination, pageItems: paginatedTransactions } = usePaginatedItems(
    filteredTransactions,
    JSON.stringify(filters)
  );

  const {
    totalInvoiceOut,
    totalPaymentIn,
    totalInvoiceIn,
    totalPaymentOut,
    netProfit,
    netCashFlow,
    openBalance,
  } = calculateTransactionTotals(filteredTransactions);

  return (
    <div className="page-container">
      <PageHeader title={t('transactions.title')} subtitle={t('transactions.subtitle')}>
        <PageActions
          leading={
            <BulkDeleteAction
              count={selectedIds.size}
              label={t('shared.bulkDelete.buttonLabel', { count: selectedIds.size })}
              onClick={() => deletion.setBulkDeleteConfirm(true)}
              divider="after"
            />
          }
          onExport={() => {
            setExportFilters(EMPTY_LIST_FILTERS);
            setExportPreviewOpen(true);
          }}
          onShare={() => void shareTransactions(exportPrefix, filteredTransactions)}
        />
      </PageHeader>

      <TransactionStats
        totalInvoiceOut={totalInvoiceOut}
        totalPaymentIn={totalPaymentIn}
        totalInvoiceIn={totalInvoiceIn}
        totalPaymentOut={totalPaymentOut}
        netProfit={netProfit}
        netCashFlow={netCashFlow}
        openBalance={openBalance}
        filteredTransactions={filteredTransactions}
      />

      <TransactionFiltersPanel
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
      />

      <Card>
        <CardBody>
          {loading ? (
            <LoadingSpinner />
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon={FiList}
              title={t('transactions.noTransactions')}
              description={t('transactions.noTransactionsDesc')}
            />
          ) : (
            <AllTransactionsTable
              transactions={paginatedTransactions}
              deletion={deletion}
              onView={setViewingTransaction}
              onEdit={handleEditTransaction}
            />
          )}
          {filteredTransactions.length > 0 && <Pagination {...getPaginationProps(pagination)} />}
        </CardBody>
      </Card>

      <TransactionDetailView
        transaction={viewingTransaction}
        allocations={viewingAllocations}
        onClose={() => setViewingTransaction(null)}
        onEdit={handleEditTransaction}
      />

      {editingTransaction && editTarget && (
        <TransactionModal
          isOpen
          onClose={() => setEditingTransaction(null)}
          transaction={editingTransaction}
          categories={categories}
          onSave={handleSaved}
          scope={editTarget.scope}
          entityId={editTarget.entityId}
          companies={companies}
          projects={projects}
          mode={editTarget.mode}
        />
      )}

      <TransactionDeleteDialogs deletion={deletion} />

      <TransactionsExportDialog
        isOpen={exportPreviewOpen}
        onClose={() => setExportPreviewOpen(false)}
        filters={exportFilters}
        onFiltersChange={setExportFilters}
        transactions={transactions}
        companies={companies}
        exportPrefix={exportPrefix}
      />
    </div>
  );
}

export default Transactions;
