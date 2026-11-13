import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiArrowDownCircle, FiArrowUpCircle } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { Badge } from '../ui/Badge';
import { movementTypeLabel } from '../../utils/stock';
import { cn } from '../../utils/cn';
import type { BadgeVariant, MovementType } from '../../types';

interface StockStatusBadgeProps {
  low: boolean;
  large?: boolean;
  className?: string;
}

export function StockStatusBadge({ low, large = false, className }: StockStatusBadgeProps) {
  const { t } = useTranslation();
  const sizeClass = large ? 'px-3 py-1.5' : undefined;
  if (!low) {
    return (
      <Badge variant="success" className={cn(sizeClass, className)}>
        {t('stock.table.normal')}
      </Badge>
    );
  }
  return (
    <Badge variant="danger" className={cn(sizeClass, className)}>
      <FiAlertTriangle size={large ? 14 : 12} className="mr-1" /> {t('stock.table.critical')}
    </Badge>
  );
}

const MOVEMENT_BADGES: Record<MovementType, { variant: BadgeVariant; icon?: IconType }> = {
  in: { variant: 'success', icon: FiArrowDownCircle },
  out: { variant: 'danger', icon: FiArrowUpCircle },
  adjustment: { variant: 'warning' },
  waste: { variant: 'warning' },
};

export function MovementTypeBadge({ type, className }: { type: MovementType; className?: string }) {
  const { t } = useTranslation();
  const { variant, icon: Icon } = MOVEMENT_BADGES[type];
  return (
    <Badge variant={variant} className={className}>
      {Icon && <Icon size={12} className="mr-1" />}
      {movementTypeLabel(t, type)}
    </Badge>
  );
}
