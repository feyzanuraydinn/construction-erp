import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import {
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiMapPin,
  FiGrid,
  FiDollarSign,
  FiPrinter,
  FiUser,
  FiDownload,
  FiFilter,
} from 'react-icons/fi';
import { StakeholderDetailModal, ExpenseBreakdownChart } from './project-detail';
import { PrintPreviewModal, TransactionModal } from '../components/modals';
import { TransactionDetailView, ProjectPrintView } from '../components/shared';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  StatCard,
  StatusBadge,
  Badge,
  BalanceBadge,
  EmptyState,
  ConfirmDialog,
  Pagination,
  LoadingSpinner,
  Divider,
  TabGroup,
  SelectAllCheckbox,
  RowCheckbox,
} from '../components/ui';
import { useTransactionList, calculateProjectFinancials, getPaginationProps } from '../hooks';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getTransactionTextColor, getTransactionBadgeVariant, isIncomeType, isExpenseType } from '../utils/transactionHelpers';
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
} from '../utils/constants';
import type {
  ProjectWithSummary,
  TransactionWithDetails,
  Company,
  Category,
  CategoryBreakdown,
  AccountType,
} from '../types';


function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  // Data state'leri (bağımsız async veri)
  const [project, setProject] = useState<ProjectWithSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  // Page-specific state (ProjectDetail'e özgü)
  const [activeTab, setActiveTab] = useState<'transactions' | 'parties'>('transactions');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [stakeholderDetailModal, setStakeholderDetailModal] = useState<{ company_id: number; company_name: string } | null>(null);

  // Shared transaction list hook
  const {
    ui, dispatch, printRef, viewingAllocations,
    filteredTransactions, paginatedTransactions, pagination,
    handleDeleteTransaction, handleSelectAll, handleSelectOne,
    handleBulkDelete, handleSaveTransaction, handleExport, handlePrint,
  } = useTransactionList({
    transactions,
    loadData,
    extraFilter: (tx) => {
      if (filterCompanyId && String(tx.company_id) !== filterCompanyId) return false;
      return true;
    },
    exportPrefix: project?.name || 'proje_islemler',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  function loadData() {
    if (!id) return;
    setLoading(true);
    const numericId = parseInt(id, 10);
    Promise.all([
      window.electronAPI.project.getById(numericId),
      window.electronAPI.transaction.getByProject(numericId),
      window.electronAPI.company.getAll(),
      window.electronAPI.category.getAll(),
      window.electronAPI.analytics.getProjectCategoryBreakdown(numericId),
    ])
      .then(([projectData, txData, companiesData, categoriesData, breakdown]) => {
        setProject(projectData || null);
        setTransactions(txData);
        setCompanies(companiesData);
        setCategories(categoriesData);
        setCategoryBreakdown(breakdown);
      })
      .catch((error) => {
        console.error('Load error:', error);
        toast.error(t('common.loadError'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!project) {
    return (
      <div className="page-container">
        <EmptyState
          title={t('projectDetail.notFound.title')}
          description={t('projectDetail.notFound.description')}
          action={() => navigate('/projects')}
          actionLabel={t('projectDetail.notFound.actionLabel')}
        />
      </div>
    );
  }

  const isClientProject = project.ownership_type === 'client';

  const {
    totalInvoiceOut,
    totalInvoiceIn,
    independentPaymentIn,
    independentPaymentOut,
    totalIncome,
    totalExpense,
    projectProfit,
    estimatedProfit,
    budgetUsed,
    projectDebt,
    clientReceivable,
  } = calculateProjectFinancials(transactions, project.ownership_type, project.estimated_budget);

  // İşlemlerde geçen benzersiz carileri al (paydaşlar için)
  const stakeholders = transactions.reduce(
    (acc, tx) => {
      if (tx.company_id && tx.company_name) {
        const amount = tx.amount_try || tx.amount;
        const isInvoice = tx.type === 'invoice_in' || tx.type === 'invoice_out';
        const isPayment = tx.type === 'payment_in' || tx.type === 'payment_out';
        const existing = acc.find((s) => s.company_id === tx.company_id);
        if (existing) {
          existing.transaction_count += 1;
          if (isInvoice) existing.total_invoice += amount;
          if (isPayment) existing.total_payment += amount;
        } else {
          const company = companies.find((c) => c.id === tx.company_id);
          acc.push({
            company_id: tx.company_id,
            company_name: tx.company_name,
            account_type: (company?.account_type || 'customer') as AccountType,
            phone: company?.phone || '',
            email: company?.email || '',
            transaction_count: 1,
            total_invoice: isInvoice ? amount : 0,
            total_payment: isPayment ? amount : 0,
          });
        }
      }
      return acc;
    },
    [] as {
      company_id: number;
      company_name: string;
      account_type: AccountType;
      phone: string;
      email: string;
      transaction_count: number;
      total_invoice: number;
      total_payment: number;
    }[]
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" icon={FiArrowLeft} onClick={() => navigate('/projects')} aria-label={t('common.back')} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{project.name}</h1>
              <StatusBadge status={project.status} />
              <Badge variant={project.ownership_type === 'own' ? 'info' : 'purple'}>
                {project.ownership_type === 'own' ? t('projectDetail.badge.ownProject') : t('projectDetail.badge.clientProject')}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {project.code}
              {project.client_name && (
                <span className="ml-2 text-purple-600 dark:text-purple-400 font-medium">• {t('projectDetail.clientLabel')}: {project.client_name}</span>
              )}
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
        <StatCard
          title={isClientProject ? t('projectDetail.stats.projectIncome') : t('projectDetail.stats.totalIncome')}
          value={formatCurrency(totalIncome)}
          subtitle={t('projectDetail.stats.incomeBreakdown', { invoice: formatCurrency(totalInvoiceOut), independentPayment: formatCurrency(independentPaymentIn) })}
          color="green"
        />
        <StatCard
          title={isClientProject ? t('projectDetail.stats.projectCost') : t('projectDetail.stats.totalExpense')}
          value={formatCurrency(totalExpense)}
          subtitle={t('projectDetail.stats.expenseBreakdown', { invoice: formatCurrency(totalInvoiceIn), independentPayment: formatCurrency(independentPaymentOut) })}
          color="red"
        />
        <StatCard
          title={isClientProject ? t('projectDetail.stats.profitMargin') : t('projectDetail.stats.projectProfit')}
          value={formatCurrency(projectProfit)}
          subtitle={isClientProject ? t('projectDetail.stats.incomeMinusCost') : t('projectDetail.stats.incomeMinusExpense')}
          color={projectProfit >= 0 ? 'green' : 'red'}
          highlighted
        />
      </div>
      <div className={`grid grid-cols-1 gap-4 mb-6 ${isClientProject ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
        <StatCard
          title={t('projectDetail.stats.estimatedProfit')}
          value={estimatedProfit !== null ? formatCurrency(estimatedProfit) : '-'}
          subtitle={estimatedProfit === null ? t('projectDetail.stats.noBudget') : undefined}
          color={estimatedProfit === null ? 'gray' : estimatedProfit >= 0 ? 'green' : 'red'}
          highlighted
        />
        <StatCard
          title={t('projectDetail.stats.budgetStatus')}
          value={project.estimated_budget ? `%${budgetUsed.toFixed(0)}` : '-'}
          subtitle={
            project.estimated_budget
              ? `${formatCurrency(totalExpense)} / ${formatCurrency(project.estimated_budget)}`
              : t('projectDetail.stats.noBudget')
          }
          color={
            !project.estimated_budget
              ? 'gray'
              : budgetUsed > 100
                ? 'red'
                : budgetUsed > 80
                  ? 'yellow'
                  : 'green'
          }
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">{t('projectDetail.projectInfo')}</h3>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              {!project.location &&
              !project.total_area &&
              !project.estimated_budget &&
              !project.planned_start &&
              !project.planned_end &&
              !project.actual_start &&
              !project.description ? (
                <p className="text-gray-500 dark:text-gray-400">{t('projectDetail.noProjectInfo')}</p>
              ) : (
                <>
                  {project.client_name && (
                    <div className="flex items-center gap-3">
                      <FiUser className="text-purple-500" />
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{t('projectDetail.fields.client')}</span>
                        <p className="font-medium text-purple-700 dark:text-purple-400">{project.client_name}</p>
                      </div>
                    </div>
                  )}
                  {project.location && (
                    <div className="flex items-start gap-3">
                      <FiMapPin className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <span>{project.location}</span>
                    </div>
                  )}
                  {project.total_area && (
                    <div className="flex items-center gap-3">
                      <FiGrid className="text-gray-400 dark:text-gray-500" />
                      <span>
                        {project.total_area} m2 - {project.unit_count || '-'} {t('projectDetail.fields.units')}
                      </span>
                    </div>
                  )}
                  {project.estimated_budget && (
                    <div className="flex items-center gap-3">
                      <FiDollarSign className="text-gray-400 dark:text-gray-500" />
                      <span>{t('projectDetail.fields.budget')}: {formatCurrency(project.estimated_budget)}</span>
                    </div>
                  )}
                  {(project.planned_start || project.planned_end || project.actual_start) && (
                    <div className="pt-2 space-y-2 border-t dark:border-gray-700">
                      {project.planned_start && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{t('projectDetail.fields.plannedStart')}</span>
                          <span>{formatDate(project.planned_start)}</span>
                        </div>
                      )}
                      {project.planned_end && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{t('projectDetail.fields.plannedEnd')}</span>
                          <span>{formatDate(project.planned_end)}</span>
                        </div>
                      )}
                      {project.actual_start && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{t('projectDetail.fields.actualStart')}</span>
                          <span>{formatDate(project.actual_start)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {project.description && (
                    <div className="pt-2 border-t dark:border-gray-700">
                      <p className="mb-1 text-gray-500 dark:text-gray-400">{t('projectDetail.fields.description')}</p>
                      <p>{project.description}</p>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <ExpenseBreakdownChart categoryBreakdown={categoryBreakdown} />
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Card>
            {/* Tab Navigation */}
            <div className="border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between px-4 min-h-[56px]">
                <div className="flex items-center">
                  <TabGroup
                    tabs={[
                      { key: 'transactions', label: t('projectDetail.transactionsTab') },
                      { key: 'parties', label: t('projectDetail.partiesTab') },
                    ]}
                    activeTab={activeTab}
                    onChange={(key) => setActiveTab(key as 'transactions' | 'parties')}
                  />
                  {activeTab ==='transactions' && ui.selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 ml-3">
                      <Divider />
                      <Button variant="ghost-danger" size="sm" icon={FiTrash2} onClick={() => dispatch({ type: 'OPEN_BULK_DELETE' })}>{t('shared.bulkDeleteCount', { count: ui.selectedIds.size })}</Button>
                    </div>
                  )}
                </div>
                {activeTab ==='transactions' && (
                  <div className="flex items-center gap-2">
                    <Button variant={ui.showFilters ? 'primary' : 'ghost'} size="icon" icon={FiFilter} onClick={() => dispatch({ type: 'TOGGLE_FILTERS' })} aria-label={t('common.filter')} />
                    <Select
                      options={TRANSACTION_TYPES}
                      value={ui.filterType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        dispatch({ type: 'SET_FILTER', filterType: e.target.value })
                      }
                      placeholder={t('shared.filters.allTypes')}
                      className="w-36"
                    />
                    <Select
                      options={stakeholders.map((s) => ({
                        value: s.company_id,
                        label: s.company_name,
                      }))}
                      value={filterCompanyId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setFilterCompanyId(e.target.value)
                      }
                      placeholder={t('shared.filters.allCompanies')}
                      className="w-44"
                    />
                  </div>
                )}
              </div>
              {activeTab === 'transactions' && ui.showFilters && (
                <div className="flex flex-wrap items-center gap-3 px-6 pt-3 border-t dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.categoryLabel')}:</label>
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
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.startDateLabel')}:</label>
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
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.endDateLabel')}:</label>
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
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.minLabel')}:</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={ui.filterMinAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({ type: 'SET_FILTER', filterMinAmount: e.target.value })
                      }
                      placeholder="0" className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">{t('shared.filters.maxLabel')}:</label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={ui.filterMaxAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        dispatch({ type: 'SET_FILTER', filterMaxAmount: e.target.value })
                      }
                      placeholder="∞" className="w-28"
                    />
                  </div>
                  {(ui.filterCategory || ui.filterMinAmount || ui.filterMaxAmount || ui.filterStartDate || ui.filterEndDate) && (
                    <Button variant="ghost-danger" size="xs" onClick={() => { dispatch({ type: 'CLEAR_FILTERS' }); setFilterCompanyId(''); }}>{t('shared.clearFilters')}</Button>
                  )}
                </div>
              )}
            </div>

            {/* Tab Content */}
            <CardBody className="p-0">
              {activeTab ==='transactions' && (
                <>
                  {filteredTransactions.length === 0 ? (
                    <EmptyState title={t('shared.transactionNotFound')} />
                  ) : (
                    <>
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
                            <TableHead>{t('shared.transactionDetail.company')}</TableHead>
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
                                <Badge variant={getTransactionBadgeVariant(tx.type)}>
                                  {t(TRANSACTION_TYPE_LABELS[tx.type])}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium">{tx.description}</p>
                                {tx.category_name && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{t(`categories.${tx.category_name}`, tx.category_name)}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                {tx.company_name || <span className="text-gray-400 dark:text-gray-500">-</span>}
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium ${getTransactionTextColor(tx.type)}`}
                              >
                                {isIncomeType(tx.type) ? '+' : isExpenseType(tx.type) ? '-' : ''}
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
                      <Pagination {...getPaginationProps(pagination)} />
                    </>
                  )}
                </>
              )}

              {activeTab ==='parties' && (
                <>
                  {stakeholders.length === 0 ? (
                    <EmptyState
                      title={t('projectDetail.stakeholders.notFound')}
                      description={t('projectDetail.stakeholders.noTransactions')}
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow hover={false}>
                          <TableHead>{t('projectDetail.stakeholders.role')}</TableHead>
                          <TableHead>{t('shared.transactionDetail.company')}</TableHead>
                          <TableHead className="text-right">{t('projectDetail.stakeholders.invoiceTotal')}</TableHead>
                          <TableHead className="text-right">{t('projectDetail.stakeholders.paymentCollection')}</TableHead>
                          <TableHead className="text-right">{t('projectDetail.stakeholders.balance')}</TableHead>
                          <TableHead className="text-right">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stakeholders.map((stakeholder) => {
                          const roleLabels: Record<
                            string,
                            {
                              label: string;
                              variant: 'success' | 'info' | 'purple' | 'warning' | 'gray';
                            }
                          > = {
                            customer: { label: t('projectDetail.roles.customer'), variant: 'success' },
                            supplier: { label: t('projectDetail.roles.supplier'), variant: 'info' },
                            subcontractor: { label: t('projectDetail.roles.subcontractor'), variant: 'purple' },
                            investor: { label: t('projectDetail.roles.investor'), variant: 'warning' },
                          };
                          const roleConfig = roleLabels[stakeholder.account_type] || {
                            label: stakeholder.account_type,
                            variant: 'gray' as const,
                          };
                          const balance = stakeholder.total_invoice - stakeholder.total_payment;
                          return (
                            <TableRow
                              key={stakeholder.company_id}
                              className="cursor-pointer"
                              onClick={() =>
                                setStakeholderDetailModal({
                                  company_id: stakeholder.company_id,
                                  company_name: stakeholder.company_name,
                                })
                              }
                            >
                              <TableCell>
                                <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{stakeholder.company_name}</span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(stakeholder.total_invoice)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(stakeholder.total_payment)}
                              </TableCell>
                              <TableCell className="text-right">
                                <BalanceBadge amount={balance} size="sm" />
                              </TableCell>
                              <TableCell className="text-right">
                                {stakeholder.transaction_count}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={ui.modalOpen}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        transaction={ui.editingTransaction}
        scope="project"
        entityId={project.id}
        companies={companies}
        categories={categories}
        onSave={handleSaveTransaction}
      />

      {/* Delete Transaction Confirmation */}
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

      {/* Stakeholder Detail Modal */}
      <StakeholderDetailModal
        stakeholder={stakeholderDetailModal}
        transactions={transactions}
        onClose={() => setStakeholderDetailModal(null)}
      />

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={ui.printPreviewOpen}
        onClose={() => dispatch({ type: 'CLOSE_PRINT_PREVIEW' })}
      >
        <ProjectPrintView
          ref={printRef}
          project={project!}
          transactions={transactions}
          categoryBreakdown={categoryBreakdown}
          parties={stakeholders.map((s) => ({
            id: s.company_id,
            role: s.account_type,
            company_name: s.company_name,
            phone: s.phone,
            email: s.email,
          }))}
        />
      </PrintPreviewModal>
    </div>
  );
}

export default ProjectDetail;
