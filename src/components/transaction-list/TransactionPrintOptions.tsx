import { useTranslation } from 'react-i18next';
import { FiEye } from 'react-icons/fi';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import type { PrintFilters, TransactionList } from '../../hooks/useTransactionList';
import type { OptionList } from './options';

interface TransactionPrintOptionsProps {
  list: TransactionList;
  typeOptions: OptionList;
  categoryOptions: OptionList;
  className?: string;
}

export function TransactionPrintOptions({
  list,
  typeOptions,
  categoryOptions,
  className,
}: TransactionPrintOptionsProps) {
  const { t } = useTranslation();
  const { ui, dispatch } = list;
  const setFilter = (filters: Partial<PrintFilters>) =>
    dispatch({ type: 'SET_PRINT_FILTER', filters });
  const close = () => dispatch({ type: 'CLOSE_PRINT_MODAL' });

  return (
    <Modal
      className={className}
      isOpen={ui.printModalOpen}
      onClose={close}
      title={t('shared.printOptions.title')}
      size="sm"
    >
      <ModalBody className="space-y-4">
        <Select
          label={t('shared.printOptions.transactionType')}
          options={typeOptions}
          value={ui.printFilters.type}
          onChange={(e) => setFilter({ type: e.target.value })}
          placeholder={t('common.all')}
        />
        <Select
          label={t('shared.printOptions.category')}
          options={categoryOptions}
          value={ui.printFilters.category_id}
          onChange={(e) => setFilter({ category_id: e.target.value })}
          placeholder={t('common.all')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('shared.printOptions.startDate')}
            type="date"
            value={ui.printFilters.startDate}
            onChange={(e) => setFilter({ startDate: e.target.value })}
          />
          <Input
            label={t('shared.printOptions.endDate')}
            type="date"
            value={ui.printFilters.endDate}
            onChange={(e) => setFilter({ endDate: e.target.value })}
          />
        </div>
        <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('shared.printOptions.summary', { count: list.printTransactions.length })}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={close}>
          {t('common.cancel')}
        </Button>
        <Button icon={FiEye} onClick={() => dispatch({ type: 'OPEN_PRINT_PREVIEW' })}>
          {t('shared.preview')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
