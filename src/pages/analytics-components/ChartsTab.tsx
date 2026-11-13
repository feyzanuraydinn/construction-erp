import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiBarChart2 } from 'react-icons/fi';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCompactCurrency } from '../../utils/formatters';
import type { ProjectWithSummary, CompanyWithBalance, CategoryBreakdown } from '../../types';
import {
  CHART_MARGIN,
  GRID_PROPS,
  MONTH_AXIS_PROPS,
  MONEY_AXIS_PROPS,
  moneyTooltipFormatter,
  LEGEND_STYLE,
} from '../../components/charts/chartConfig';
import { CategoryDonut } from '../../components/charts/CategoryDonut';
import { StatCard, signColor } from '../../components/ui/StatCard';
import { CompanyAnalysisCard } from './CompanyAnalysisCard';

export interface FormattedMonthlyData {
  month: string;
  income: number;
  expense: number;
  profit: number;
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
  companyStats: FormattedMonthlyData[];
  className?: string;
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
  className,
}: ChartsTabProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
        <StatCard
          title={selectedYear === 'all' ? t('analytics.totalIncome') : t('analytics.yearlyIncome')}
          value={formatCompactCurrency(totalIncome)}
          valueColor="green"
        />
        <StatCard
          title={
            selectedYear === 'all' ? t('analytics.totalExpense') : t('analytics.yearlyExpense')
          }
          value={formatCompactCurrency(totalExpense)}
          valueColor="red"
        />
        <StatCard
          title={
            selectedYear === 'all'
              ? t('analytics.netProfitLoss')
              : t('analytics.yearlyNetProfitLoss')
          }
          value={formatCompactCurrency(totalIncome - totalExpense)}
          valueColor={signColor(totalIncome - totalExpense)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold sm:text-base">{t('analytics.monthlyTrend')}</h3>
          </CardHeader>
          <CardBody className="sm:p-6">
            {monthlyStats.every((m) => m.income === 0 && m.expense === 0) ? (
              <EmptyState icon={FiBarChart2} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyStats} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis {...MONTH_AXIS_PROPS} />
                  <YAxis {...MONEY_AXIS_PROPS} />
                  <Tooltip formatter={moneyTooltipFormatter} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
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

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold sm:text-base">
              {t('analytics.monthlyProfitLoss')}
            </h3>
          </CardHeader>
          <CardBody className="sm:p-6">
            {monthlyStats.every((m) => m.profit === 0) ? (
              <EmptyState icon={FiBarChart2} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyStats} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis {...MONTH_AXIS_PROPS} />
                  <YAxis {...MONEY_AXIS_PROPS} />
                  <Tooltip formatter={moneyTooltipFormatter} />
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold sm:text-base">
              {t('analytics.projectExpenseBreakdown')}
            </h3>
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
          <CardBody className="sm:p-6">
            {!selectedProject ? (
              <EmptyState
                icon={FiBarChart2}
                title={t('analytics.selectProject')}
                description={t('analytics.selectProjectDesc')}
              />
            ) : projectBreakdown.length === 0 ? (
              <EmptyState icon={FiBarChart2} title={t('analytics.noExpenses')} />
            ) : (
              <CategoryDonut data={projectBreakdown} />
            )}
          </CardBody>
        </Card>

        <CompanyAnalysisCard
          companies={companies}
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          selectedYear={selectedYear}
          companyStats={companyStats}
        />
      </div>
    </div>
  );
});
