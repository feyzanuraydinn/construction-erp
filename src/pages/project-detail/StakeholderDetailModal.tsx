import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
} from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getTransactionTextColor, getTransactionBadgeVariant, isIncomeType, isExpenseType } from '../../utils/transactionHelpers';
import { TRANSACTION_TYPE_LABELS } from '../../utils/constants';
import type { TransactionWithDetails } from '../../types';

interface StakeholderDetailModalProps {
  stakeholder: { company_id: number; company_name: string } | null;
  transactions: TransactionWithDetails[];
  onClose: () => void;
}

export const StakeholderDetailModal = memo(function StakeholderDetailModal({
  stakeholder,
  transactions,
  onClose,
}: StakeholderDetailModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const companyTransactions = stakeholder
    ? transactions.filter((tx) => tx.company_id === stakeholder.company_id)
    : [];

  return (
    <Modal
      isOpen={!!stakeholder}
      onClose={onClose}
      title={t('projectDetail.stakeholderDetail.title', { company_name: stakeholder?.company_name || '' })}
      size="lg"
    >
      <ModalBody className="p-0">
        {stakeholder && (
          <>
            {companyTransactions.length === 0 ? (
              <EmptyState title={t('shared.transactionNotFound')} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.date)}</TableCell>
                      <TableCell>
                        <Badge variant={getTransactionBadgeVariant(tx.type)}>
                          {t(TRANSACTION_TYPE_LABELS[tx.type])}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.description}</p>
                        {tx.category_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t(`categories.${tx.category_name}`, tx.category_name)}</p>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${getTransactionTextColor(tx.type)}`}
                      >
                        {isIncomeType(tx.type) ? '+' : isExpenseType(tx.type) ? '-' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          onClick={() => {
            if (stakeholder) {
              navigate(`/companies/${stakeholder.company_id}`);
            }
          }}
        >
          {t('projectDetail.goToCompanyAccount')}
        </Button>
      </ModalFooter>
    </Modal>
  );
});
