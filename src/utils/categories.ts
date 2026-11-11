import type { TFunction } from 'i18next';

const UNCATEGORIZED = 'Diğer';

export function categoryLabel(t: TFunction, name: string | null | undefined): string {
  if (!name || name === UNCATEGORIZED) return t('analytics.other');
  return t(`categories.${name}`, name);
}
