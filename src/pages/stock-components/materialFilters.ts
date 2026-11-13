import { matchesSearchText } from '../../utils/formatters';
import { isLowStock } from '../../utils/stock';
import type { Material } from '../../types';

export const STOCK_STATUS_OPTIONS = [
  { value: 'low', label: 'stock.criticalStock' },
  { value: 'ok', label: 'stock.normalStock' },
];

export function filterMaterials(
  materials: Material[],
  search: string,
  category: string,
  status: string
): Material[] {
  return materials.filter((m) => {
    const matchesSearch = matchesSearchText(search, m.name, m.code);
    const matchesCategory = !category || m.category === category;
    const matchesStatus =
      !status || (status === 'low' && isLowStock(m)) || (status === 'ok' && !isLowStock(m));
    return matchesSearch && matchesCategory && matchesStatus;
  });
}
