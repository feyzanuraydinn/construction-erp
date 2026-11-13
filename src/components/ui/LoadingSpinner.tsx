import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  className,
}: LoadingSpinnerProps) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className={cn('flex items-center justify-center', className ?? 'py-12')}
    >
      <div
        className={cn('spinner', size === 'sm' ? 'w-6 h-6 border-2' : 'w-10 h-10')}
        aria-hidden="true"
      />
    </div>
  );
});

export function PageSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('page-container', className)}>
      <LoadingSpinner />
    </div>
  );
}
