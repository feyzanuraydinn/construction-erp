import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { FiTrendingUp, FiDollarSign } from 'react-icons/fi';
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
import {
  CHART_MARGIN,
  GRID_PROPS,
  MONTH_AXIS_PROPS,
  MONEY_AXIS_PROPS,
  moneyTooltipFormatter,
  LEGEND_STYLE,
} from '../../components/charts/chartConfig';
import { StatCard, signColor } from '../../components/ui/StatCard';

export interface CashFlowFormattedData {
  month: string;
  collected: number;
  paid: number;
  netCash: number;
  cumulative: number;
}

interface CashFlowTabProps {
  selectedYear: number | 'all';
  cashFlowData: CashFlowFormattedData[];
  className?: string;
}

export const CashFlowTab = memo(function CashFlowTab({
  selectedYear,
  cashFlowData,
  className,
}: CashFlowTabProps) {
  const { t } = useTranslation();

  if (selectedYear === 'all') {
    return (
      <EmptyState
        icon={FiTrendingUp}
        title={t('analytics.selectYear')}
        className={className}
        description={t('analytics.cashFlow.selectYearDesc')}
      />
    );
  }

  const totalCollected = cashFlowData.reduce((s, m) => s + m.collected, 0);
  const totalPaid = cashFlowData.reduce((s, m) => s + m.paid, 0);
  const netTotal = cashFlowData.reduce((s, m) => s + m.netCash, 0);
  const lastCumulative =
    cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].cumulative : 0;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-4">
        <StatCard
          title={t('analytics.cashFlow.totalCollected')}
          value={formatCompactCurrency(totalCollected)}
          valueColor="blue"
        />
        <StatCard
          title={t('analytics.cashFlow.totalPaid')}
          value={formatCompactCurrency(totalPaid)}
          valueColor="orange"
        />
        <StatCard
          title={t('analytics.cashFlow.netCashFlow')}
          value={formatCompactCurrency(netTotal)}
          valueColor={signColor(netTotal)}
        />
        <StatCard
          title={t('analytics.cashFlow.cumulativeBalance')}
          value={formatCompactCurrency(lastCumulative)}
          valueColor={signColor(lastCumulative)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold sm:text-base">
              {t('analytics.cashFlow.monthlyCollectionPayment')}
            </h3>
          </CardHeader>
          <CardBody className="sm:p-6">
            {cashFlowData.every((m) => m.collected === 0 && m.paid === 0) ? (
              <EmptyState icon={FiDollarSign} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cashFlowData} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis {...MONTH_AXIS_PROPS} />
                  <YAxis {...MONEY_AXIS_PROPS} />
                  <Tooltip formatter={moneyTooltipFormatter} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar
                    dataKey="collected"
                    name={t('analytics.cashFlow.collection')}
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="paid"
                    name={t('analytics.cashFlow.payment')}
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold sm:text-base">
              {t('analytics.cashFlow.cumulativeCashFlow')}
            </h3>
          </CardHeader>
          <CardBody className="sm:p-6">
            {cashFlowData.every((m) => m.cumulative === 0) ? (
              <EmptyState icon={FiTrendingUp} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cashFlowData} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis {...MONTH_AXIS_PROPS} />
                  <YAxis {...MONEY_AXIS_PROPS} />
                  <Tooltip formatter={moneyTooltipFormatter} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name={t('analytics.cashFlow.cumulativeBalanceLabel')}
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="netCash"
                    name={t('analytics.cashFlow.monthlyNetLabel')}
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.1}
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold sm:text-base">
            {t('analytics.cashFlow.monthlyCashFlowDetail')}
          </h3>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHeader>
              <TableRow hover={false}>
                <TableHead>{t('analytics.cashFlow.month')}</TableHead>
                <TableHead className="text-right">{t('analytics.cashFlow.collected')}</TableHead>
                <TableHead className="text-right">{t('analytics.cashFlow.paid')}</TableHead>
                <TableHead className="text-right">{t('analytics.cashFlow.monthlyNet')}</TableHead>
                <TableHead className="text-right">{t('analytics.cashFlow.cumulative')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlowData.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className="text-right text-blue-600 dark:text-blue-400">
                    {formatCurrency(row.collected)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600 dark:text-orange-400">
                    {formatCurrency(row.paid)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${row.netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {formatCurrency(row.netCash)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${row.cumulative >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {formatCurrency(row.cumulative)}
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
                  {t('analytics.cashFlow.total')}
                </TableCell>
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalCollected)}
                </TableCell>
                <TableCell className="text-right text-orange-600 dark:text-orange-400">
                  {formatCurrency(totalPaid)}
                </TableCell>
                <TableCell
                  className={`text-right ${netTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {formatCurrency(netTotal)}
                </TableCell>
                <TableCell
                  className={`text-right ${lastCumulative >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {formatCurrency(lastCumulative)}
                </TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
});
