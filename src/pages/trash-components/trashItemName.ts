import type { TFunction } from 'i18next';
import { z } from 'zod';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { type TrashItem, CURRENCY_VALUES, MOVEMENT_TYPE_VALUES } from '../../types';
import { movementTypeLabel } from '../../utils/stock';

const trashDisplaySchema = z.object({
  name: z.string().optional(),
  description: z.string().nullish(),
  amount: z.number().optional(),
  currency: z.enum(CURRENCY_VALUES).optional(),
  movement_type: z.enum(MOVEMENT_TYPE_VALUES).optional(),
  quantity: z.number().optional(),
});

export function getTrashItemName(t: TFunction, item: TrashItem): string {
  try {
    const parsed = trashDisplaySchema.safeParse(JSON.parse(item.data));
    if (!parsed.success) return t('trash.unknown');
    const data = parsed.data;
    switch (item.type) {
      case 'company':
        return data.name ?? t('trash.unknown');
      case 'project':
        return data.name ?? t('trash.unknown');
      case 'transaction':
        return `${data.description || t('trash.transactionLabel')} - ${formatCurrency(data.amount, data.currency || 'TRY')}`;
      case 'material':
        return data.name ?? t('trash.unknown');
      case 'stock_movement':
        return `${data.description || (data.movement_type ? movementTypeLabel(t, data.movement_type) : t('trash.unknown'))} - ${formatNumber(data.quantity, 2)}`;
      default:
        return t('trash.unknown');
    }
  } catch {
    return t('trash.unknown');
  }
}
