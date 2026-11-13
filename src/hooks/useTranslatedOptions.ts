import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectOption } from '../types';

export function useTranslatedOptions<T extends SelectOption>(options: readonly T[]): T[] {
  const { t } = useTranslation();
  return useMemo(
    () => options.map((option) => ({ ...option, label: t(option.label) })),
    [options, t]
  );
}
