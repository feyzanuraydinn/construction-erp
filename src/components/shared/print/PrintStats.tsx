import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';

export interface PrintStat {
  label: string;
  value: string;
  color?: string;
}

interface PrintStatsProps {
  stats: PrintStat[];
  className?: string;
}

export function PrintStats({ stats, className }: PrintStatsProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-4 mb-6', className)}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-gray-50 p-3 rounded border">
          <p className="text-xs text-gray-900 mb-1">{stat.label}</p>
          <p className={cn('text-lg font-bold', stat.color || 'text-gray-900')}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export function incomeExpenseStats(
  income: { label: string; amount: number },
  expense: { label: string; amount: number }
): PrintStat[] {
  return [
    { label: income.label, value: formatCurrency(income.amount), color: 'text-green-700' },
    { label: expense.label, value: formatCurrency(expense.amount), color: 'text-red-700' },
  ];
}
