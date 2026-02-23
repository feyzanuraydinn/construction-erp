import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiTrendingDown, FiUsers, FiRefreshCw, FiCreditCard } from 'react-icons/fi';
import { TbCurrencyLira } from 'react-icons/tb';
import {
  Card,
  CardHeader,
  CardBody,
  StatCard,
  Badge,
  BalanceBadge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  LoadingSpinner,
} from '../components/ui';
import { useDataCache, calculateDashboardFinancials } from '../hooks';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getTransactionColor, getTransactionTextColor } from '../utils/transactionHelpers';
import { TRANSACTION_TYPE_LABELS } from '../utils/constants';
import type {
  DashboardStats,
  TransactionWithDetails,
  DebtorCreditor,
  ProjectWithSummary,
  TransactionType,
} from '../types';

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

const getDateRange = (filter: DateFilter): { start: Date | null; end: Date } => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (filter) {
    case 'today':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end };
    case 'week': {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      return { start: startOfWeek, end };
    }
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end };
    default:
      return { start: null, end };
  }
};

const getTransactionPrefix = (type: TransactionType): string => {
  switch (type) {
    case 'invoice_out':
      return '+';
    case 'payment_in':
      return '+';
    case 'invoice_in':
      return '-';
    case 'payment_out':
      return '-';
    default:
      return '';
  }
};

// Cache configuration - 5 minutes TTL, auto-refresh every 2 minutes
const CACHE_OPTIONS = { ttl: 5 * 60 * 1000, refreshInterval: 2 * 60 * 1000 };

