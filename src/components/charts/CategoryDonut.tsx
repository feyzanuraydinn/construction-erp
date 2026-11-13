import { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '../../utils/cn';
import { formatPercent } from '../../utils/formatters';
import { moneyTooltipFormatter, paletteColor } from './chartConfig';
import type { CategoryBreakdown } from '../../types';

const SIZES = {
  sm: { height: 200, outerRadius: 70, label: 'max-w-[80px]' },
  md: { height: 220, outerRadius: 80, label: 'max-w-[100px]' },
};

interface CategoryDonutProps {
  data: CategoryBreakdown[];
  size?: keyof typeof SIZES;
  className?: string;
}

export const CategoryDonut = memo(function CategoryDonut({
  data,
  size = 'md',
  className,
}: CategoryDonutProps) {
  const { height, outerRadius, label } = SIZES[size];
  const total = data.reduce((sum, entry) => sum + entry.total, 0);
  const colorOf = (entry: CategoryBreakdown, index: number) => entry.color || paletteColor(index);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={outerRadius}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colorOf(entry, index)} />
            ))}
          </Pie>
          <Tooltip formatter={moneyTooltipFormatter} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center px-2 mt-2 gap-x-3 gap-y-1">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: colorOf(entry, index) }}
            />
            <span
              className={cn('text-gray-600 dark:text-gray-400 truncate', label)}
              title={entry.category}
            >
              {entry.category}
            </span>
            <span className="text-gray-400 dark:text-gray-500">
              {formatPercent(total > 0 ? (entry.total / total) * 100 : 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
