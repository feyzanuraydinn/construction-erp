import {
  ACCOUNT_TYPE_VALUES,
  COMPANY_TYPE_VALUES,
  CURRENCY_VALUES,
  MOVEMENT_TYPE_VALUES,
  OWNERSHIP_TYPE_VALUES,
  PROJECT_STATUS_VALUES,
  PROJECT_TYPE_VALUES,
  TRANSACTION_SCOPE_VALUES,
  TRANSACTION_TYPE_VALUES,
  type SelectOption,
  type TransactionType,
  type TypedSelectOption,
} from '../types';

function enumOptions<T extends string>(
  group: string,
  values: readonly T[]
): TypedSelectOption<T>[] {
  return values.map((value) => ({ value, label: `enums.${group}.${value}` }));
}

export const COMPANY_TYPES = enumOptions('companyType', COMPANY_TYPE_VALUES);
export const ACCOUNT_TYPES = enumOptions('accountType', ACCOUNT_TYPE_VALUES);
export const PROJECT_STATUSES = enumOptions('projectStatus', PROJECT_STATUS_VALUES);
export const PROJECT_TYPES = enumOptions('projectType', PROJECT_TYPE_VALUES);
export const OWNERSHIP_TYPES = enumOptions('ownershipType', OWNERSHIP_TYPE_VALUES);
export const TRANSACTION_TYPES = enumOptions('transactionType', TRANSACTION_TYPE_VALUES);
export const TRANSACTION_SCOPES = enumOptions('transactionScope', TRANSACTION_SCOPE_VALUES);
export const CURRENCIES = enumOptions('currency', CURRENCY_VALUES);
export const MOVEMENT_TYPES = enumOptions('movementType', MOVEMENT_TYPE_VALUES);
export const MATERIAL_CATEGORIES: SelectOption[] = enumOptions('materialCategory', [
  'construction',
  'steel',
  'electrical',
  'plumbing',
  'paint',
  'wood',
  'other',
]);
export const MATERIAL_UNITS: SelectOption[] = enumOptions('materialUnit', [
  'adet',
  'kg',
  'ton',
  'm2',
  'm3',
  'lt',
  'torba',
  'paket',
  'metre',
]);
export const MONTHS: SelectOption[] = enumOptions(
  'months',
  Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
);

export function transactionTypeLabel(type: TransactionType): string {
  return `enums.transactionType.${type}`;
}

export const TIMING = {
  SEARCH_DEBOUNCE: 300,
  OAUTH_TIMEOUT: 300000,
  EXCHANGE_RATE_CACHE: 5 * 60 * 1000,
} as const;

export const API = {
  EXCHANGE_RATE_URL: 'https://api.exchangerate-api.com/v4/latest/USD',
  OAUTH_REDIRECT_PORT: 8089,
} as const;

export const DEFAULT_CATEGORY_COLOR = '#6366f1';

export const DRIVE_REDIRECT_URI = `http://localhost:${API.OAUTH_REDIRECT_PORT}/oauth2callback`;

export const LIMITS = {
  MAX_LOG_FILE_SIZE: 5 * 1024 * 1024,
  MAX_LOG_FILES: 5,
  MAX_EXCEL_COLUMN_WIDTH: 50,
  MIN_EXCEL_COLUMN_WIDTH: 10,
} as const;

export const UI = {
  MIN_WINDOW_WIDTH: 1200,
  MIN_WINDOW_HEIGHT: 700,
} as const;

export const FALLBACKS = {
  USD_RATE: 35,
  EUR_RATE: 38,
} as const;
