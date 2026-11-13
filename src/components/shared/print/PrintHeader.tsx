import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  date?: string;
  className?: string;
}

export function PrintHeader({ title, subtitle, date, className }: PrintHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('mb-6 pb-4 border-b-2 border-gray-800', className)}>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-800 mt-1">{subtitle}</p>}
      <p className="text-sm text-gray-900 mt-2">
        {t('print.reportDate')} {formatDate(date || new Date().toISOString())}
      </p>
    </div>
  );
}
