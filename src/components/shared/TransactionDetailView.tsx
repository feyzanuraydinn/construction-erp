import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiEdit2 } from 'react-icons/fi';
import { Modal, ModalBody, ModalFooter, Button, Badge } from '../ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getTransactionTextColor, getTransactionBadgeVariant, isIncomeType, isExpenseType } from '../../utils/transactionHelpers';
import { TRANSACTION_TYPE_LABELS } from '../../utils/constants';
import type { TransactionWithDetails, PaymentAllocationWithDetails } from '../../types';

interface TransactionDetailViewProps {
  transaction: TransactionWithDetails | null;
  allocations: PaymentAllocationWithDetails[];
  onClose: () => void;
  onEdit: (transaction: TransactionWithDetails) => void;
}

/**
 * Shared transaction detail view modal.
 * Used across ProjectDetail, CompanyDetail, CompanyAccount, and Dashboard.
 */
export function TransactionDetailView({
  transaction,
  allocations,
  onClose,
  onEdit,
}: TransactionDetailViewProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={!!transaction}
      onClose={onClose}
      title={t('shared.transactionDetail.title')}
      size="md"
    >
      {transaction && (
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
              <Badge
                variant={getTransactionBadgeVariant(transaction.type)}
                className="text-sm px-3 py-1.5"
              >
                {t(TRANSACTION_TYPE_LABELS[transaction.type])}
              </Badge>
              <span
                className={`text-xl font-bold ${getTransactionTextColor(transaction.type)}`}
              >
                {isIncomeType(transaction.type) ? '+' : isExpenseType(transaction.type) ? '-' : ''}
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">{t('shared.transactionDetail.date')}</p>
                <p className="font-medium">{formatDate(transaction.date)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">{t('shared.transactionDetail.category')}</p>
                <p className="font-medium">
                  {transaction.category_name ? t(`categories.${transaction.category_name}`, transaction.category_name) : '-'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 dark:text-gray-400">{t('shared.transactionDetail.description')}</p>
                <p className="font-medium">{transaction.description}</p>
              </div>
              {transaction.company_name && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">{t('shared.transactionDetail.company')}</p>
                  <p className="font-medium">{transaction.company_name}</p>
                </div>
              )}
              {transaction.project_name && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">{t('shared.transactionDetail.project')}</p>
                  <p className="font-medium">{transaction.project_name}</p>
                </div>
              )}
              {transaction.document_no && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">{t('shared.transactionDetail.documentNo')}</p>
                  <p className="font-medium">{transaction.document_no}</p>
                </div>
              )}
              {transaction.currency !== 'TRY' && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">{t('shared.transactionDetail.tryEquivalent')}</p>
                  <p className="font-medium">{formatCurrency(transaction.amount_try)}</p>
                </div>
              )}
              {allocations.length > 0 && (
                <div className="col-span-2 pt-2 border-t dark:border-gray-700">
                  <p className="mb-2 text-gray-500 dark:text-gray-400">{t('shared.allocations.title')}</p>
                  <div className="space-y-1.5">
                    {allocations.map((alloc) => (
                      <div key={alloc.id} className="flex items-center justify-between p-2 text-sm rounded bg-purple-50 dark:bg-purple-900/20">
                        <div>
                          <span className="font-medium">{alloc.invoice_description}</span>
                          {alloc.invoice_document_no && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({alloc.invoice_document_no})</span>
                          )}
                          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                            {alloc.invoice_date ? formatDate(alloc.invoice_date) : ''}
                          </span>
                        </div>
                        <span className="font-medium text-purple-600 dark:text-purple-400">{formatCurrency(alloc.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2 mt-2 text-sm border-t border-purple-200 dark:border-purple-700">
                    <span className="text-gray-600 dark:text-gray-400">{t('shared.allocations.total')}</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {formatCurrency(allocations.reduce((s, a) => s + a.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
              {transaction.notes && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">{t('shared.transactionDetail.notes')}</p>
                  <p className="font-medium">{transaction.notes}</p>
                </div>
              )}
            </div>
          </div>
        </ModalBody>
      )}
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
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
      </ModalFooter>
    </Modal>
  );
}
