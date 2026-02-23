import tr from '../i18n/locales/tr.json';
import en from '../i18n/locales/en.json';

type Translations = Record<string, unknown>;

const locales: Record<string, Translations> = { tr, en };
let currentLocale = 'tr';

/**
 * Simple i18n for the main process.
 * Reads the same JSON files used by the renderer's i18next.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: unknown = locales[currentLocale] ?? locales.tr;
  for (const k of keys) {
    if (typeof value === 'object' && value !== null) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  if (typeof value !== 'string') return key;
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''));
  }
  return value;
}

export function setLocale(locale: string): void {
  if (locales[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): string {
  return currentLocale;
}
