import { useTranslation } from 'react-i18next';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { AccountTypeBadge, BalanceBadge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatters';
import type { Stakeholder, StakeholderRef } from './projectStakeholders';

interface StakeholdersTableProps {
  stakeholders: Stakeholder[];
  onSelect: (stakeholder: StakeholderRef) => void;
  className?: string;
}

export function StakeholdersTable({ stakeholders, onSelect, className }: StakeholdersTableProps) {
  const { t } = useTranslation();

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow hover={false}>
          <TableHead>{t('projectDetail.stakeholders.role')}</TableHead>
          <TableHead>{t('shared.transactionDetail.company')}</TableHead>
          <TableHead className="text-right">
            {t('projectDetail.stakeholders.invoiceTotal')}
          </TableHead>
          <TableHead className="text-right">
            {t('projectDetail.stakeholders.paymentCollection')}
          </TableHead>
          <TableHead className="text-right">{t('projectDetail.stakeholders.balance')}</TableHead>
          <TableHead className="text-right">
            {t('projectDetail.stakeholders.transactionCount')}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stakeholders.map((stakeholder) => (
          <TableRow
            key={stakeholder.company_id}
            className="cursor-pointer"
            onClick={() =>
              onSelect({
                company_id: stakeholder.company_id,
                company_name: stakeholder.company_name,
              })
            }
          >
            <TableCell>
              <AccountTypeBadge accountType={stakeholder.account_type} />
            </TableCell>
            <TableCell>
              <span className="font-medium">{stakeholder.company_name}</span>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(stakeholder.total_invoice)}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(stakeholder.total_payment)}
            </TableCell>
            <TableCell className="text-right">
              <BalanceBadge amount={stakeholder.balance} size="sm" />
            </TableCell>
            <TableCell className="text-right">{stakeholder.transaction_count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
