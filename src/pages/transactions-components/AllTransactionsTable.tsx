import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { MatchStatusBadge, ScopeBadge } from '../../components/ui/TransactionBadges';
import { SelectAllHeadCell, RowCheckboxCell } from '../../components/ui/SelectAllCheckbox';
import { SignedAmount } from '../../components/ui/SignedAmount';
import { RowActions } from '../../components/ui/RowActions';
import { TransactionTypeBadge } from '../../components/shared/TransactionTypeBadge';
import { CategoryChip } from '../../components/shared/CategoryChip';
import { formatDate } from '../../utils/formatters';
import { getTransactionTextColor, transactionSign } from '../../utils/transactionHelpers';
import type { TransactionDeletion } from '../../hooks/useTransactionDeletion';
import type { TransactionWithDetails } from '../../types';
import { cn } from '../../utils/cn';

type CounterpartyKind = 'company' | 'project';

const COUNTERPARTY_COLORS: Record<CounterpartyKind, string> = {
  company: 'text-blue-600 dark:text-blue-400',
  project: 'text-purple-600 dark:text-purple-400',
};

interface CounterpartyLinkProps {
  kind: CounterpartyKind;
  to: string;
  label: string;
  className?: string;
}

function CounterpartyLink({ kind, to, label, className }: CounterpartyLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={cn(
        COUNTERPARTY_COLORS[kind],
        'cursor-pointer hover:underline text-left',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        navigate(to);
      }}
    >
      {label}
    </button>
  );
}

function Counterparty({
  transaction: tx,
  className,
}: {
  transaction: TransactionWithDetails;
  className?: string;
}) {
  const { t } = useTranslation();
  if (tx.company_name) {
    return (
      <CounterpartyLink
        kind="company"
        to={`/companies/${tx.company_id}`}
        label={tx.company_name}
        className={className}
      />
    );
  }
  if (tx.project_name) {
    return (
      <CounterpartyLink
        kind="project"
        to={`/projects/${tx.project_id}`}
        label={tx.project_name}
        className={className}
      />
    );
  }
  return (
    <span className={cn('text-gray-400 dark:text-gray-500', className)}>
      {t('transactions.companyGeneral')}
    </span>
  );
}

interface AllTransactionsTableProps {
  transactions: TransactionWithDetails[];
  deletion: TransactionDeletion;
  onView: (tx: TransactionWithDetails) => void;
  onEdit: (tx: TransactionWithDetails) => void;
  className?: string;
}

export function AllTransactionsTable({
  transactions,
  deletion,
  onView,
  onEdit,
  className,
}: AllTransactionsTableProps) {
  const { t } = useTranslation();
  const { selectedIds, handleSelectAll, handleSelectOne } = deletion;

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow hover={false}>
          <SelectAllHeadCell
            itemIds={transactions.map((tx) => tx.id)}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
          />
          <TableHead>{t('transactions.table.date')}</TableHead>
          <TableHead>{t('transactions.table.source')}</TableHead>
          <TableHead>{t('transactions.table.type')}</TableHead>
          <TableHead>{t('transactions.table.companyProject')}</TableHead>
          <TableHead>{t('transactions.table.description')}</TableHead>
          <TableHead>{t('transactions.table.category')}</TableHead>
          <TableHead className="text-right">{t('transactions.table.amount')}</TableHead>
          <TableHead className="w-20 text-center">{t('transactions.table.action')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id} selected={selectedIds.has(tx.id)} onClick={() => onView(tx)}>
            <RowCheckboxCell id={tx.id} selectedIds={selectedIds} onSelectOne={handleSelectOne} />
            <TableCell>{formatDate(tx.date)}</TableCell>
            <TableCell>
              <ScopeBadge scope={tx.scope} />
            </TableCell>
            <TableCell>
              <TransactionTypeBadge type={tx.type} />
            </TableCell>
            <TableCell>
              <Counterparty transaction={tx} />
            </TableCell>
            <TableCell>
              <p className="font-medium flex items-center gap-2">
                <span>{tx.description}</span>
                <MatchStatusBadge transaction={tx} />
              </p>
              {tx.document_no && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('transactions.table.document', { no: tx.document_no })}
                </p>
              )}
            </TableCell>
            <TableCell>
              <CategoryChip name={tx.category_name} color={tx.category_color} />
            </TableCell>
            <TableCell className={cn('text-right font-medium', getTransactionTextColor(tx.type))}>
              <SignedAmount
                sign={transactionSign(tx.type)}
                amount={tx.amount}
                currency={tx.currency}
              />
            </TableCell>
            <TableCell className="text-center">
              <RowActions onEdit={() => onEdit(tx)} onDelete={() => deletion.setDeleting(tx)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
