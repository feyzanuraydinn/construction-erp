import { FiMonitor, FiMoon, FiSun } from 'react-icons/fi';
import type { Theme } from '../../contexts/ThemeContext';
import {
  CATEGORY_TYPE_VALUES,
  type Category,
  type CategoryType,
  type Language,
  type TypedSelectOption,
} from '../../types';
import { DEFAULT_CATEGORY_COLOR } from '../../utils/constants';
import type { ChoiceOption } from './ChoiceCard';

export const THEME_OPTIONS: ChoiceOption<Theme>[] = [
  { value: 'light', icon: FiSun, label: 'settings.themeLight' },
  { value: 'dark', icon: FiMoon, label: 'settings.themeDark' },
  { value: 'system', icon: FiMonitor, label: 'settings.themeSystem' },
];

export const LANGUAGE_OPTIONS: ChoiceOption<Language>[] = [
  { value: 'tr', label: 'settings.turkish' },
  { value: 'en', label: 'settings.english' },
];

export const CATEGORY_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#64748b',
  '#71717a',
  '#78716c',
];

export const CATEGORY_TYPES: TypedSelectOption<CategoryType>[] = CATEGORY_TYPE_VALUES.map(
  (value) => ({
    value,
    label: `settings.categoryTypes.${value}`,
  })
);

export interface NewCategory {
  name: string;
  type: CategoryType | '';
  color: string;
}

export const EMPTY_NEW_CATEGORY: NewCategory = {
  name: '',
  type: '',
  color: DEFAULT_CATEGORY_COLOR,
};

export function categoriesOfType(categories: Category[], type: CategoryType): Category[] {
  return categories
    .filter((c) => c.type === type)
    .sort((a, b) => {
      if (a.is_default === 1 && b.is_default !== 1) return -1;
      if (a.is_default !== 1 && b.is_default === 1) return 1;
      return a.name.localeCompare(b.name, 'tr');
    });
}
