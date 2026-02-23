import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLocale, getLocale } from '../../main/i18n';

describe('Main process i18n', () => {
  beforeEach(() => {
    setLocale('tr');
  });

  describe('t()', () => {
    it('should return Turkish translation by default', () => {
      expect(t('main.errorTitle')).toBe('Hata');
    });

    it('should return English translation when locale is set to en', () => {
      setLocale('en');
      expect(t('main.errorTitle')).toBe('Error');
    });

    it('should handle nested keys', () => {
      expect(t('main.closeDialog.title')).toBe('Yedeklenmemiş Değişiklikler');
      setLocale('en');
      expect(t('main.closeDialog.title')).toBe('Unsaved Changes');
    });

    it('should interpolate parameters', () => {
      const result = t('main.unexpectedError', { error: 'test error' });
      expect(result).toBe('Beklenmeyen bir hata oluştu: test error');
    });

    it('should interpolate parameters in English', () => {
      setLocale('en');
      const result = t('main.unexpectedError', { error: 'test error' });
      expect(result).toBe('An unexpected error occurred: test error');
    });

    it('should return the key if translation is not found', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should return the key if path resolves to non-string', () => {
      // 'main.closeDialog' is an object, not a string
      expect(t('main.closeDialog')).toBe('main.closeDialog');
    });

    it('should translate gdrive messages', () => {
      expect(t('main.gdrive.notConnected')).toBe('Google Drive bağlantısı yok');
      setLocale('en');
      expect(t('main.gdrive.notConnected')).toBe('No Google Drive connection');
    });

    it('should translate updater messages with interpolation', () => {
      const result = t('main.updater.availableMessage', { version: '2.0.0' });
      expect(result).toContain('2.0.0');
    });

    it('should translate export messages', () => {
      expect(t('main.export.sheetName')).toBe('Veri');
      setLocale('en');
      expect(t('main.export.sheetName')).toBe('Data');
    });

    it('should translate transaction validation messages', () => {
      expect(t('main.transaction.invalidEntityType')).toBe('Geçersiz entity tipi');
    });
  });

  describe('setLocale()', () => {
    it('should change the current locale', () => {
      setLocale('en');
      expect(getLocale()).toBe('en');
    });

    it('should ignore invalid locales', () => {
      setLocale('xx');
      expect(getLocale()).toBe('tr');
    });

    it('should fall back to tr for unknown locale', () => {
      setLocale('fr');
      expect(getLocale()).toBe('tr');
      expect(t('main.errorTitle')).toBe('Hata');
    });
  });

  describe('getLocale()', () => {
    it('should return current locale', () => {
      expect(getLocale()).toBe('tr');
      setLocale('en');
      expect(getLocale()).toBe('en');
    });
  });
});
