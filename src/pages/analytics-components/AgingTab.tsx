import { memo } from 'react';
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
import { FiAlertTriangle } from 'react-icons/fi';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import type { AgingReceivable } from '../../types';
import {
  AXIS_TICK,
  GRID_PROPS,
  LEGEND_STYLE,
  moneyTickFormatter,
  moneyTooltipFormatter,
} from '../../components/charts/chartConfig';
import { StatCard } from '../../components/ui/StatCard';

interface AgingTabProps {
  agingData: AgingReceivable[];
  className?: string;
}

export const AgingTab = memo(function AgingTab({ agingData, className }: AgingTabProps) {
  const { t } = useTranslation();

  const totalCurrent = agingData.reduce((s, a) => s + a.current, 0);
  const totalDays30 = agingData.reduce((s, a) => s + a.days30, 0);
  const totalDays60 = agingData.reduce((s, a) => s + a.days60, 0);
  const totalDays90plus = agingData.reduce((s, a) => s + a.days90plus, 0);
  const totalAll = agingData.reduce((s, a) => s + a.total, 0);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-4">
        <StatCard
          title={t('analytics.aging.current')}
          value={formatCompactCurrency(totalCurrent)}
          valueColor="green"
        />
        <StatCard
          title={t('analytics.aging.days30')}
          value={formatCompactCurrency(totalDays30)}
          valueColor="yellow"
        />
        <StatCard
          title={t('analytics.aging.days60')}
          value={formatCompactCurrency(totalDays60)}
          valueColor="orange"
        />
        <StatCard
          title={t('analytics.aging.days90plus')}
          value={formatCompactCurrency(totalDays90plus)}
          valueColor="red"
        />
      </div>

      {agingData.length === 0 ? (
        <EmptyState
          icon={FiAlertTriangle}
          title={t('analytics.aging.noOverdue')}
          description={t('analytics.aging.allCollected')}
        />
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-sm font-semibold sm:text-base">
                {t('analytics.aging.companyAnalysis')}
              </h3>
            </CardHeader>
            <CardBody className="sm:p-6">
              <ResponsiveContainer width="100%" height={Math.max(250, agingData.length * 40)}>
                <BarChart
                  data={agingData.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis type="number" tick={AXIS_TICK} tickFormatter={moneyTickFormatter} />
                  <YAxis type="category" dataKey="companyName" tick={AXIS_TICK} width={120} />
                  <Tooltip formatter={moneyTooltipFormatter} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar
                    dataKey="current"
                    name={t('analytics.aging.current')}
                    stackId="aging"
                    fill="#22c55e"
                  />
                  <Bar
                    dataKey="days30"
                    name={t('analytics.aging.days30')}
                    stackId="aging"
                    fill="#eab308"
                  />
                  <Bar
                    dataKey="days60"
                    name={t('analytics.aging.days60')}
                    stackId="aging"
                    fill="#f97316"
                  />
                  <Bar
                    dataKey="days90plus"
                    name={t('analytics.aging.days90plus')}
                    stackId="aging"
                    fill="#ef4444"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold sm:text-base">
                {t('analytics.aging.detailTitle')}
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  ({t('analytics.aging.companyCount', { count: agingData.length })})
                </span>
              </h3>
            </CardHeader>
            <CardBody>
              <Table>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead>{t('analytics.aging.company')}</TableHead>
                    <TableHead className="text-right">{t('analytics.aging.current')}</TableHead>
                    <TableHead className="text-right">{t('analytics.aging.days30')}</TableHead>
                    <TableHead className="text-right">{t('analytics.aging.days60')}</TableHead>
                    <TableHead className="text-right">{t('analytics.aging.days90plus')}</TableHead>
                    <TableHead className="text-right">{t('analytics.aging.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.companyName}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {row.current > 0 ? formatCurrency(row.current) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-yellow-600 dark:text-yellow-400">
                        {row.days30 > 0 ? formatCurrency(row.days30) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 dark:text-orange-400">
                        {row.days60 > 0 ? formatCurrency(row.days60) : '-'}
                      </TableCell>
                      <TableCell
                        className={`text-right ${row.days90plus > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}
                      >
                        {row.days90plus > 0 ? formatCurrency(row.days90plus) : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-right">
                        {formatCurrency(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <TableRow
                    hover={false}
                    className="font-semibold border-t-2 bg-gray-50 dark:bg-gray-800"
                  >
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {t('analytics.aging.total')}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {formatCurrency(totalCurrent)}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600 dark:text-yellow-400">
                      {formatCurrency(totalDays30)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 dark:text-orange-400">
                      {formatCurrency(totalDays60)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {formatCurrency(totalDays90plus)}
                    </TableCell>
                    <TableCell className="text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(totalAll)}
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
});