// Fetcher functions defined outside component to prevent re-creation
const fetchStats = () => window.electronAPI.dashboard.getStats();
const fetchTransactions = () => window.electronAPI.transaction.getAll({});
const fetchProjects = () => window.electronAPI.project.getWithSummary();

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(
    null
  );
  const [dateFilter, setDateFilter] = useState<DateFilter>('year');

  const DATE_FILTERS: { value: DateFilter; label: string }[] = useMemo(() => [
    { value: 'year', label: t('dashboard.dateFilters.year') },
    { value: 'month', label: t('dashboard.dateFilters.month') },
    { value: 'week', label: t('dashboard.dateFilters.week') },
    { value: 'today', label: t('dashboard.dateFilters.today') },
    { value: 'all', label: t('dashboard.dateFilters.all') },
  ], [t]);

  // Use cached data hooks
  const {
    data: stats,
    loading: statsLoading,
    refresh: refreshStats,
    isStale: statsStale,
  } = useDataCache<DashboardStats>('dashboard:stats', fetchStats, CACHE_OPTIONS);

  const {
    data: allTransactions,
    loading: txLoading,
    refresh: refreshTx,
    isStale: txStale,
  } = useDataCache<TransactionWithDetails[]>(
    'dashboard:transactions',
    fetchTransactions,
    CACHE_OPTIONS
  );

  // Borçlu/alacaklı listesi tarih filtresine göre güncellenir
  const [topDebtors, setTopDebtors] = useState<DebtorCreditor[]>([]);
  const [topCreditors, setTopCreditors] = useState<DebtorCreditor[]>([]);
  const [debtorsLoading, setDebtorsLoading] = useState(true);
  const [creditorsLoading, setCreditorsLoading] = useState(true);

  const fetchDebtorsCreditors = useCallback(async (filter: DateFilter) => {
    setDebtorsLoading(true);
    setCreditorsLoading(true);
    try {
      const { start } = getDateRange(filter);
      const startDate = start ? start.toISOString().split('T')[0] : undefined;
      const [debtors, creditors] = await Promise.all([
        window.electronAPI.dashboard.getTopDebtors(5, startDate),
        window.electronAPI.dashboard.getTopCreditors(5, startDate),
      ]);
      setTopDebtors(debtors || []);
      setTopCreditors(creditors || []);
    } catch (error) {
      console.error('Debtors/creditors loading error:', error);
      toast.error(t('common.loadError'));
    } finally {
      setDebtorsLoading(false);
      setCreditorsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchDebtorsCreditors(dateFilter);
  }, [dateFilter, fetchDebtorsCreditors]);

  const {
    data: allProjects,
    loading: projectsLoading,
    refresh: refreshProjects,
  } = useDataCache<ProjectWithSummary[]>('dashboard:projects', fetchProjects, CACHE_OPTIONS);

  // Derive active projects from cached data
  const projects = useMemo(
    () => allProjects?.filter((p) => p.status === 'active').slice(0, 5) ?? [],
    [allProjects]
  );

  // Combined loading state
  const loading =
    statsLoading || txLoading || debtorsLoading || creditorsLoading || projectsLoading;

  // Show stale indicator
  const isStale = statsStale || txStale;

  // Refresh all data
  const loadDashboardData = useCallback(async () => {
    await Promise.all([
      refreshStats(),
      refreshTx(),
      fetchDebtorsCreditors(dateFilter),
      refreshProjects(),
    ]);
  }, [refreshStats, refreshTx, fetchDebtorsCreditors, dateFilter, refreshProjects]);

  const filteredData = useMemo(() => {
    const { start } = getDateRange(dateFilter);
    const transactions = allTransactions ?? [];

    const filtered = start ? transactions.filter((tx) => new Date(tx.date) >= start) : transactions;

    // Merkezi hesaplama fonksiyonu ile dashboard finansalları
    const financials = calculateDashboardFinancials(filtered);

    return {
      transactions: filtered.slice(0, 8),
      ...financials,
    };
  }, [allTransactions, dateFilter]);

  const displayStats =
    dateFilter === 'all'
      ? stats
      : {
          ...stats,
          totalIncome: filteredData.totalIncome,
          totalExpense: filteredData.totalExpense,
          netProfit: filteredData.netProfit,
          totalCollected: filteredData.totalCollected,
          totalPaid: filteredData.totalPaid,
        };

  const recentTransactions =
    dateFilter === 'all' ? (allTransactions ?? []).slice(0, 8) : filteredData.transactions;

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            {DATE_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={dateFilter === filter.value ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => setDateFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <Button
            variant="secondary"
            icon={FiRefreshCw}
            onClick={loadDashboardData}
            className={isStale ? 'ring-2 ring-yellow-400' : ''}
            title={isStale ? t('dashboard.updating') : t('dashboard.refresh')}
          >
            {isStale ? t('dashboard.updatingShort') : t('dashboard.refreshShort')}
          </Button>
        </div>
      </div>

      {/* Stats Grid - Row 1: Gelir/Gider (Kar-Zarar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title={t('dashboard.totalIncome')}
          value={formatCurrency(displayStats?.totalIncome)}
          subtitle={t('dashboard.salesInvoices')}
          icon={FiTrendingUp}
          color="green"
        />
        <StatCard
          title={t('dashboard.totalExpense')}
          value={formatCurrency(displayStats?.totalExpense)}
          subtitle={t('dashboard.purchaseInvoices')}
          icon={FiTrendingDown}
          color="red"
        />
        <StatCard
          title={t('dashboard.netProfit')}
          value={formatCurrency(displayStats?.netProfit)}
          subtitle={
            displayStats?.netProfit !== undefined && displayStats.netProfit >= 0
              ? t('dashboard.profitable')
              : t('dashboard.loss')
          }
          icon={TbCurrencyLira}
          color={
            displayStats?.netProfit !== undefined && displayStats.netProfit >= 0 ? 'green' : 'red'
          }
          highlighted
        />
      </div>

      {/* Stats Grid - Row 2: Nakit Akışı ve Cari Bakiyeler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('dashboard.totalCollected')}
          value={formatCurrency(displayStats?.totalCollected)}
          subtitle={t('dashboard.fromCustomers')}
          icon={FiCreditCard}
          color="blue"
        />
        <StatCard
          title={t('dashboard.totalPaid')}
          value={formatCurrency(displayStats?.totalPaid)}
          subtitle={t('dashboard.toSuppliers')}
          icon={FiCreditCard}
          color="orange"
        />
        <StatCard
          title={t('dashboard.totalReceivables')}
          value={formatCurrency(stats?.totalReceivables)}
          subtitle={t('dashboard.theyOweUs')}
          icon={FiUsers}
          color="green"
        />
        <StatCard
          title={t('dashboard.totalPayables')}
          value={formatCurrency(stats?.totalPayables)}
          subtitle={t('dashboard.weOweThem')}
          icon={FiUsers}
          color="red"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Transactions & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.recentTransactions')}</h3>
              <Button variant="ghost" size="xs" onClick={() => navigate('/transactions')}>
                {t('dashboard.viewAll')}
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">{t('dashboard.noTransactions')}</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentTransactions.map((tx) => (
                    <button
                      key={tx.id}
                      type="button"
                      className="w-full text-left px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => setSelectedTransaction(tx)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getTransactionColor(tx.type)}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tx.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t(TRANSACTION_TYPE_LABELS[tx.type])} •{' '}
                            {tx.company_name || tx.project_name || t('dashboard.companyGeneral')} •{' '}
                            {formatDate(tx.date)}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${getTransactionTextColor(tx.type)}`}>
                        {getTransactionPrefix(tx.type)}
                        {formatCurrency(tx.amount)}
                        {tx.currency !== 'TRY' && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({tx.currency})</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Active Projects */}
          <Card className="overflow-hidden">
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.activeProjects')}</h3>
              <Button variant="ghost" size="xs" onClick={() => navigate('/projects')}>
                {t('dashboard.viewAll')}
              </Button>
            </CardHeader>
            <CardBody className="p-0 overflow-hidden">
              {projects.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">{t('dashboard.noActiveProjects')}</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {projects.map((project) => {
                    const totalExpense = project.total_expense || 0;
                    const budgetUsed = project.estimated_budget
                      ? (totalExpense / project.estimated_budget) * 100
                      : 0;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{project.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{project.code}</p>
                          </div>
                          <Badge
                            variant={project.ownership_type === 'own' ? 'info' : 'purple'}
                            className="flex-shrink-0"
                          >
                            {project.ownership_type === 'own' ? t('dashboard.own') : t('dashboard.client')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          {project.estimated_budget ? (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <span>{t('dashboard.budgetUsage')}</span>
                                <span>{budgetUsed.toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    budgetUsed > 90
                                      ? 'bg-red-500'
                                      : budgetUsed > 70
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1" />
                          )}
                          <div className="text-right flex-shrink-0">
                            <BalanceBadge amount={(project.total_income || 0) - (project.total_expense || 0)} size="sm" />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.projectProfit')}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column - Debtors, Creditors, Low Stock */}
        <div className="space-y-6">
          {/* Top Debtors */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.debtors')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.debtorsSubtitle')}</p>
            </CardHeader>
            <CardBody className="p-0">
              {!topDebtors || topDebtors.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">{t('dashboard.noDebtors')}</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {topDebtors.map((debtor, index) => (
                    <button
                      key={debtor.id}
                      type="button"
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => navigate(`/companies/${debtor.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{debtor.name}</span>
                      </div>
                      <BalanceBadge amount={debtor.balance} size="sm" showIcon={false} />
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Top Creditors */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.creditors')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.creditorsSubtitle')}</p>
            </CardHeader>
            <CardBody className="p-0">
              {!topCreditors || topCreditors.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('dashboard.noCreditors')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {topCreditors.map((creditor, index) => (
                    <button
                      key={creditor.id}
                      type="button"
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => navigate(`/companies/${creditor.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{creditor.name}</span>
                      </div>
                      <BalanceBadge amount={creditor.balance} size="sm" showIcon={false} />
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <Modal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} size="lg">
        {selectedTransaction && (
          <>
            <ModalHeader onClose={() => setSelectedTransaction(null)}>{t('dashboard.transactionDetail')}</ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.labels.date')}</label>
                  <p className="py-2 text-gray-900 dark:text-gray-100">{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.labels.type')}</label>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(selectedTransaction.type)} text-white`}
                  >
                    {t(TRANSACTION_TYPE_LABELS[selectedTransaction.type])}
                  </span>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.labels.source')}</label>
                  <p className="py-2 text-gray-900 dark:text-gray-100">
                    {selectedTransaction.company_name
                      ? t('dashboard.labels.cari')
                      : selectedTransaction.project_name
                        ? t('dashboard.labels.project')
                        : t('dashboard.labels.company')}
                  </p>
                </div>
                {selectedTransaction.company_name && (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.labels.cari')}</label>
                    <p className="py-2 text-gray-900 dark:text-gray-100">{selectedTransaction.company_name}</p>
                  </div>
                )}
                {selectedTransaction.project_name && (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.labels.project')}</label>
                    <p className="py-2 text-gray-900 dark:text-gray-100">{selectedTransaction.project_name}</p>
                  </div>
                )}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.labels.amount')}</label>
                  <p
                    className={`text-lg font-bold ${getTransactionTextColor(selectedTransaction.type)}`}
                  >
                    {getTransactionPrefix(selectedTransaction.type)}
                    {formatCurrency(selectedTransaction.amount)}
                    {selectedTransaction.currency !== 'TRY' && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        ({selectedTransaction.currency})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.labels.category')}</label>
                  <p className="py-2 text-gray-900 dark:text-gray-100">{selectedTransaction.category_name ? t(`categories.${selectedTransaction.category_name}`, selectedTransaction.category_name) : '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard.labels.description')}</label>
                  <p className="py-2 text-gray-900 dark:text-gray-100">{selectedTransaction.description || '-'}</p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setSelectedTransaction(null)}>
                {t('common.close')}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}

export default Dashboard;
