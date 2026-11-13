import { useTranslation } from 'react-i18next';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { SelectAllHeadCell, RowCheckboxCell } from '../ui/SelectAllCheckbox';
import { Badge } from '../ui/Badge';
import { MatchStatusBadge } from '../ui/TransactionBadges';
import { SignedAmount } from '../ui/SignedAmount';
import { RowActions } from '../ui/RowActions';
import { TransactionTypeBadge } from '../shared/TransactionTypeBadge';
import { formatDate } from '../../utils/formatters';
import { categoryLabel } from '../../utils/categories';
import { amountInTry } from '../../utils/money';
import {
  getTransactionTextColor,
  getSimpleTransactionTextColor,
  getSimpleTransactionBadgeVariant,
  isPositiveTransaction,
  transactionSign,
} from '../../utils/transactionHelpers';
import type { TransactionList } from '../../hooks/useTransactionList';
import { CategoryChip } from '../shared/CategoryChip';

interface TransactionTableProps {
  list: TransactionList;
  counterpart?: 'project' | 'company';
  variant?: 'full' | 'simple';
  className?: string;
}

export function TransactionTable({
  list,
  counterpart,
  variant = 'full',
  className,
}: TransactionTableProps) {
  const { t } = useTranslation();
  const { dispatch, paginatedTransactions, deletion } = list;
  const { selectedIds, handleSelectAll, handleSelectOne } = deletion;
  const simple = variant === 'simple';
  const empty = <span className="text-gray-400 dark:text-gray-500">-</span>;

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow hover={false}>
          <SelectAllHeadCell
            itemIds={paginatedTransactions.map((tx) => tx.id)}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
          />
          <TableHead>{t('common.date')}</TableHead>
          <TableHead>{t('common.type')}</TableHead>
          {simple && <TableHead>{t('common.category')}</TableHead>}
          <TableHead>{t('common.description')}</TableHead>
          {counterpart && (
            <TableHead>
              {t(
                counterpart === 'project'
                  ? 'shared.transactionDetail.project'
                  : 'shared.transactionDetail.company'
              )}
            </TableHead>
          )}
          <TableHead className="text-right">{t('common.amount')}</TableHead>
          <TableHead className="text-center">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedTransactions.map((tx) => (
          <TableRow
            key={tx.id}
            selected={selectedIds.has(tx.id)}
            onClick={() => dispatch({ type: 'VIEW_TRANSACTION', transaction: tx })}
          >
            <RowCheckboxCell id={tx.id} selectedIds={selectedIds} onSelectOne={handleSelectOne} />
            <TableCell>{formatDate(tx.date)}</TableCell>
            <TableCell>
              {simple ? (
                <Badge variant={getSimpleTransactionBadgeVariant(tx.type)}>
                  {t(
                    isPositiveTransaction(tx.type)
                      ? 'companyAccount.types.income'
                      : 'companyAccount.types.expense'
                  )}
                </Badge>
              ) : (
                <TransactionTypeBadge type={tx.type} />
              )}
            </TableCell>
            {simple && (
              <TableCell>
                <CategoryChip name={tx.category_name} color={tx.category_color} />
              </TableCell>
            )}
            <TableCell>
              <p className="font-medium flex items-center gap-2">
                <span>{tx.description}</span>
                {!simple && <MatchStatusBadge transaction={tx} />}
              </p>
              {simple
                ? tx.document_no && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('companyAccount.documentPrefix', { no: tx.document_no })}
                    </p>
                  )
                : tx.category_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {categoryLabel(t, tx.category_name)}
                    </p>
                  )}
            </TableCell>
            {counterpart && (
              <TableCell>
                {(counterpart === 'project' ? tx.project_name : tx.company_name) || empty}
              </TableCell>
            )}
            <TableCell
              className={`text-right font-medium ${simple ? getSimpleTransactionTextColor(tx.type) : getTransactionTextColor(tx.type)}`}
            >
              {simple ? (
                <SignedAmount sign={transactionSign(tx.type)} amount={amountInTry(tx)} />
              ) : (
                <SignedAmount
                  sign={transactionSign(tx.type)}
                  amount={tx.amount}
                  currency={tx.currency}
                />
              )}
            </TableCell>
            <TableCell>
              <RowActions
                onEdit={() => dispatch({ type: 'EDIT_TRANSACTION', transaction: tx })}
                onDelete={() => deletion.setDeleting(tx)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
