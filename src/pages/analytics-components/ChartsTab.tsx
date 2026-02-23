import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiBarChart2 } from 'react-icons/fi';
import {
  Card,
  CardHeader,
  CardBody,
  Select,
  EmptyState,
} from '../../components/ui';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import type { ProjectWithSummary, CompanyWithBalance, CategoryBreakdown } from '../../types';

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#64748b', '#14b8a6', '#f97316',
];

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

interface ChartsTabProps {
  monthlyStats: FormattedMonthlyData[];
  totalIncome: number;
  totalExpense: number;
  selectedYear: number | 'all';
  projects: ProjectWithSummary[];
  companies: CompanyWithBalance[];
  selectedProject: string;
  setSelectedProject: (value: string) => void;
  selectedCompany: string;
  setSelectedCompany: (value: string) => void;
  projectBreakdown: CategoryBreakdown[];
  companyStats: CompanyMonthlyData[];
}

export const ChartsTab = memo(function ChartsTab({
  monthlyStats,
  totalIncome,
  totalExpense,
  selectedYear,
  projects,
  companies,
  selectedProject,
  setSelectedProject,
  selectedCompany,
  setSelectedCompany,
  projectBreakdown,
  companyStats,
}: ChartsTabProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
        <Card className="p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            {selectedYear === 'all' ? t('analytics.totalIncome') : t('analytics.yearlyIncome')}
          </p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 sm:text-2xl">
            {formatCompactCurrency(totalIncome)}
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            {selectedYear === 'all' ? t('analytics.totalExpense') : t('analytics.yearlyExpense')}
          </p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 sm:text-2xl">
            {formatCompactCurrency(totalExpense)}
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            {selectedYear === 'all' ? t('analytics.netProfitLoss') : t('analytics.yearlyNetProfitLoss')}
          </p>
          <p
            className={`text-xl sm:text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {formatCompactCurrency(totalIncome - totalExpense)}
          </p>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold sm:text-base">{t('analytics.monthlyTrend')}</h3>
          </CardHeader>
          <CardBody className="p-2 sm:p-6">
            {monthlyStats.every((m) => m.income === 0 && m.expense === 0) ? (
              <EmptyState icon={FiBarChart2} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyStats} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatCompactCurrency(v, true)}
                    width={60}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name={t('analytics.income')}
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name={t('analytics.expense')}
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Monthly Bar Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold sm:text-base">{t('analytics.monthlyProfitLoss')}</h3>
          </CardHeader>
          <CardBody className="p-2 sm:p-6">
            {monthlyStats.every((m) => m.profit === 0) ? (
              <EmptyState icon={FiBarChart2} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyStats} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatCompactCurrency(v, true)}
                    width={60}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="profit" name={t('analytics.profitLoss')} radius={[4, 4, 0, 0]}>
                    {monthlyStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Project Analysis */}
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold sm:text-base">{t('analytics.projectExpenseBreakdown')}</h3>
            <Select
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              value={selectedProject}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedProject(e.target.value)
              }
              placeholder={t('analytics.selectProject')}
              className="w-full sm:w-48"
            />
          </CardHeader>
          <CardBody className="p-2 sm:p-6">
            {!selectedProject ? (
              <EmptyState
                icon={FiBarChart2}
                title={t('analytics.selectProject')}
                description={t('analytics.selectProjectDesc')}
              />
            ) : projectBreakdown.length === 0 ? (
              <EmptyState icon={FiBarChart2} title={t('analytics.noExpenses')} />
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={projectBreakdown}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {projectBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div className="flex flex-wrap justify-center px-2 mt-2 gap-x-3 gap-y-1">
                  {projectBreakdown.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]" title={entry.category}>
                        {entry.category}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">
                        {(
                          (entry.total / projectBreakdown.reduce((s, e) => s + e.total, 0)) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Company Analysis */}
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold sm:text-base">{t('analytics.companyAnalysis')}</h3>
            <Select
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              value={selectedCompany}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedCompany(e.target.value)
              }
              placeholder={t('analytics.selectCompany')}
              className="w-full sm:w-48"
            />
          </CardHeader>
          <CardBody className="p-2 sm:p-6">
            {!selectedCompany ? (
              <EmptyState
                icon={FiBarChart2}
                title={t('analytics.selectCompany')}
                description={t('analytics.selectCompanyDesc')}
              />
            ) : selectedYear === 'all' ? (
              <EmptyState
                icon={FiBarChart2}
                title={t('analytics.selectYear')}
                description={t('analytics.selectYearDesc')}
              />
            ) : companyStats.every((m) => m.income === 0 && m.expense === 0) ? (
              <EmptyState icon={FiBarChart2} title={t('analytics.noMovements')} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={companyStats} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatCompactCurrency(v, true)}
                    width={60}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" name={t('analytics.income')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name={t('analytics.expense')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
});
