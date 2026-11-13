import { i18n as sharedI18n, languageSchema } from '../i18n';
import type { Language } from '../types';

export function t(key: string, params?: Record<string, string | number>): string {
  return sharedI18n.t(key, params);
}

export function setLocale(locale: string): void {
  const parsed = languageSchema.safeParse(locale);
  if (!parsed.success) return;
  void sharedI18n.changeLanguage(parsed.data);
}

export function getLocale(): Language {
  return languageSchema.catch('tr').parse(sharedI18n.language);
}
