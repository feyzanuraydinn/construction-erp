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
import {
  Card,
  CardHeader,
  CardBody,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';

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
}

export const CashFlowTab = memo(function CashFlowTab({
  selectedYear,
  cashFlowData,
}: CashFlowTabProps) {
  const { t } = useTranslation();

  if (selectedYear === 'all') {
    return (
      <EmptyState
        icon={FiTrendingUp}
        title={t('analytics.selectYear')}
        description={t('analytics.cashFlow.selectYearDesc')}
      />
    );
  }

  const totalCollected = cashFlowData.reduce((s, m) => s + m.collected, 0);
  const totalPaid = cashFlowData.reduce((s, m) => s + m.paid, 0);
  const netTotal = cashFlowData.reduce((s, m) => s + m.netCash, 0);
  const lastCumulative = cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].cumulative : 0;

  return (
    <>
      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-4">
        <Card className="p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{t('analytics.cashFlow.totalCollected')}</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 sm:text-2xl">
            {formatCompactCurrency(totalCollected)}
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{t('analytics.cashFlow.totalPaid')}</p>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400 sm:text-2xl">
            {formatCompactCurrency(totalPaid)}
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{t('analytics.cashFlow.netCashFlow')}</p>
          <p className={`text-xl sm:text-2xl font-bold ${netTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCompactCurrency(netTotal)}
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{t('analytics.cashFlow.cumulativeBalance')}</p>
          <p className={`text-xl sm:text-2xl font-bold ${lastCumulative >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCompactCurrency(lastCumulative)}
          </p>
        </Card>
      </div>

      {/* Cash Flow Charts */}
      <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-2">
        {/* Monthly Cash Flow Bar */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold sm:text-base">{t('analytics.cashFlow.monthlyCollectionPayment')}</h3>
          </CardHeader>
          <CardBody className="p-2 sm:p-6">
            {cashFlowData.every((m) => m.collected === 0 && m.paid === 0) ? (
              <EmptyState icon={FiDollarSign} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cashFlowData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatCompactCurrency(v, true)}
                    width={60}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="collected" name={t('analytics.cashFlow.collection')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name={t('analytics.cashFlow.payment')} fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Cumulative Cash Flow Area */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold sm:text-base">{t('analytics.cashFlow.cumulativeCashFlow')}</h3>
          </CardHeader>
          <CardBody className="p-2 sm:p-6">
            {cashFlowData.every((m) => m.cumulative === 0) ? (
              <EmptyState icon={FiTrendingUp} title={t('analytics.noData')} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cashFlowData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatCompactCurrency(v, true)}
                    width={60}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
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

      {/* Cash Flow Detail Table */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold sm:text-base">{t('analytics.cashFlow.monthlyCashFlowDetail')}</h3>
        </CardHeader>
        <CardBody className="p-0">
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
                  <TableCell className="text-right text-blue-600 dark:text-blue-400">{formatCurrency(row.collected)}</TableCell>
                  <TableCell className="text-right text-orange-600 dark:text-orange-400">{formatCurrency(row.paid)}</TableCell>
                  <TableCell className={`text-right font-medium ${row.netCash >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(row.netCash)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${row.cumulative >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(row.cumulative)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <TableRow hover={false} className="font-semibold border-t-2 bg-gray-50 dark:bg-gray-800">
                <TableCell className="text-gray-900 dark:text-gray-100">{t('analytics.cashFlow.total')}</TableCell>
                <TableCell className="text-right text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalCollected)}
                </TableCell>
                <TableCell className="text-right text-orange-600 dark:text-orange-400">
                  {formatCurrency(totalPaid)}
                </TableCell>
                <TableCell className={`text-right ${netTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(netTotal)}
                </TableCell>
                <TableCell className={`text-right ${lastCumulative >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(lastCumulative)}
                </TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </CardBody>
      </Card>
    </>
  );
});
