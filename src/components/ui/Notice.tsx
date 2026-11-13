import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { cn } from '../../utils/cn';

type NoticeTone = 'warning' | 'success' | 'info' | 'danger';

const TONE_CLASSES: Record<NoticeTone, string> = {
  warning:
    'text-amber-800 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  success:
    'text-green-800 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
  info: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  danger:
    'text-red-700 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
};

const TONE_ICONS: Record<NoticeTone, IconType> = {
  warning: FiAlertTriangle,
  success: FiCheckCircle,
  info: FiInfo,
  danger: FiAlertCircle,
};

interface NoticeProps {
  children: ReactNode;
  tone?: NoticeTone;
  icon?: IconType;
  iconClassName?: string;
  compact?: boolean;
  role?: 'status' | 'alert' | 'note';
  className?: string;
}

export function Notice({
  children,
  tone = 'warning',
  icon,
  iconClassName,
  compact = false,
  role = 'status',
  className,
}: NoticeProps) {
  const Icon = icon ?? TONE_ICONS[tone];
  return (
    <div
      role={role}
      className={cn(
        'flex items-start border',
        compact ? 'gap-2 p-2 text-xs rounded' : 'gap-3 p-3 text-sm rounded-lg',
        TONE_CLASSES[tone],
        className
      )}
    >
      <Icon className={cn('mt-0.5 flex-shrink-0', iconClassName)} />
      <div className="space-y-1">{children}</div>
    </div>
  );
}
