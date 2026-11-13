import { useTranslation } from 'react-i18next';
import { ExportPreviewModal } from '../modals/ExportPreviewModal';
import { Input, Select } from '../ui/Input';
import type { PrintFilters, TransactionList } from '../../hooks/useTransactionList';
import type { OptionList } from './options';

interface TransactionExportPreviewProps {
  list: TransactionList;
  typeOptions: OptionList;
  categoryOptions: OptionList;
  className?: string;
}

export function TransactionExportPreview({
  list,
  typeOptions,
  categoryOptions,
  className,
}: TransactionExportPreviewProps) {
  const { t } = useTranslation();
  const { ui, dispatch } = list;
  const setFilter = (filters: Partial<PrintFilters>) =>
    dispatch({ type: 'SET_EXPORT_FILTER', filters });

  return (
    <ExportPreviewModal
      className={className}
      isOpen={ui.exportPreviewOpen}
      onClose={() => dispatch({ type: 'CLOSE_EXPORT_PREVIEW' })}
      data={list.exportPreviewData}
      onExport={list.handleExport}
      mode="filter"
    >
      <Select
        options={typeOptions}
        value={ui.exportFilters.type}
        onChange={(e) => setFilter({ type: e.target.value })}
        placeholder={t('shared.printOptions.transactionType')}
        className="w-40"
      />
      <Select
        options={categoryOptions}
        value={ui.exportFilters.category_id}
        onChange={(e) => setFilter({ category_id: e.target.value })}
        placeholder={t('shared.printOptions.category')}
        className="w-40"
      />
      <Input
        type="date"
        value={ui.exportFilters.startDate}
        onChange={(e) => setFilter({ startDate: e.target.value })}
        className="w-36"
      />
      <Input
        type="date"
        value={ui.exportFilters.endDate}
        onChange={(e) => setFilter({ endDate: e.target.value })}
        className="w-36"
      />
    </ExportPreviewModal>
  );
}
