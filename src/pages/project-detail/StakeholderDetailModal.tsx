import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { SignedAmount } from '../../components/ui/SignedAmount';
import { formatDate } from '../../utils/formatters';
import { getTransactionTextColor, transactionSign } from '../../utils/transactionHelpers';
import { TransactionTypeBadge } from '../../components/shared/TransactionTypeBadge';
import type { TransactionWithDetails } from '../../types';
import { categoryLabel } from '../../utils/categories';

interface StakeholderDetailModalProps {
  stakeholder: { company_id: number; company_name: string } | null;
  transactions: TransactionWithDetails[];
  onClose: () => void;
  className?: string;
}

export const StakeholderDetailModal = memo(function StakeholderDetailModal({
  stakeholder,
  transactions,
  onClose,
  className,
}: StakeholderDetailModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const companyTransactions = stakeholder
    ? transactions.filter((tx) => tx.company_id === stakeholder.company_id)
    : [];

  return (
    <Modal
      className={className}
      isOpen={!!stakeholder}
      onClose={onClose}
      title={t('projectDetail.stakeholderDetail.title', {
        company_name: stakeholder?.company_name || '',
      })}
      size="lg"
    >
      <ModalBody>
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
                        <TransactionTypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.description}</p>
                        {tx.category_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {categoryLabel(t, tx.category_name)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${getTransactionTextColor(tx.type)}`}
                      >
                        <SignedAmount
                          sign={transactionSign(tx.type)}
                          amount={tx.amount}
                          currency={tx.currency}
                        />
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
