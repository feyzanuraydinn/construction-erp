import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardBody } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import type { CategoryBreakdown } from '../../types';

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#64748b',
];

interface ExpenseBreakdownChartProps {
  categoryBreakdown: CategoryBreakdown[];
}

export const ExpenseBreakdownChart = memo(function ExpenseBreakdownChart({
  categoryBreakdown,
}: ExpenseBreakdownChartProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">{t('projectDetail.expenseBreakdown')}</h3>
      </CardHeader>
      <CardBody className="p-4">
        {categoryBreakdown.length === 0 ? (
          <p className="py-4 text-center text-gray-500 dark:text-gray-400">{t('projectDetail.noExpenseRecords')}</p>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {categoryBreakdown.map((entry, index) => (
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
              {categoryBreakdown.map((entry, index) => {
                const total = categoryBreakdown.reduce((sum, e) => sum + e.total, 0);
                return (
                  <div key={index} className="flex items-center gap-1 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: entry.color || COLORS[index % COLORS.length],
                      }}
                    />
                    <span
                      className="text-gray-600 dark:text-gray-400 truncate max-w-[80px]"
                      title={entry.category}
                    >
                      {entry.category}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      {((entry.total / total) * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
});
