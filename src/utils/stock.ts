import type { TFunction } from 'i18next';
import type { Material, MovementType, SelectOption } from '../types';
import { MATERIAL_CATEGORIES, MATERIAL_UNITS, MOVEMENT_TYPES } from './constants';

interface MovementStyle {
  sign: string;
  amountClass: string;
  selectedClass: string;
}

const GREEN_SELECTED =
  'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
const RED_SELECTED = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
const YELLOW_SELECTED =
  'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
const DECREASE_AMOUNT = 'text-red-600 dark:text-red-400';

export const MOVEMENT_STYLES: Record<MovementType, MovementStyle> = {
  in: {
    sign: '+',
    amountClass: 'text-green-600 dark:text-green-400',
    selectedClass: GREEN_SELECTED,
  },
  out: { sign: '-', amountClass: DECREASE_AMOUNT, selectedClass: RED_SELECTED },
  adjustment: {
    sign: '= ',
    amountClass: 'text-gray-700 dark:text-gray-300',
    selectedClass: YELLOW_SELECTED,
  },
  waste: { sign: '-', amountClass: DECREASE_AMOUNT, selectedClass: YELLOW_SELECTED },
};

export function isLowStock(material: Pick<Material, 'current_stock' | 'min_stock'>): boolean {
  return material.current_stock < material.min_stock;
}

function optionLabel(
  t: TFunction,
  options: readonly SelectOption[],
  value: string | null | undefined,
  fallback: string
): string {
  const option = options.find((candidate) => candidate.value === value);
  return option ? t(option.label, fallback) : fallback;
}

export function materialCategoryLabel(t: TFunction, category: string | null | undefined): string {
  return optionLabel(t, MATERIAL_CATEGORIES, category, category || '-');
}

export function materialUnitLabel(t: TFunction, unit: string | null | undefined): string {
  return optionLabel(t, MATERIAL_UNITS, unit, unit || '');
}

export function movementTypeLabel(t: TFunction, type: MovementType): string {
  return optionLabel(t, MOVEMENT_TYPES, type, type);
}
