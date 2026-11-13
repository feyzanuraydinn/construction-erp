import { forwardRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

interface PrintPageProps {
  children: ReactNode;
  className?: string;
}

export const PrintPage = forwardRef<HTMLDivElement, PrintPageProps>(function PrintPage(
  { children, className },
  ref
) {
  const { t } = useTranslation();
  return (
    <div
      ref={ref}
      className={cn('p-8 bg-white min-h-screen print-content', className)}
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {children}
      <div className="mt-8 pt-4 border-t text-xs text-gray-900 text-center">
        {t('print.footerReport', { date: formatDate(new Date().toISOString()) })}
      </div>
    </div>
  );
});
