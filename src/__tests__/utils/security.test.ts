import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateBackupPath, RateLimiter, sanitizeError } from '../../utils/security';
import { UserFacingError } from '../../utils/userFacingError';

describe('security utils', () => {
  describe('validateBackupPath', () => {
    it('should return false for empty inputs', () => {
      expect(validateBackupPath('', '/path/file.db')).toBe(false);
      expect(validateBackupPath('/backup', '')).toBe(false);
      expect(validateBackupPath('', '')).toBe(false);
    });

    it('should return true for valid path within backup dir', () => {
      expect(validateBackupPath('/backup', '/backup/my-backup.db')).toBe(true);
    });

    it('should return true for Windows paths', () => {
      expect(
        validateBackupPath('C:\\Users\\test\\backup', 'C:\\Users\\test\\backup\\file.db')
      ).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(validateBackupPath('/backup', '/backup/../etc/passwd.db')).toBe(false);
      expect(validateBackupPath('/backup', '/backup/sub/../../etc/test.db')).toBe(false);
    });

    it('should reject paths outside backup dir', () => {
      expect(validateBackupPath('/backup', '/other/path/file.db')).toBe(false);
      expect(validateBackupPath('/backup/dir', '/backup/file.db')).toBe(false);
    });

    it('should reject sibling directories that share the prefix', () => {
      expect(validateBackupPath('/backups', '/backups-old/file.db')).toBe(false);
      expect(validateBackupPath('C:\\data\\backups', 'C:\\data\\backups2\\file.db')).toBe(false);
    });

    it('should accept files in subfolders and a trailing slash on the dir', () => {
      expect(validateBackupPath('/backups/', '/backups/file.db')).toBe(true);
      expect(validateBackupPath('/backups', '/backups/daily/daily-2026-11-10.db')).toBe(true);
    });

    it('should reject the directory itself', () => {
      expect(validateBackupPath('/backups', '/backups.db')).toBe(false);
    });

    it('should reject non-.db file extensions', () => {
      expect(validateBackupPath('/backup', '/backup/file.txt')).toBe(false);
      expect(validateBackupPath('/backup', '/backup/file.sql')).toBe(false);
      expect(validateBackupPath('/backup', '/backup/file.json')).toBe(false);
    });

    it('should be case-insensitive for path comparison', () => {
      expect(validateBackupPath('/Backup', '/backup/file.db')).toBe(true);
      expect(validateBackupPath('/backup', '/BACKUP/file.db')).toBe(true);
    });
  });

  describe('RateLimiter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(3, 60000);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('should reject requests beyond limit', () => {
      const limiter = new RateLimiter(2, 60000);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('should allow requests after window expires', () => {
      const limiter = new RateLimiter(1, 1000);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(false);

      vi.advanceTimersByTime(1100);
      expect(limiter.canMakeRequest()).toBe(true);
    });

    afterEach(() => {
      vi.useRealTimers();
    });
  });

  describe('sanitizeError', () => {
    it('passes only messages meant for the user', () => {
      expect(sanitizeError(new UserFacingError('Geçersiz ID'))).toBe('Geçersiz ID');
      expect(sanitizeError(new Error('Geçersiz ID'))).toBe('error.unexpected');
      expect(sanitizeError(new Error('ENOENT: no such file'))).toBe('error.unexpected');
    });

    it('should sanitize UNIQUE constraint errors', () => {
      expect(sanitizeError(new Error('UNIQUE constraint failed: companies.name'))).toBe(
        'error.db.uniqueConstraint'
      );
    });

    it('should sanitize FOREIGN KEY constraint errors', () => {
      expect(sanitizeError(new Error('FOREIGN KEY constraint failed'))).toBe(
        'error.db.foreignKeyConstraint'
      );
    });

    it('should sanitize NOT NULL constraint errors', () => {
      expect(sanitizeError(new Error('NOT NULL constraint failed: transactions.amount'))).toBe(
        'error.db.notNullConstraint'
      );
    });

    it('should sanitize SQL keyword errors', () => {
      expect(sanitizeError(new Error('Error in SELECT * FROM users'))).toBe('error.unexpected');
      expect(sanitizeError(new Error('INSERT INTO failed'))).toBe('error.unexpected');
    });

    it('should sanitize database locked errors', () => {
      expect(sanitizeError(new Error('database is locked'))).toBe('error.db.databaseLocked');
    });

    it('should sanitize disk I/O errors', () => {
      expect(sanitizeError(new Error('disk I/O error reading page'))).toBe('error.db.diskIOError');
    });

    it('should handle non-Error objects', () => {
      expect(sanitizeError('simple string error')).toBe('error.unexpected');
      expect(sanitizeError(42)).toBe('error.unexpected');
    });

    it('should return generic message for long/complex messages', () => {
      const longMessage = 'x'.repeat(250);
      expect(sanitizeError(new Error(longMessage))).toBe('error.unexpected');
    });

    it('should reject messages with brackets/parens', () => {
      expect(sanitizeError(new Error('Error {detail: "info"}'))).toBe('error.unexpected');
      expect(sanitizeError(new Error('Error [at position 5]'))).toBe('error.unexpected');
    });
  });
});
