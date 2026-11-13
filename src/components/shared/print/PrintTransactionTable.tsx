import { useTranslation } from 'react-i18next';
import { SignedAmount } from '../../ui/SignedAmount';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { getPrintTransactionTextColor, transactionSign } from '../../../utils/transactionHelpers';
import { calculateTransactionTotals } from '../../../utils/financials';
import { amountInTry } from '../../../utils/money';
import { categoryLabel } from '../../../utils/categories';
import type { TransactionWithDetails } from '../../../types';
import { cn } from '../../../utils/cn';
import { PrintTableSection, PrintTd, PrintTh } from './PrintTable';
import { signTextColor } from './signTextColor';

interface PrintTotalRowProps {
  label: string;
  value: string;
  labelColSpan: number;
  valueClassName: string;
  className?: string;
}

function PrintTotalRow({
  label,
  value,
  labelColSpan,
  valueClassName,
  className,
}: PrintTotalRowProps) {
  return (
    <tr className={className}>
      <PrintTd colSpan={labelColSpan} className="py-1.5 text-right">
        {label}
      </PrintTd>
      <PrintTd className={cn('py-1.5 text-right', valueClassName)}>{value}</PrintTd>
    </tr>
  );
}

interface PrintTransactionTableProps {
  transactions: TransactionWithDetails[];
  showCompany?: boolean;
  className?: string;
}

export function PrintTransactionTable({
  transactions,
  showCompany = true,
  className,
}: PrintTransactionTableProps) {
  const { t } = useTranslation();
  const { totalInvoiceOut, totalPaymentIn, totalInvoiceIn, totalPaymentOut, netBalance } =
    calculateTransactionTotals(transactions);
  const labelColSpan = showCompany ? 5 : 4;

  return (
    <PrintTableSection
      title={t('print.transactionList')}
      className={className}
      head={
        <>
          <PrintTh>{t('print.date')}</PrintTh>
          <PrintTh>{t('print.type')}</PrintTh>
          <PrintTh>{t('print.description')}</PrintTh>
          {showCompany && <PrintTh>{t('print.company')}</PrintTh>}
          <PrintTh>{t('print.category')}</PrintTh>
          <PrintTh className="text-right">{t('print.amount')}</PrintTh>
        </>
      }
    >
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id}>
            <PrintTd>{formatDate(tx.date)}</PrintTd>
            <PrintTd>
              <span className={getPrintTransactionTextColor(tx.type)}>
                {t(`enums.transactionType.${tx.type}`)}
              </span>
            </PrintTd>
            <PrintTd>{tx.description}</PrintTd>
            {showCompany && <PrintTd>{tx.company_name || '-'}</PrintTd>}
            <PrintTd>{tx.category_name ? categoryLabel(t, tx.category_name) : '-'}</PrintTd>
            <PrintTd
              className={cn('text-right font-medium', getPrintTransactionTextColor(tx.type))}
            >
              <SignedAmount sign={transactionSign(tx.type)} amount={amountInTry(tx)} />
            </PrintTd>
          </tr>
        ))}
      </tbody>
      <tfoot>
        {[
          {
            label: t('print.salesInvoice'),
            value: `+${formatCurrency(totalInvoiceOut)}`,
            color: 'text-green-700',
          },
          {
            label: t('print.collection'),
            value: `+${formatCurrency(totalPaymentIn)}`,
            color: 'text-blue-700',
          },
          {
            label: t('print.purchaseInvoice'),
            value: `-${formatCurrency(totalInvoiceIn)}`,
            color: 'text-red-700',
          },
          {
            label: t('print.payment'),
            value: `-${formatCurrency(totalPaymentOut)}`,
            color: 'text-orange-700',
          },
        ].map((row) => (
          <PrintTotalRow
            key={row.label}
            label={row.label}
            value={row.value}
            labelColSpan={labelColSpan}
            valueClassName={row.color}
            className="bg-gray-50 font-medium"
          />
        ))}
        <PrintTotalRow
          label={t('print.net')}
          value={formatCurrency(netBalance)}
          labelColSpan={labelColSpan}
          valueClassName={signTextColor(netBalance)}
          className="bg-gray-100 font-bold"
        />
      </tfoot>
    </PrintTableSection>
  );
}
