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

  const units = [
    { size: 1_000_000_000, suffix: 'B', digits: 1 },
    { size: 1_000_000, suffix: 'M', digits: 1 },
    { size: 1_000, suffix: 'K', digits: 0 },
  ];
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const smaller = units[i + 1];
    const smallerRoundsUp =
      smaller !== undefined && Number((absAmount / smaller.size).toFixed(smaller.digits)) >= 1000;
    if (absAmount >= unit.size || smallerRoundsUp) {
      const value = (absAmount / unit.size).toFixed(unit.digits);
      return shortOnly ? `${sign}${value}${unit.suffix}` : `${sign}${value}${unit.suffix} ₺`;
    }
  }

  if (shortOnly) {
    return Number(absAmount.toFixed(0)) >= 1000 ? `${sign}1K` : `${sign}${absAmount.toFixed(0)}`;
  }
  return formatCurrency(amount);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(value / 100);
}

export function formatNumber(number: number | null | undefined, decimals: number = 0): string {
  if (number === null || number === undefined) return '-';

  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
}

export function foldForSearch(text: string): string {
  return text.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const SQLITE_TIMESTAMP = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/;

export function parseAppDate(value: string): Date {
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [year, month, day] = [Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3])];
    const date = new Date(year, month - 1, day);
    const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return valid ? date : new Date(Number.NaN);
  }
  const sqlite = SQLITE_TIMESTAMP.exec(value);
  if (sqlite) return new Date(`${sqlite[1]}T${sqlite[2]}Z`);
  return new Date(value);
}

export function toLocalDateString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = parseAppDate(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  if (DATE_ONLY.test(dateString)) return dateString;
  const date = parseAppDate(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return toLocalDateString(date);
}
