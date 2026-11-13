import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
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
import type { CompanyWithBalance } from '../../types';
import {
  CHART_MARGIN,
  GRID_PROPS,
  MONTH_AXIS_PROPS,
  MONEY_AXIS_PROPS,
  moneyTooltipFormatter,
  LEGEND_STYLE,
} from '../../components/charts/chartConfig';
import type { FormattedMonthlyData } from './ChartsTab';

interface CompanyAnalysisCardProps {
  companies: CompanyWithBalance[];
  selectedCompany: string;
  setSelectedCompany: (value: string) => void;
  selectedYear: number | 'all';
  companyStats: FormattedMonthlyData[];
  className?: string;
}

export function CompanyAnalysisCard({
  companies,
  selectedCompany,
  setSelectedCompany,
  selectedYear,
  companyStats,
  className,
}: CompanyAnalysisCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold sm:text-base">{t('analytics.companyAnalysis')}</h3>
        <Select
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          value={selectedCompany}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCompany(e.target.value)}
          placeholder={t('analytics.selectCompany')}
          className="w-full sm:w-48"
        />
      </CardHeader>
      <CardBody className="sm:p-6">
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
            <BarChart data={companyStats} margin={CHART_MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis {...MONTH_AXIS_PROPS} />
              <YAxis {...MONEY_AXIS_PROPS} />
              <Tooltip formatter={moneyTooltipFormatter} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar
                dataKey="income"
                name={t('analytics.income')}
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name={t('analytics.expense')}
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
