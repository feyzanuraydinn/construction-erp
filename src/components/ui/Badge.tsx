import React, { ReactNode, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency as formatCurrencyUtil } from '../../utils/formatters';
import type { ProjectStatus, CompanyType, AccountType } from '../../types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'purple' | 'default';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const Badge = memo(function Badge({
  children,
  variant = 'gray',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
});

interface StatusBadgeProps {
  status: ProjectStatus;
}

const statusVariants: Record<ProjectStatus, BadgeVariant> = {
  planned: 'warning',
  active: 'success',
  completed: 'info',
  cancelled: 'danger',
};

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();

  const variant = statusVariants[status] || 'gray';
  const label = t(`enums.projectStatus.${status}`, status);

  return <Badge variant={variant}>{label}</Badge>;
});

interface TypeBadgeProps {
  type: CompanyType;
}

const typeVariants: Record<CompanyType, { variant: BadgeVariant; icon: string }> = {
  person: { variant: 'info', icon: '👤' },
  company: { variant: 'purple', icon: '🏢' },
};

export const TypeBadge = memo(function TypeBadge({ type }: TypeBadgeProps) {
  const { t } = useTranslation();

  const config = typeVariants[type] || { variant: 'gray' as BadgeVariant, icon: '' };
  const label = t(`enums.companyType.${type}`, type);

  return (
    <Badge variant={config.variant}>
      {config.icon} {label}
    </Badge>
  );
});

interface AccountTypeBadgeProps {
  accountType: AccountType;
}

const accountTypeVariants: Record<AccountType, BadgeVariant> = {
  customer: 'success',
  supplier: 'info',
  subcontractor: 'purple',
  investor: 'warning',
};

export const AccountTypeBadge = memo(function AccountTypeBadge({
  accountType,
}: AccountTypeBadgeProps) {
  const { t } = useTranslation();

  const variant = accountTypeVariants[accountType] || 'gray';
  const label = t(`enums.accountType.${accountType}`, accountType);

  return <Badge variant={variant}>{label}</Badge>;
});

interface BalanceBadgeProps {
  amount: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BalanceBadge = memo(function BalanceBadge({
  amount,
  showIcon = true,
  size = 'md',
}: BalanceBadgeProps) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;

  const formatAmount = (value: number) => formatCurrencyUtil(Math.abs(value));

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base font-semibold',
  };

  const bgClasses = isPositive
    ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
    : isNegative
      ? 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
      : 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';

  const icon = isPositive ? '↑' : isNegative ? '↓' : '•';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-lg font-medium whitespace-nowrap
        ${sizeClasses[size]}
        ${bgClasses}
      `}
    >
      {showIcon && <span>{icon}</span>}
      {isNegative ? '-' : isPositive ? '+' : ''}
      {formatAmount(amount)}
    </span>
  );
});
