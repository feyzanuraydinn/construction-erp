import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner = memo(function LoadingSpinner({ className = 'py-12' }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t('common.loading')} className={`flex items-center justify-center ${className}`}>
      <div className="w-10 h-10 spinner" aria-hidden="true" />
    </div>
  );
});
