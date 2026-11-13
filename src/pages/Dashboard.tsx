import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TransactionDetailView } from '../components/shared/TransactionDetailView';
import { useTransactionAllocations } from '../hooks/useTransactionAllocations';
import { PageSpinner } from '../components/ui/LoadingSpinner';
import { useDataCache, createCacheKey } from '../hooks/useDataCache';
import { calculateDashboardFinancials } from '../utils/financials';
import { formatDateForInput } from '../utils/formatters';
import type { DashboardStats, TransactionWithDetails, ProjectWithSummary } from '../types';
import { useReportLoadError } from '../hooks/useReportLoadError';
import { toLocalDateString } from '../utils/dates';
import { useLoadedData } from '../hooks/useLoadedData';
import { NO_ITEMS } from '../utils/emptyList';
import { PageHeader } from '../components/shared/PageHeader';
import { RankedCompanyCard } from './dashboard-components/RankedCompanyCard';
import { getDateRange, type DateFilter } from './dashboard-components/dateRange';
import { DashboardToolbar } from './dashboard-components/DashboardToolbar';
import {
  DashboardProfitCards,
  DashboardCashCards,
} from './dashboard-components/DashboardStatCards';
import { RecentTransactionsCard } from './dashboard-components/RecentTransactionsCard';
import { ActiveProjectsCard } from './dashboard-components/ActiveProjectsCard';

const CACHE_OPTIONS = { refreshInterval: 2 * 60 * 1000 };
const STATS_KEY = createCacheKey<DashboardStats>('dashboard:stats');
const TRANSACTIONS_KEY = createCacheKey<TransactionWithDetails[]>('dashboard:transactions');
const PROJECTS_KEY = createCacheKey<ProjectWithSummary[]>('dashboard:projects');

const fetchStats = () => window.electronAPI.dashboard.getStats();
const fetchTransactions = () => window.electronAPI.transaction.getAll({});
const fetchProjects = () => window.electronAPI.project.getWithSummary();
const TOP_LIST_SIZE = 5;
const loadRankedCompanies = () =>
  Promise.all([
    window.electronAPI.dashboard.getTopDebtors(TOP_LIST_SIZE),
    window.electronAPI.dashboard.getTopCreditors(TOP_LIST_SIZE),
  ]).then(([debtors, creditors]) => ({ debtors, creditors }));

function Dashboard() {
  const { t } = useTranslation();
  const reportLoadError = useReportLoadError();
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(
    null
  );
  const selectedAllocations = useTransactionAllocations(selectedTransaction);
  const [dateFilter, setDateFilter] = useState<DateFilter>('year');

  const {
    data: stats,
    loading: statsLoading,
    refresh: refreshStats,
    isStale: statsStale,
    error: statsError,
  } = useDataCache(STATS_KEY, fetchStats, CACHE_OPTIONS);

  const {
    data: allTransactions,
    loading: txLoading,
    refresh: refreshTx,
    isStale: txStale,
    error: txError,
  } = useDataCache(TRANSACTIONS_KEY, fetchTransactions, CACHE_OPTIONS);

  const { data: ranked, reload: reloadRanked } = useLoadedData(
    loadRankedCompanies,
    'Debtors/creditors loading error:'
  );
  const topDebtors = ranked?.debtors ?? NO_ITEMS;
  const topCreditors = ranked?.creditors ?? NO_ITEMS;

  const {
    data: allProjects,
    loading: projectsLoading,
    refresh: refreshProjects,
    error: projectsError,
  } = useDataCache(PROJECTS_KEY, fetchProjects, CACHE_OPTIONS);

  const cacheError = statsError ?? txError ?? projectsError;
  useEffect(() => {
    if (cacheError) reportLoadError('Dashboard load error:', cacheError);
  }, [cacheError, reportLoadError]);

  const projects = useMemo(
    () => allProjects?.filter((p) => p.status === 'active').slice(0, 5) ?? [],
    [allProjects]
  );

  const loading =
    (statsLoading && !stats) ||
    (txLoading && !allTransactions) ||
    (projectsLoading && !allProjects);

  const isStale = statsStale || txStale;

  const loadDashboardData = useCallback(async () => {
    await Promise.all([refreshStats(), refreshTx(), reloadRanked(), refreshProjects()]);
  }, [refreshStats, refreshTx, reloadRanked, refreshProjects]);

  const filteredData = useMemo(() => {
    const { start } = getDateRange(dateFilter);
    const transactions = allTransactions ?? [];

    const startDate = start ? toLocalDateString(start) : null;
    const filtered = startDate
      ? transactions.filter((tx) => formatDateForInput(tx.date) >= startDate)
      : transactions;

    const financials = calculateDashboardFinancials(filtered);

    return {
      transactions: filtered.slice(0, 8),
      ...financials,
    };
  }, [allTransactions, dateFilter]);

  const recentTransactions =
    dateFilter === 'all' ? (allTransactions ?? []).slice(0, 8) : filteredData.transactions;

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="page-container">
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
        <DashboardToolbar
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          isStale={isStale}
          onRefresh={loadDashboardData}
        />
      </PageHeader>

      <DashboardProfitCards financials={filteredData} />
      <DashboardCashCards financials={filteredData} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecentTransactionsCard
            transactions={recentTransactions}
            onSelect={setSelectedTransaction}
          />
          <ActiveProjectsCard projects={projects} />
        </div>

        <div className="space-y-6">
          <RankedCompanyCard
            title={t('dashboard.debtors')}
            subtitle={t('dashboard.debtorsSubtitle')}
            emptyText={t('dashboard.noDebtors')}
            companies={topDebtors}
            tone="green"
            balanceOf={(company) => company.balance}
          />
          <RankedCompanyCard
            title={t('dashboard.creditors')}
            subtitle={t('dashboard.creditorsSubtitle')}
            emptyText={t('dashboard.noCreditors')}
            companies={topCreditors}
            tone="red"
            balanceOf={(company) => -company.balance}
          />
        </div>
      </div>

      <TransactionDetailView
        transaction={selectedTransaction}
        allocations={selectedAllocations}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}

export default Dashboard;
