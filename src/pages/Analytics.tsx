import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiBarChart2, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import { Select } from '../components/ui/Input';
import { TabGroup, type TabItem } from '../components/ui/TabGroup';
import { PageSpinner } from '../components/ui/LoadingSpinner';
import { MONTHS } from '../utils/constants';
import { labelBreakdown, MAX_BREAKDOWN_SLICES } from '../utils/categories';
import type { MonthlyStats, CashFlowData } from '../types';
import { ChartsTab, type FormattedMonthlyData } from './analytics-components/ChartsTab';
import { CashFlowTab, type CashFlowFormattedData } from './analytics-components/CashFlowTab';
import { AgingTab } from './analytics-components/AgingTab';
import type { TFunction } from 'i18next';
import { useLoadedData } from '../hooks/useLoadedData';
import { NO_ITEMS } from '../utils/emptyList';
import { PageHeader } from '../components/shared/PageHeader';

function toMonthlySeries(t: TFunction, data: MonthlyStats[]): FormattedMonthlyData[] {
  return MONTHS.map((month) => {
    const found = data.find((d) => d.month === month.value);
    const income = found?.income || 0;
    const expense = found?.expense || 0;
    return {
      month: t(`enums.monthsShort.${month.value}`),
      income,
      expense,
      profit: income - expense,
    };
  });
}

const loadOverview = () =>
  Promise.all([
    window.electronAPI.project.getWithSummary(),
    window.electronAPI.company.getWithBalance(),
    window.electronAPI.transaction.getAll({}),
  ]).then(([projects, companies, transactions]) => ({
    projects,
    companies,
    years: [...new Set(transactions.map((tx) => new Date(tx.date).getFullYear()))].sort(
      (a, b) => b - a
    ),
  }));

function defaultYear(years: number[]): number | 'all' {
  const currentYear = new Date().getFullYear();
  if (years.includes(currentYear)) return currentYear;
  return years[0] ?? 'all';
}

async function loadMonthly(year: number | 'all', years: number[]): Promise<MonthlyStats[]> {
  if (year !== 'all') return window.electronAPI.analytics.getMonthlyStats(year);
  const perYear = await Promise.all(
    years.map((y) => window.electronAPI.analytics.getMonthlyStats(y))
  );
  const byMonth = new Map<string, MonthlyStats>();
  for (const d of perYear.flat()) {
    const existing = byMonth.get(d.month);
    byMonth.set(d.month, {
      month: d.month,
      income: (existing?.income ?? 0) + (d.income || 0),
      expense: (existing?.expense ?? 0) + (d.expense || 0),
      collected: (existing?.collected ?? 0) + (d.collected || 0),
      paid: (existing?.paid ?? 0) + (d.paid || 0),
    });
  }
  return [...byMonth.values()];
}

function toCashFlowSeries(t: TFunction, data: CashFlowData[]): CashFlowFormattedData[] {
  return data.map((d) => ({
    month: t(`enums.monthsShort.${String(d.month).padStart(2, '0')}`),
    collected: d.collected,
    paid: d.paid,
    netCash: d.netCash,
    cumulative: d.cumulative,
  }));
}

function Analytics() {
  const { t } = useTranslation();
  const [chosenYear, setSelectedYear] = useState<number | 'all' | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [activeTab, setActiveTab] = useState<'charts' | 'cashflow' | 'aging'>('charts');

  const { data: overview, loading } = useLoadedData(loadOverview, 'Analytics load error:');
  const projects = overview?.projects ?? NO_ITEMS;
  const companies = overview?.companies ?? NO_ITEMS;
  const availableYears = overview?.years ?? NO_ITEMS;

  const selectedYear = chosenYear ?? (overview ? defaultYear(overview.years) : 'all');

  const monthlyLoader = useMemo(
    () => (availableYears.length === 0 ? null : () => loadMonthly(selectedYear, availableYears)),
    [selectedYear, availableYears]
  );
  const { data: monthlyRaw } = useLoadedData(monthlyLoader, 'Monthly stats error:');
  const monthlyStats = useMemo(() => toMonthlySeries(t, monthlyRaw ?? NO_ITEMS), [t, monthlyRaw]);

  const breakdownLoader = useMemo(
    () =>
      selectedProject
        ? () =>
            window.electronAPI.analytics.getProjectCategoryBreakdown(parseInt(selectedProject, 10))
        : null,
    [selectedProject]
  );
  const { data: breakdownRaw } = useLoadedData(breakdownLoader, 'Project breakdown error:');
  const projectBreakdown = useMemo(
    () => labelBreakdown(t, breakdownRaw ?? NO_ITEMS, MAX_BREAKDOWN_SLICES),
    [t, breakdownRaw]
  );

  const companyLoader = useMemo(
    () =>
      selectedCompany && selectedYear !== 'all'
        ? () =>
            window.electronAPI.analytics.getCompanyMonthlyStats(
              parseInt(selectedCompany, 10),
              selectedYear
            )
        : null,
    [selectedCompany, selectedYear]
  );
  const { data: companyRaw } = useLoadedData(companyLoader, 'Company stats error:');
  const companyStats = useMemo(
    () => (companyRaw ? toMonthlySeries(t, companyRaw) : NO_ITEMS),
    [t, companyRaw]
  );

  const cashFlowLoader = useMemo(
    () =>
      activeTab === 'cashflow' && selectedYear !== 'all'
        ? () => window.electronAPI.analytics.getCashFlowReport(selectedYear)
        : null,
    [activeTab, selectedYear]
  );
  const { data: cashFlowRaw } = useLoadedData(cashFlowLoader, 'Cash flow error:');
  const cashFlowData = useMemo(
    () => toCashFlowSeries(t, cashFlowRaw ?? NO_ITEMS),
    [t, cashFlowRaw]
  );

  const agingLoader = useMemo(
    () => (activeTab === 'aging' ? () => window.electronAPI.analytics.getAgingReceivables() : null),
    [activeTab]
  );
  const { data: agingRaw } = useLoadedData(agingLoader, 'Aging receivables error:');
  const agingData = agingRaw ?? NO_ITEMS;

  const totalIncome = monthlyStats.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = monthlyStats.reduce((sum, m) => sum + m.expense, 0);

  const yearOptions = [
    { value: 'all', label: t('analytics.allTime') },
    ...availableYears.map((y) => ({ value: y, label: y.toString() })),
  ];

  const tabItems: TabItem<typeof activeTab>[] = [
    { key: 'charts', label: t('analytics.chartsTab'), icon: FiBarChart2 },
    { key: 'cashflow', label: t('analytics.cashFlowTab'), icon: FiTrendingUp },
    { key: 'aging', label: t('analytics.agingTab'), icon: FiAlertTriangle },
  ];

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="page-container">
      <PageHeader title={t('analytics.title')} subtitle={t('analytics.subtitle')}>
        <Select
          options={yearOptions}
          value={String(selectedYear)}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
          }
          className="w-36"
        />
      </PageHeader>

      <TabGroup tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'charts' && (
        <ChartsTab
          monthlyStats={monthlyStats}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          selectedYear={selectedYear}
          projects={projects}
          companies={companies}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          projectBreakdown={projectBreakdown}
          companyStats={companyStats}
        />
      )}

      {activeTab === 'cashflow' && (
        <CashFlowTab selectedYear={selectedYear} cashFlowData={cashFlowData} />
      )}

      {activeTab === 'aging' && <AgingTab agingData={agingData} />}
    </div>
  );
}

export default Analytics;
