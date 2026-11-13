import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { ExportPreviewModal } from '../../components/modals/ExportPreviewModal';
import { Input, Select } from '../../components/ui/Input';
import { useTransactionExport } from '../../hooks/useTransactionExport';
import { useTranslatedOptions } from '../../hooks/useTranslatedOptions';
import { TRANSACTION_TYPES, TRANSACTION_SCOPES } from '../../utils/constants';
import type { Company, SelectOption, TransactionWithDetails } from '../../types';
import { matchesFilters, type ListFilters } from './transactionListFilters';

interface ExportSelectField {
  key: keyof ListFilters;
  options: SelectOption[];
  placeholder: string;
  className: string;
}

const DATE_FIELDS = ['start_date', 'end_date'] as const;

interface TransactionsExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ListFilters;
  onFiltersChange: Dispatch<SetStateAction<ListFilters>>;
  transactions: TransactionWithDetails[];
  companies: Company[];
  exportPrefix: string;
  className?: string;
}

export function TransactionsExportDialog({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  transactions,
  companies,
  exportPrefix,
  className,
}: TransactionsExportDialogProps) {
  const { t } = useTranslation();
  const scopeOptions = useTranslatedOptions(TRANSACTION_SCOPES);
  const typeOptions = useTranslatedOptions(TRANSACTION_TYPES);
  const { previewRows, exportTransactions } = useTransactionExport();

  const filteredTransactions = useMemo(
    () => transactions.filter((tx) => matchesFilters(tx, filters)),
    [transactions, filters]
  );
  const previewData = useMemo(
    () => previewRows(filteredTransactions),
    [previewRows, filteredTransactions]
  );

  const setFilter = (key: keyof ListFilters, value: string) =>
    onFiltersChange((prev) => ({ ...prev, [key]: value }));

  const selectFields: ExportSelectField[] = [
    {
      key: 'scope',
      options: scopeOptions,
      placeholder: t('transactions.filterSource'),
      className: 'w-32',
    },
    {
      key: 'type',
      options: typeOptions,
      placeholder: t('shared.printOptions.transactionType'),
      className: 'w-40',
    },
    {
      key: 'company_id',
      options: companies.map((c) => ({ value: c.id, label: c.name })),
      placeholder: t('transactions.filterCompany'),
      className: 'w-40',
    },
  ];

  return (
    <ExportPreviewModal
      className={className}
      isOpen={isOpen}
      onClose={onClose}
      data={previewData}
      onExport={() => void exportTransactions(exportPrefix, filteredTransactions)}
      mode="filter"
    >
      {selectFields.map((field) => (
        <Select
          key={field.key}
          options={field.options}
          value={filters[field.key]}
          onChange={(e) => setFilter(field.key, e.target.value)}
          placeholder={field.placeholder}
          className={field.className}
        />
      ))}
      {DATE_FIELDS.map((key) => (
        <Input
          key={key}
          type="date"
          value={filters[key]}
          onChange={(e) => setFilter(key, e.target.value)}
          className="w-36"
        />
      ))}
    </ExportPreviewModal>
  );
}
