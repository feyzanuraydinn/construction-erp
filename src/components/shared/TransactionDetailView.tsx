import { useTranslation } from 'react-i18next';
import { FiEdit2 } from 'react-icons/fi';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SignedAmount } from '../ui/SignedAmount';
import { TransactionTypeBadge } from './TransactionTypeBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getTransactionTextColor, transactionSign } from '../../utils/transactionHelpers';
import type { TransactionWithDetails, PaymentAllocationWithDetails } from '../../types';
import { allocationCounterpart } from '../../utils/allocations';
import { isPaymentType } from '../../utils/transactionKinds';
import { categoryLabel } from '../../utils/categories';
import { DetailField } from './DetailFields';

interface TransactionDetailViewProps {
  transaction: TransactionWithDetails | null;
  allocations: PaymentAllocationWithDetails[];
  onClose: () => void;
  onEdit?: (transaction: TransactionWithDetails) => void;
  className?: string;
}

export function TransactionDetailView({
  transaction,
  allocations,
  onClose,
  onEdit,
  className,
}: TransactionDetailViewProps) {
  const { t } = useTranslation();
  const viewingPayment = transaction ? isPaymentType(transaction.type) : false;

  return (
    <Modal
      className={className}
      isOpen={!!transaction}
      onClose={onClose}
      title={t('shared.transactionDetail.title')}
      size="md"
    >
      {transaction && (
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
              <TransactionTypeBadge type={transaction.type} size="md" />
              <span className={`text-xl font-bold ${getTransactionTextColor(transaction.type)}`}>
                <SignedAmount
                  sign={transactionSign(transaction.type)}
                  amount={transaction.amount}
                  currency={transaction.currency}
                />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailField label={t('shared.transactionDetail.date')}>
                {formatDate(transaction.date)}
              </DetailField>
              <DetailField label={t('shared.transactionDetail.category')}>
                {transaction.category_name ? categoryLabel(t, transaction.category_name) : '-'}
              </DetailField>
              <DetailField label={t('shared.transactionDetail.description')} wide>
                {transaction.description}
              </DetailField>
              {transaction.company_name && (
                <DetailField label={t('shared.transactionDetail.company')} wide>
                  {transaction.company_name}
                </DetailField>
              )}
              {transaction.project_name && (
                <DetailField label={t('shared.transactionDetail.project')} wide>
                  {transaction.project_name}
                </DetailField>
              )}
              {transaction.document_no && (
                <DetailField label={t('shared.transactionDetail.documentNo')}>
                  {transaction.document_no}
                </DetailField>
              )}
              {transaction.currency !== 'TRY' && (
                <DetailField label={t('shared.transactionDetail.tryEquivalent')}>
                  {formatCurrency(transaction.amount_try)}
                </DetailField>
              )}
              {allocations.length > 0 && (
                <div className="col-span-2 pt-2 border-t dark:border-gray-700">
                  <p className="mb-2 text-gray-500 dark:text-gray-400">
                    {t('shared.allocations.title')}
                  </p>
                  <div className="space-y-1.5">
                    {allocations.map((alloc) => {
                      const other = allocationCounterpart(alloc, viewingPayment);
                      return (
                        <div
                          key={alloc.id}
                          className="flex items-center justify-between p-2 text-sm rounded bg-purple-50 dark:bg-purple-900/20"
                        >
                          <div>
                            <span className="font-medium">{other.description}</span>
                            {other.documentNo && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({other.documentNo})
                              </span>
                            )}
                            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                              {other.date ? formatDate(other.date) : ''}
                            </span>
                          </div>
                          <span className="font-medium text-purple-600 dark:text-purple-400">
                            {formatCurrency(alloc.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between pt-2 mt-2 text-sm border-t border-purple-200 dark:border-purple-700">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('shared.allocations.total')}
                    </span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {formatCurrency(allocations.reduce((s, a) => s + a.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
              {transaction.notes && (
                <DetailField label={t('shared.transactionDetail.notes')} wide>
                  {transaction.notes}
                </DetailField>
              )}
            </div>
          </div>
        </ModalBody>
      )}
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
        {onEdit && (
          <Button
            onClick={() => {
              if (transaction) {
                onEdit(transaction);
              }
            }}
          >
            <FiEdit2 className="mr-2" size={16} />
            {t('common.edit')}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
