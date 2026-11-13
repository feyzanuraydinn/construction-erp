import { useTranslation } from 'react-i18next';
import { FiRefreshCw } from 'react-icons/fi';
import { Button } from '../../components/ui/Button';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';
import { cn } from '../../utils/cn';
import type { DateFilter } from './dateRange';

const DATE_FILTER_OPTIONS: readonly { value: DateFilter; label: string }[] = [
  { value: 'year', label: 'dashboard.dateFilters.year' },
  { value: 'month', label: 'dashboard.dateFilters.month' },
  { value: 'week', label: 'dashboard.dateFilters.week' },
  { value: 'today', label: 'dashboard.dateFilters.today' },
  { value: 'all', label: 'dashboard.dateFilters.all' },
];

interface DashboardToolbarProps {
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  isStale: boolean;
  onRefresh: () => void;
  className?: string;
}

export function DashboardToolbar({
  dateFilter,
  onDateFilterChange,
  isStale,
  onRefresh,
  className,
}: DashboardToolbarProps) {
  const { t } = useTranslation();
  const dateFilters = useTranslatedOptions(DATE_FILTER_OPTIONS);
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
        {dateFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={dateFilter === filter.value ? 'primary' : 'ghost'}
            size="xs"
            onClick={() => onDateFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <Button
        variant="secondary"
        icon={FiRefreshCw}
        onClick={onRefresh}
        className={isStale ? 'ring-2 ring-yellow-400' : ''}
        title={isStale ? t('dashboard.updating') : t('dashboard.refresh')}
      >
        {isStale ? t('dashboard.updatingShort') : t('dashboard.refreshShort')}
      </Button>
    </div>
  );
}
