import React, { ReactNode, memo } from 'react';
import type { IconType } from 'react-icons';

type StatCardColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'orange';

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: IconType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: StatCardColor;
  className?: string;
  highlighted?: boolean;
}

interface ColorSet {
  bg: string;
  icon: string;
  text: string;
}

const colors: Record<StatCardColor, ColorSet> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    text: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
    text: 'text-green-600 dark:text-green-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    text: 'text-red-600 dark:text-red-400',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    icon: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    text: 'text-purple-600 dark:text-purple-400',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-700/30',
    icon: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    text: 'text-gray-600 dark:text-gray-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
    text: 'text-orange-600 dark:text-orange-400',
  },
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
  trend,
  trendValue,
  color = 'blue',
  className = '',
  highlighted = false,
}: StatCardProps) {
  const colorSet = colors[color] || colors.blue;
  const highlightSet = highlightedColors[color] || highlightedColors.blue;

  const cardBg = highlighted
    ? `${highlightSet.bg} ${highlightSet.border}`
    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
  const titleColor = highlighted ? highlightSet.title : 'text-gray-500 dark:text-gray-400';
  const valueColor = highlighted ? highlightSet.value : 'text-gray-900 dark:text-gray-100';
  const subtitleColor = highlighted ? highlightSet.subtitle : 'text-gray-500 dark:text-gray-400';

  return (
    <div
      className={`rounded-xl shadow-sm border p-4 sm:p-6 overflow-hidden ${cardBg} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs sm:text-sm font-medium truncate ${titleColor}`}>{title}</p>
          <p
            className={`mt-1 sm:mt-2 text-base sm:text-xl lg:text-2xl font-bold break-words leading-tight ${valueColor}`}
          >
            {value}
          </p>
          {subtitle && (
            <p className={`mt-1 text-xs sm:text-sm truncate ${subtitleColor}`}>{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-xs sm:text-sm font-medium ${
                  trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${colorSet.icon}`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
      </div>
    </div>
  );
});
