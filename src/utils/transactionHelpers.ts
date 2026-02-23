import type { TransactionType, BadgeVariant } from '../types';
import { INCOME_TYPES, EXPENSE_TYPES } from './constants';

// ==================== TÜR KONTROL FONKSİYONLARI ====================

/** Gelir oluşturan işlem mi? (invoice_out) */
export const isIncomeType = (type: TransactionType): boolean =>
  INCOME_TYPES.includes(type);

/** Gider oluşturan işlem mi? (invoice_in) */
export const isExpenseType = (type: TransactionType): boolean =>
  EXPENSE_TYPES.includes(type);

/** Pozitif (bakiyeyi artıran) işlem mi? (invoice_out veya payment_in) */
export const isPositiveTransaction = (type: TransactionType): boolean =>
  type === 'invoice_out' || type === 'payment_in';

// ==================== EKRAN RENK FONKSİYONLARI (4'lü ayrım) ====================

/** İşlem tipine göre arka plan rengi (dot/badge için) */
export function getTransactionColor(type: TransactionType): string {
  switch (type) {
    case 'invoice_out':
      return 'bg-green-500';
    case 'payment_in':
      return 'bg-blue-500';
    case 'invoice_in':
      return 'bg-red-500';
    case 'payment_out':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

/** İşlem tipine göre yazı rengi (ekran: 600 shade) */
export function getTransactionTextColor(type: TransactionType): string {
  switch (type) {
    case 'invoice_out':
      return 'text-green-600';
    case 'payment_in':
      return 'text-blue-600';
    case 'invoice_in':
      return 'text-red-600';
    case 'payment_out':
      return 'text-orange-600';
    default:
      return 'text-gray-600';
  }
}

/** İşlem tipine göre Badge variant'ı (4'lü ayrım) */
export function getTransactionBadgeVariant(
  type: TransactionType
): BadgeVariant {
  switch (type) {
    case 'invoice_out':
      return 'success';
    case 'payment_in':
      return 'info';
    case 'invoice_in':
      return 'danger';
    case 'payment_out':
      return 'warning';
    default:
      return 'info';
  }
}

// ==================== YAZDIRMA RENK FONKSİYONLARI (700 shade — baskıda daha koyu) ====================

/** İşlem tipine göre yazı rengi (yazdırma: 700 shade) */
export function getPrintTransactionTextColor(type: TransactionType): string {
  switch (type) {
    case 'invoice_out':
      return 'text-green-700';
    case 'payment_in':
      return 'text-blue-700';
    case 'invoice_in':
      return 'text-red-700';
    case 'payment_out':
      return 'text-orange-700';
    default:
      return 'text-gray-700';
  }
}

// ==================== FİRMA HESABI (2'li Gelir/Gider ayrımı) ====================

/** Firma hesabı yazı rengi — Gelir yeşil, Gider kırmızı (2'li basit ayrım) */
export function getSimpleTransactionTextColor(type: TransactionType): string {
  switch (type) {
    case 'invoice_out':
    case 'payment_in':
      return 'text-green-600';
    case 'invoice_in':
    case 'payment_out':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/** Firma hesabı Badge variant'ı — Gelir success, Gider danger (2'li basit ayrım) */
export function getSimpleTransactionBadgeVariant(
  type: TransactionType
): BadgeVariant {
  switch (type) {
    case 'invoice_out':
    case 'payment_in':
      return 'success';
    case 'invoice_in':
    case 'payment_out':
      return 'danger';
    default:
      return 'info';
  }
}
