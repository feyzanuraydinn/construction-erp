import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { FiBarChart2, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import { Select, TabGroup, LoadingSpinner } from '../components/ui';
import type { TabItem } from '../components/ui';
import { MONTHS } from '../utils/constants';
import type {
  ProjectWithSummary,
  CompanyWithBalance,
  MonthlyStats,
  CategoryBreakdown,
  CashFlowData,
  AgingReceivable,
} from '../types';
import { ChartsTab, CashFlowTab, AgingTab } from './analytics-components';
import type { CashFlowFormattedData } from './analytics-components';

interface FormattedMonthlyData {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

interface CompanyMonthlyData {
  month: string;
  income: number;
  expense: number;
}

function Analytics() {
  const { t } = useTranslation();
  const toast = useToast();
  const [monthlyStats, setMonthlyStats] = useState<FormattedMonthlyData[]>([]);
  const [projects, setProjects] = useState<ProjectWithSummary[]>([]);
  const [companies, setCompanies] = useState<CompanyWithBalance[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [projectBreakdown, setProjectBreakdown] = useState<CategoryBreakdown[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyMonthlyData[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowFormattedData[]>([]);
  const [agingData, setAgingData] = useState<AgingReceivable[]>([]);
  const [activeTab, setActiveTab] = useState<'charts' | 'cashflow' | 'aging'>('charts');
  const [loading, setLoading] = useState(true);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [projectsData, companiesData, transactionsData] = await Promise.all([
        window.electronAPI.project.getWithSummary(),
        window.electronAPI.company.getWithBalance(),
        window.electronAPI.transaction.getAll({}),
      ]);
      setProjects(projectsData);
      setCompanies(companiesData);

      const years = [
        ...new Set(transactionsData.map((t: { date: string }) => new Date(t.date).getFullYear())),
      ].sort((a, b) => b - a) as number[];
      setAvailableYears(years);

      const currentYear = new Date().getFullYear();
      if (years.includes(currentYear)) {
        setSelectedYear(currentYear);
      } else if (years.length > 0) {
        setSelectedYear(years[0]);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error(t('common.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyStats = async () => {
    try {
      if (selectedYear === 'all') {
        const allData: MonthlyStats[] = [];
        for (const year of availableYears) {
          const data = await window.electronAPI.analytics.getMonthlyStats(year);
          data.forEach((d: MonthlyStats) => {
            const existing = allData.find((a) => a.month === d.month);
            if (existing) {
              existing.income += d.income || 0;
              existing.expense += d.expense || 0;
              existing.collected += d.collected || 0;
              existing.paid += d.paid || 0;
            } else {
              allData.push({
                month: d.month,
                income: d.income || 0,
                expense: d.expense || 0,
                collected: d.collected || 0,
                paid: d.paid || 0,
              });
            }
          });
        }
        const formattedData = MONTHS.map((month) => {
          const found = allData.find((d) => d.month === month.value);
          return {
            month: t(`enums.monthsShort.${month.value}`),
            income: found?.income || 0,
            expense: found?.expense || 0,
            profit: (found?.income || 0) - (found?.expense || 0),
          };
        });
        setMonthlyStats(formattedData);
      } else {
        const data = await window.electronAPI.analytics.getMonthlyStats(selectedYear);
        const formattedData = MONTHS.map((month) => {
          const found = data.find((d: MonthlyStats) => d.month === month.value);
          return {
            month: t(`enums.monthsShort.${month.value}`),
            income: found?.income || 0,
            expense: found?.expense || 0,
            profit: (found?.income || 0) - (found?.expense || 0),
          };
        });
        setMonthlyStats(formattedData);
      }
    } catch (error) {
      console.error('Monthly stats error:', error);
      toast.error(t('common.loadError'));
    }
  };

  const loadProjectBreakdown = async () => {
    try {
      const projectId =
        typeof selectedProject === 'string' ? parseInt(selectedProject, 10) : selectedProject;
      const data = await window.electronAPI.analytics.getProjectCategoryBreakdown(projectId);
      const sorted = [...data].sort(
        (a: CategoryBreakdown, b: CategoryBreakdown) => b.total - a.total
      );
      if (sorted.length > 8) {
        const top7 = sorted.slice(0, 7);
        const others = sorted.slice(7);
        const otherTotal = others.reduce(
          (sum: number, item: CategoryBreakdown) => sum + item.total,
          0
        );
        top7.push({ category: t('analytics.other'), total: otherTotal, color: '#94a3b8' });
        setProjectBreakdown(top7);
      } else {
        setProjectBreakdown(sorted);
      }
    } catch (error) {
      console.error('Project breakdown error:', error);
      toast.error(t('common.loadError'));
    }
  };

  const loadCompanyStats = async () => {
    try {
      const companyId =
        typeof selectedCompany === 'string' ? parseInt(selectedCompany, 10) : selectedCompany;
      const yearParam = selectedYear === 'all' ? new Date().getFullYear() : selectedYear;
      const data = await window.electronAPI.analytics.getCompanyMonthlyStats(companyId, yearParam);
      const formattedData = MONTHS.map((month) => {
        const found = data.find((d: MonthlyStats) => d.month === month.value);
        return {
          month: t(`enums.monthsShort.${month.value}`),
          income: found?.income || 0,
          expense: found?.expense || 0,
        };
      });
      setCompanyStats(formattedData);
    } catch (error) {
      console.error('Company stats error:', error);
      toast.error(t('common.loadError'));
    }
  };

  const loadCashFlowData = useCallback(async () => {
    try {
      if (selectedYear === 'all') return;
      const data = await window.electronAPI.analytics.getCashFlowReport(selectedYear);
      const formatted: CashFlowFormattedData[] = data.map((d: CashFlowData) => {
        const monthKey = String(d.month).padStart(2, '0');
        return {
          month: t(`enums.monthsShort.${monthKey}`),
          collected: d.collected,
          paid: d.paid,
          netCash: d.netCash,
          cumulative: d.cumulative,
        };
      });
      setCashFlowData(formatted);
    } catch (error) {
      console.error('Cash flow error:', error);
      toast.error(t('common.loadError'));
    }
  }, [selectedYear, toast, t]);

  const loadAgingData = useCallback(async () => {
    try {
      const data = await window.electronAPI.analytics.getAgingReceivables();
      setAgingData(data);
    } catch (error) {
      console.error('Aging receivables error:', error);
      toast.error(t('common.loadError'));
    }
  }, [toast, t]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (availableYears.length > 0) {
      loadMonthlyStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, availableYears]);

  useEffect(() => {
    if (selectedProject) loadProjectBreakdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  useEffect(() => {
    if (selectedCompany && selectedYear !== 'all') {
      loadCompanyStats();
    } else if (selectedCompany && selectedYear === 'all') {
      setCompanyStats([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, selectedYear]);

  useEffect(() => {
    if (activeTab === 'cashflow' && selectedYear !== 'all') {
      loadCashFlowData();
    }
  }, [activeTab, selectedYear, loadCashFlowData]);

  useEffect(() => {
    if (activeTab === 'aging') {
      loadAgingData();
    }
  }, [activeTab, loadAgingData]);

  const totalIncome = monthlyStats.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = monthlyStats.reduce((sum, m) => sum + m.expense, 0);

  const yearOptions = [
    { value: 'all', label: t('analytics.allTime') },
    ...availableYears.map((y) => ({ value: y, label: y.toString() })),
  ];

  const tabItems: TabItem[] = [
    { key: 'charts', label: t('analytics.chartsTab'), icon: FiBarChart2 },
    { key: 'cashflow', label: t('analytics.cashFlowTab'), icon: FiTrendingUp },
    { key: 'aging', label: t('analytics.agingTab'), icon: FiAlertTriangle },
  ];

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
          <h1 className="page-title">{t('analytics.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('analytics.subtitle')}</p>
        </div>
        <Select
          options={yearOptions}
          value={String(selectedYear)}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
          }
          className="w-36"
        />
      </div>

      {/* Tab Navigation */}
      <TabGroup
        tabs={tabItems}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        className="mb-6"
      />

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
        <CashFlowTab
          selectedYear={selectedYear}
          cashFlowData={cashFlowData}
        />
      )}

      {activeTab === 'aging' && (
        <AgingTab agingData={agingData} />
      )}
    </div>
  );
}

export default Analytics;
