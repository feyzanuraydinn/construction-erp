import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercent } from '../../../utils/formatters';
import type { CategoryBreakdown } from '../../../types';
import { PrintTableSection, PrintTd, PrintTh } from './PrintTable';

interface PrintCategoryTableProps {
  rows: Pick<CategoryBreakdown, 'category' | 'total'>[];
  className?: string;
}

export function PrintCategoryTable({ rows, className }: PrintCategoryTableProps) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return (
    <PrintTableSection
      title={t('print.expenseBreakdown')}
      className={className}
      head={
        <>
          <PrintTh>{t('print.category')}</PrintTh>
          <PrintTh className="text-right">{t('print.amount')}</PrintTh>
          <PrintTh className="text-right">{t('print.ratio')}</PrintTh>
        </>
      }
    >
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.category}-${index}`}>
            <PrintTd>{row.category}</PrintTd>
            <PrintTd className="text-right">{formatCurrency(row.total)}</PrintTd>
            <PrintTd className="text-right">{formatPercent((row.total / total) * 100, 1)}</PrintTd>
          </tr>
        ))}
      </tbody>
    </PrintTableSection>
  );
}
