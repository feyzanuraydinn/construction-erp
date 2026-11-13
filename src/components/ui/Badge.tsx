import { ReactNode, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiHome, FiUser } from 'react-icons/fi';
import { formatCurrency as formatCurrencyUtil } from '../../utils/formatters';
import type {
  ProjectStatus,
  CompanyType,
  AccountType,
  OwnershipType,
  BadgeVariant,
} from '../../types';
import { MONEY_TOLERANCE } from '../../utils/money';
import { cn } from '../../utils/cn';

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
};

export const Badge = memo(function Badge({
  children,
  variant = 'gray',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
});

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const statusVariants: Record<ProjectStatus, BadgeVariant> = {
  planned: 'warning',
  active: 'success',
  completed: 'info',
  cancelled: 'danger',
};

export const StatusBadge = memo(function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  const variant = statusVariants[status] || 'gray';
  const label = t(`enums.projectStatus.${status}`, status);

  return (
    <Badge className={className} variant={variant}>
      {label}
    </Badge>
  );
});

interface TypeBadgeProps {
  type: CompanyType;
  className?: string;
}

const typeVariants: Record<CompanyType, { variant: BadgeVariant; icon: string }> = {
  person: { variant: 'info', icon: '👤' },
  company: { variant: 'purple', icon: '🏢' },
};

export const TypeBadge = memo(function TypeBadge({ type, className }: TypeBadgeProps) {
  const { t } = useTranslation();

  const config: { variant: BadgeVariant; icon: string } = typeVariants[type] || {
    variant: 'gray',
    icon: '',
  };
  const label = t(`enums.companyType.${type}`, type);

  return (
    <Badge className={className} variant={config.variant}>
      {config.icon} {label}
    </Badge>
  );
});

interface AccountTypeBadgeProps {
  accountType: AccountType;
  className?: string;
}

const accountTypeVariants: Record<AccountType, BadgeVariant> = {
  customer: 'success',
  supplier: 'info',
  subcontractor: 'purple',
  investor: 'warning',
};

export const AccountTypeBadge = memo(function AccountTypeBadge({
  accountType,
  className,
}: AccountTypeBadgeProps) {
  const { t } = useTranslation();

  const variant = accountTypeVariants[accountType] || 'gray';
  const label = t(`enums.accountType.${accountType}`, accountType);

  return (
    <Badge className={className} variant={variant}>
      {label}
    </Badge>
  );
});

interface OwnershipBadgeProps {
  ownership: OwnershipType;
  short?: boolean;
  withIcon?: boolean;
  className?: string;
}

export const OwnershipBadge = memo(function OwnershipBadge({
  ownership,
  short = false,
  withIcon = false,
  className,
}: OwnershipBadgeProps) {
  const { t } = useTranslation();
  const own = ownership === 'own';
  const Icon = own ? FiHome : FiUser;
  const label = t(
    short ? `enums.ownershipTypeShort.${ownership}` : `enums.ownershipType.${ownership}`
  );
  return (
    <Badge className={className} variant={own ? 'info' : 'purple'}>
      {withIcon ? (
        <>
          <Icon size={12} className="mr-1" /> {label}
        </>
      ) : (
        label
      )}
    </Badge>
  );
});

interface BalanceBadgeProps {
  amount: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BalanceBadge = memo(function BalanceBadge({
  amount,
  showIcon = true,
  size = 'md',
  className,
}: BalanceBadgeProps) {
  const isPositive = amount >= MONEY_TOLERANCE;
  const isNegative = amount <= -MONEY_TOLERANCE;

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
      className={cn(
        'inline-flex items-center gap-1 rounded-lg font-medium whitespace-nowrap',
        sizeClasses[size],
        bgClasses,
        className
      )}
    >
      {showIcon && <span>{icon}</span>}
      {isNegative ? '-' : isPositive ? '+' : ''}
      {formatAmount(amount)}
    </span>
  );
});
