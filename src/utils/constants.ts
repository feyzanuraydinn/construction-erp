import type {
  CompanyType,
  AccountType,
  ProjectStatus,
  ProjectType,
  OwnershipType,
  TransactionType,
  TransactionScope,
  Currency,
  MovementType,
  SelectOption,
} from '../types';

interface TypedSelectOption<T extends string> {
  value: T;
  label: string;
}

export const COMPANY_TYPES: TypedSelectOption<CompanyType>[] = [
  { value: 'person', label: 'enums.companyType.person' },
  { value: 'company', label: 'enums.companyType.company' },
];

export const ACCOUNT_TYPES: TypedSelectOption<AccountType>[] = [
  { value: 'customer', label: 'enums.accountType.customer' },
  { value: 'supplier', label: 'enums.accountType.supplier' },
  { value: 'subcontractor', label: 'enums.accountType.subcontractor' },
  { value: 'investor', label: 'enums.accountType.investor' },
];

export const PROJECT_STATUSES: TypedSelectOption<ProjectStatus>[] = [
  { value: 'planned', label: 'enums.projectStatus.planned' },
  { value: 'active', label: 'enums.projectStatus.active' },
  { value: 'completed', label: 'enums.projectStatus.completed' },
  { value: 'cancelled', label: 'enums.projectStatus.cancelled' },
];

export const PROJECT_TYPES: TypedSelectOption<ProjectType>[] = [
  { value: 'residential', label: 'enums.projectType.residential' },
  { value: 'villa', label: 'enums.projectType.villa' },
  { value: 'commercial', label: 'enums.projectType.commercial' },
  { value: 'mixed', label: 'enums.projectType.mixed' },
  { value: 'infrastructure', label: 'enums.projectType.infrastructure' },
  { value: 'renovation', label: 'enums.projectType.renovation' },
];

export const OWNERSHIP_TYPES: TypedSelectOption<OwnershipType>[] = [
  { value: 'own', label: 'enums.ownershipType.own' },
  { value: 'client', label: 'enums.ownershipType.client' },
];

export const TRANSACTION_TYPES: TypedSelectOption<TransactionType>[] = [
  { value: 'invoice_out', label: 'enums.transactionType.invoice_out' },
  { value: 'payment_in', label: 'enums.transactionType.payment_in' },
  { value: 'invoice_in', label: 'enums.transactionType.invoice_in' },
  { value: 'payment_out', label: 'enums.transactionType.payment_out' },
];

// İşlem tipleri grupları
export const INCOME_TYPES: TransactionType[] = ['invoice_out']; // Gelir oluşturan
export const EXPENSE_TYPES: TransactionType[] = ['invoice_in']; // Gider oluşturan

// İşlem tipi label'ları (i18n keys)
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  invoice_out: 'enums.transactionType.invoice_out',
  payment_in: 'enums.transactionType.payment_in',
  invoice_in: 'enums.transactionType.invoice_in',
  payment_out: 'enums.transactionType.payment_out',
};

export const TRANSACTION_SCOPES: TypedSelectOption<TransactionScope>[] = [
  { value: 'cari', label: 'enums.transactionScope.cari' },
  { value: 'project', label: 'enums.transactionScope.project' },
  { value: 'company', label: 'enums.transactionScope.company' },
];

export const CURRENCIES: TypedSelectOption<Currency>[] = [
  { value: 'TRY', label: 'enums.currency.TRY' },
  { value: 'USD', label: 'enums.currency.USD' },
  { value: 'EUR', label: 'enums.currency.EUR' },
];

export const MOVEMENT_TYPES: TypedSelectOption<MovementType>[] = [
  { value: 'in', label: 'enums.movementType.in' },
  { value: 'out', label: 'enums.movementType.out' },
  { value: 'adjustment', label: 'enums.movementType.adjustment' },
  { value: 'waste', label: 'enums.movementType.waste' },
];

export const MATERIAL_CATEGORIES: SelectOption[] = [
  { value: 'construction', label: 'enums.materialCategory.construction' },
  { value: 'steel', label: 'enums.materialCategory.steel' },
  { value: 'electrical', label: 'enums.materialCategory.electrical' },
  { value: 'plumbing', label: 'enums.materialCategory.plumbing' },
  { value: 'paint', label: 'enums.materialCategory.paint' },
  { value: 'wood', label: 'enums.materialCategory.wood' },
  { value: 'other', label: 'enums.materialCategory.other' },
];

