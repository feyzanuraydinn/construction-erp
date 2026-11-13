import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { z } from 'zod';
import tr from './locales/tr.json';
import en from './locales/en.json';
import { LANGUAGE_VALUES, type Language } from '../types';

export const LANGUAGE_STORAGE_KEY = 'language';

export const languageSchema = z.enum(LANGUAGE_VALUES);

export function readStoredLanguage(): Language {
  const stored =
    typeof localStorage === 'undefined' ? null : localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return languageSchema.catch('tr').parse(stored);
}

const savedLanguage = readStoredLanguage();

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: 'tr',
  initAsync: false,
  returnedObjectHandler: (key: string) => key,
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
