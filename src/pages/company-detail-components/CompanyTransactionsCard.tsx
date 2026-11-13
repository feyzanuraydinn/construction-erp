import { useTranslation } from 'react-i18next';
import {
  TransactionBulkDelete,
  TransactionQuickFilters,
} from '../../components/transaction-list/TransactionListParts';
import { TransactionTable } from '../../components/transaction-list/TransactionTable';
import { TransactionFilterPanel } from '../../components/transaction-list/TransactionFilterPanel';
import type { OptionList } from '../../components/transaction-list/options';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { getPaginationProps } from '../../hooks/usePagination';
import type { TransactionList } from '../../hooks/useTransactionList';

interface CompanyTransactionsCardProps {
  list: TransactionList;
  categoryChoices: OptionList;
  className?: string;
}

export function CompanyTransactionsCard({
  list,
  categoryChoices,
  className,
}: CompanyTransactionsCardProps) {
  const { t } = useTranslation();
  const { filteredTransactions, pagination } = list;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between h-10">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">{t('companyDetail.transactionHistory')}</h3>
            <TransactionBulkDelete list={list} />
          </div>
          <TransactionQuickFilters list={list} />
        </div>
        <TransactionFilterPanel list={list} categoryOptions={categoryChoices} />
      </CardHeader>
      <CardBody>
        {filteredTransactions.length === 0 ? (
          <EmptyState
            title={t('shared.transactionNotFound')}
            description={t('companyDetail.noTransactions')}
          />
        ) : (
          <TransactionTable list={list} counterpart="project" />
        )}
        <Pagination {...getPaginationProps(pagination)} />
      </CardBody>
    </Card>
  );
}
