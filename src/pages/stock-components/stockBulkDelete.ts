import type { useBulkSelection } from '../../hooks/useBulkSelection';

export type StockTab = 'materials' | 'movements';

export type StockBulkSelection = ReturnType<typeof useBulkSelection>;

interface StockBulkDeleteKeys {
  action: string;
  message: string;
  confirm: string;
}

export const STOCK_BULK_DELETE_KEYS: Record<StockTab, StockBulkDeleteKeys> = {
  materials: {
    action: 'stock.bulkDeleteMaterials',
    message: 'stock.bulkDeleteMaterialMessage',
    confirm: 'stock.bulkDeleteMaterialConfirm',
  },
  movements: {
    action: 'stock.bulkDeleteMovements',
    message: 'stock.bulkDeleteMovementMessage',
    confirm: 'stock.bulkDeleteMovementConfirm',
  },
};