export const MATERIAL_UNITS: SelectOption[] = [
  { value: 'adet', label: 'enums.materialUnit.adet' },
  { value: 'kg', label: 'enums.materialUnit.kg' },
  { value: 'ton', label: 'enums.materialUnit.ton' },
  { value: 'm2', label: 'enums.materialUnit.m2' },
  { value: 'm3', label: 'enums.materialUnit.m3' },
  { value: 'lt', label: 'enums.materialUnit.lt' },
  { value: 'torba', label: 'enums.materialUnit.torba' },
  { value: 'paket', label: 'enums.materialUnit.paket' },
  { value: 'metre', label: 'enums.materialUnit.metre' },
];

export const MONTHS: SelectOption[] = [
  { value: '01', label: 'enums.months.01' },
  { value: '02', label: 'enums.months.02' },
  { value: '03', label: 'enums.months.03' },
  { value: '04', label: 'enums.months.04' },
  { value: '05', label: 'enums.months.05' },
  { value: '06', label: 'enums.months.06' },
  { value: '07', label: 'enums.months.07' },
  { value: '08', label: 'enums.months.08' },
  { value: '09', label: 'enums.months.09' },
  { value: '10', label: 'enums.months.10' },
  { value: '11', label: 'enums.months.11' },
  { value: '12', label: 'enums.months.12' },
];

// ============================================
// APPLICATION CONFIGURATION CONSTANTS
// ============================================

/**
 * Timing constants for UI and data operations
 */
export const TIMING = {
  /** Debounce delay for database saves (ms) */
  DB_SAVE_DEBOUNCE: 100,
  /** Debounce delay for search input (ms) */
  SEARCH_DEBOUNCE: 300,
  /** Debounce delay for form validation (ms) */
  FORM_VALIDATION_DEBOUNCE: 150,
  /** OAuth authentication timeout (ms) - 5 minutes */
  OAUTH_TIMEOUT: 300000,
  /** Exchange rate cache duration (ms) - 5 minutes */
  EXCHANGE_RATE_CACHE: 5 * 60 * 1000,
  /** Auto-close notification duration (ms) */
  TOAST_DURATION: 3000,
  /** Auto backup interval (ms) - 5 minutes */
  AUTO_BACKUP_INTERVAL: 5 * 60 * 1000,
} as const;

/**
 * API and network configuration
 */
export const API = {
  /** Exchange rate API endpoint */
  EXCHANGE_RATE_URL: 'https://api.exchangerate-api.com/v4/latest/USD',
  /** OAuth redirect port */
  OAUTH_REDIRECT_PORT: 8089,
  /** Batch size for large data exports */
  EXPORT_BATCH_SIZE: 1000,
  /** Large export threshold for progress notification */
  LARGE_EXPORT_THRESHOLD: 5000,
} as const;

/**
 * File and storage limits
 */
export const LIMITS = {
  /** Max log file size before rotation (bytes) - 5MB */
  MAX_LOG_FILE_SIZE: 5 * 1024 * 1024,
  /** Max number of log files to keep */
  MAX_LOG_FILES: 5,
  /** Max column width in Excel export */
  MAX_EXCEL_COLUMN_WIDTH: 50,
  /** Min column width in Excel export */
  MIN_EXCEL_COLUMN_WIDTH: 10,
} as const;

/**
 * UI configuration
 */
export const UI = {
  /** Minimum window width */
  MIN_WINDOW_WIDTH: 1200,
  /** Minimum window height */
  MIN_WINDOW_HEIGHT: 700,
  /** Default window width */
  DEFAULT_WINDOW_WIDTH: 1400,
  /** Default window height */
  DEFAULT_WINDOW_HEIGHT: 900,
  /** Sidebar collapsed width (px) */
  SIDEBAR_COLLAPSED_WIDTH: 80,
  /** Sidebar expanded width (px) */
  SIDEBAR_EXPANDED_WIDTH: 256,
} as const;

/**
 * Fallback values for external services
 */
export const FALLBACKS = {
  /** Fallback USD/TRY exchange rate */
  USD_RATE: 35,
  /** Fallback EUR/TRY exchange rate */
  EUR_RATE: 38,
} as const;
