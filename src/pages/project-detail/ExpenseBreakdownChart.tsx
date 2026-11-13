import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { labelBreakdown, MAX_BREAKDOWN_SLICES } from '../../utils/categories';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { CategoryDonut } from '../../components/charts/CategoryDonut';
import type { CategoryBreakdown } from '../../types';

interface ExpenseBreakdownChartProps {
  categoryBreakdown: CategoryBreakdown[];
  className?: string;
}

export const ExpenseBreakdownChart = memo(function ExpenseBreakdownChart({
  categoryBreakdown: rawBreakdown,
  className,
}: ExpenseBreakdownChartProps) {
  const { t } = useTranslation();
  const categoryBreakdown = useMemo(
    () => labelBreakdown(t, rawBreakdown, MAX_BREAKDOWN_SLICES),
    [rawBreakdown, t]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="font-semibold">{t('projectDetail.expenseBreakdown')}</h3>
      </CardHeader>
      <CardBody>
        {categoryBreakdown.length === 0 ? (
          <p className="py-4 text-center text-gray-500 dark:text-gray-400">
            {t('projectDetail.noExpenseRecords')}
          </p>
        ) : (
          <CategoryDonut data={categoryBreakdown} size="sm" />
        )}
      </CardBody>
    </Card>
  );
});
