import { i18n, LANGUAGE_STORAGE_KEY } from '../i18n';
import type { Language } from '../types';

export function applyLanguage(language: Language): void {
  void i18n.changeLanguage(language);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  window.electronAPI?.app
    .setLanguage(language)
    .catch((error: unknown) => console.error('Language sync error:', error));
}
