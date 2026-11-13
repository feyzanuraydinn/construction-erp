import { ReactNode, memo } from 'react';
import type { IconType } from 'react-icons';
import { cn } from '../../utils/cn';

export type StatCardColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'orange';

export function signColor(amount: number): 'green' | 'red' {
  return amount >= 0 ? 'green' : 'red';
}

const VALUE_CHAR_WIDTH_EM = 0.62;

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: IconType;
  color?: StatCardColor;
  className?: string;
  highlighted?: boolean;
  valueColor?: StatCardColor;
}

const valueColors: Record<StatCardColor, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  purple: 'text-purple-600 dark:text-purple-400',
  gray: 'text-gray-600 dark:text-gray-400',
  orange: 'text-orange-600 dark:text-orange-400',
};

const iconColors: Record<StatCardColor, string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  green: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
};

const highlightedColors: Record<
  StatCardColor,
  { bg: string; border: string; title: string; value: string; subtitle: string }
> = {
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-700',
    title: 'text-green-700 dark:text-green-400',
    value: 'text-green-700 dark:text-green-300',
    subtitle: 'text-green-600 dark:text-green-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-700',
    title: 'text-red-700 dark:text-red-400',
    value: 'text-red-700 dark:text-red-300',
    subtitle: 'text-red-600 dark:text-red-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-700',
    title: 'text-blue-700 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-300',
    subtitle: 'text-blue-600 dark:text-blue-400',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-700',
    title: 'text-yellow-700 dark:text-yellow-400',
    value: 'text-yellow-700 dark:text-yellow-300',
    subtitle: 'text-yellow-600 dark:text-yellow-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-700',
    title: 'text-purple-700 dark:text-purple-400',
    value: 'text-purple-700 dark:text-purple-300',
    subtitle: 'text-purple-600 dark:text-purple-400',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-700/30',
    border: 'border-gray-200 dark:border-gray-600',
    title: 'text-gray-700 dark:text-gray-300',
    value: 'text-gray-700 dark:text-gray-200',
    subtitle: 'text-gray-600 dark:text-gray-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-700',
    title: 'text-orange-700 dark:text-orange-400',
    value: 'text-orange-700 dark:text-orange-300',
    subtitle: 'text-orange-600 dark:text-orange-400',
  },
};

export const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  className,
  highlighted = false,
  valueColor: valueTone,
}: StatCardProps) {
  const highlightSet = highlightedColors[color] || highlightedColors.blue;

  const cardBg = highlighted
    ? `${highlightSet.bg} ${highlightSet.border}`
    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
  const titleColor = highlighted ? highlightSet.title : 'text-gray-500 dark:text-gray-400';
  const valueColor = highlighted
    ? highlightSet.value
    : valueTone
      ? valueColors[valueTone]
      : 'text-gray-900 dark:text-gray-100';
  const subtitleColor = highlighted ? highlightSet.subtitle : 'text-gray-500 dark:text-gray-400';
  const fitsOneLine = typeof value === 'string' && value.length > 0;
  const valueSize = fitsOneLine
    ? `whitespace-nowrap [--stat-value-max:1rem] sm:[--stat-value-max:1.25rem] lg:[--stat-value-max:1.5rem]`
    : 'text-base sm:text-xl lg:text-2xl break-words';
  const valueStyle = fitsOneLine
    ? {
        fontSize: `min(var(--stat-value-max), calc(100cqi / ${(value.length * VALUE_CHAR_WIDTH_EM).toFixed(2)}))`,
      }
    : undefined;

  return (
    <div
      className={cn('rounded-xl shadow-sm border p-4 sm:p-6 overflow-hidden', cardBg, className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 [container-type:inline-size]">
          <p className={`text-xs sm:text-sm font-medium truncate ${titleColor}`} title={title}>
            {title}
          </p>
          <p
            className={`mt-1 sm:mt-2 font-bold leading-tight ${valueSize} ${valueColor}`}
            style={valueStyle}
          >
            {value}
          </p>
          {subtitle && (
            <p className={`mt-1 text-xs sm:text-sm truncate ${subtitleColor}`} title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${iconColors[color]}`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
      </div>
    </div>
  );
});
