import { cn } from '../../utils/cn';
import { budgetLevel, type BudgetLevel } from '../../utils/budget';

const BAR_COLORS: Record<BudgetLevel, string> = {
  ok: 'bg-green-500',
  warning: 'bg-yellow-500',
  over: 'bg-red-500',
};

interface BudgetBarProps {
  percent: number;
  className?: string;
}

export function BudgetBar({ percent, className }: BudgetBarProps) {
  return (
    <div className={cn('h-2 overflow-hidden bg-gray-200 dark:bg-gray-600 rounded-full', className)}>
      <div
        className={cn('h-full rounded-full transition-all', BAR_COLORS[budgetLevel(percent)])}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}
