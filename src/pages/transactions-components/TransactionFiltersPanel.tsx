import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch } from 'react-icons/fi';
import { Card, CardBody } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { TRANSACTION_TYPES, TRANSACTION_SCOPES } from '../../utils/constants';
import type { Company } from '../../types';
import { cn } from '../../utils/cn';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';

export interface TransactionUIFilters {
  search: string;
  scope: string;
  type: string;
  company_id: string;
  project_id: string;
  start_date: string;
  end_date: string;
}

interface TransactionFiltersPanelProps {
  filters: TransactionUIFilters;
  onFiltersChange: (filters: TransactionUIFilters) => void;
  companies: Company[];
  className?: string;
}

export const TransactionFiltersPanel = memo(function TransactionFiltersPanel({
  filters,
  onFiltersChange,
  companies,
  className,
}: TransactionFiltersPanelProps) {
  const { t } = useTranslation();
  const scopeOptions = useTranslatedOptions(TRANSACTION_SCOPES);
  const typeOptions = useTranslatedOptions(TRANSACTION_TYPES);

  const updateFilter = (key: keyof TransactionUIFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className={cn('mb-6', className)}>
      <CardBody>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <div className="col-span-2">
            <Input
              placeholder={t('transactions.searchPlaceholder')}
              icon={FiSearch}
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateFilter('search', e.target.value)
              }
            />
          </div>
          <Select
            options={scopeOptions}
            value={filters.scope}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              updateFilter('scope', e.target.value)
            }
            placeholder={t('transactions.filterSource')}
          />
          <Select
            options={typeOptions}
            value={filters.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              updateFilter('type', e.target.value)
            }
            placeholder={t('transactions.filterType')}
          />
          <Select
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            value={filters.company_id}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              updateFilter('company_id', e.target.value)
            }
            placeholder={t('transactions.filterCompany')}
          />
          <Input
            type="date"
            value={filters.start_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateFilter('start_date', e.target.value)
            }
            placeholder={t('transactions.filterStartDate')}
          />
          <Input
            type="date"
            value={filters.end_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateFilter('end_date', e.target.value)
            }
            placeholder={t('transactions.filterEndDate')}
          />
        </div>
      </CardBody>
    </Card>
  );
});
