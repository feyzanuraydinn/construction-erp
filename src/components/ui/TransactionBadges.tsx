import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency as formatCurrencyUtil } from '../../utils/formatters';
import type { TransactionScope, TransactionWithDetails, BadgeVariant } from '../../types';
import { MONEY_TOLERANCE, amountInTry, roundMoney } from '../../utils/money';
import { isPaymentType } from '../../utils/transactionKinds';
import { cn } from '../../utils/cn';
import { Badge } from './Badge';

const scopeVariants: Record<TransactionScope, BadgeVariant> = {
  cari: 'info',
  project: 'purple',
  company: 'gray',
};

export const ScopeBadge = memo(function ScopeBadge({
  scope,
  className,
}: {
  scope: TransactionScope;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Badge className={className} variant={scopeVariants[scope]}>
      {t(`enums.transactionScopeShort.${scope}`)}
    </Badge>
  );
});

interface MatchStatusBadgeProps {
  transaction: Pick<
    TransactionWithDetails,
    'type' | 'scope' | 'amount' | 'amount_try' | 'allocated_amount'
  >;
  className?: string;
}

export const MatchStatusBadge = memo(function MatchStatusBadge({
  transaction,
  className = '',
}: MatchStatusBadgeProps) {
  const { t } = useTranslation();
  if (!isPaymentType(transaction.type)) return null;
  if (transaction.scope === 'company') return null;
  const total = amountInTry(transaction);
  const matched = transaction.allocated_amount ?? 0;
  const open = roundMoney(total - matched);
  if (open <= MONEY_TOLERANCE) return null;
  const partial = matched > MONEY_TOLERANCE;
  const title = t(
    transaction.type === 'payment_out' ? 'matchStatus.titleOut' : 'matchStatus.titleIn',
    {
      amount: formatCurrencyUtil(open),
    }
  );
  return (
    <span title={title} className={cn('inline-flex', className)}>
      <Badge variant="warning">
        {partial ? t('matchStatus.partial') : t('matchStatus.unmatched')}
      </Badge>
    </span>
  );
});
