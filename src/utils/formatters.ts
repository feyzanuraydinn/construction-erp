import i18n from '../i18n';
import type { Currency } from '../types';

/** i18n diline göre Intl locale döndürür */
function getLocale(): string {
  const lang = i18n.language;
  return lang === 'tr' ? 'tr-TR' : 'en-US';
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: Currency = 'TRY'
): string {
  if (amount === null || amount === undefined) return '-';

  const formatter = new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

// Compact currency format for large numbers (e.g., 1.5M, 250K)
export function formatCompactCurrency(
  amount: number | null | undefined,
  shortOnly: boolean = false
): string {
  if (amount === null || amount === undefined) return '-';

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 1000000000) {
    const value = (absAmount / 1000000000).toFixed(1);
    return shortOnly ? `${sign}${value}B` : `${sign}${value}B ₺`;
  }
  if (absAmount >= 1000000) {
    const value = (absAmount / 1000000).toFixed(1);
    return shortOnly ? `${sign}${value}M` : `${sign}${value}M ₺`;
  }
  if (absAmount >= 1000) {
    const value = (absAmount / 1000).toFixed(0);
    return shortOnly ? `${sign}${value}K` : `${sign}${value}K ₺`;
  }

  return shortOnly ? `${sign}${absAmount.toFixed(0)}` : formatCurrency(amount);
}

export function formatNumber(number: number | null | undefined, decimals: number = 0): string {
  if (number === null || number === undefined) return '-';

  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return new Intl.DateTimeFormat(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

