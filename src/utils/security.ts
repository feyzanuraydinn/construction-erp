import { UserFacingError } from './userFacingError';
import { errorText } from './errorText';

export function validateBackupPath(backupDir: string, filePath: string): boolean {
  if (!filePath || !backupDir) return false;

  const normalizedBackupDir = backupDir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase();

  if (!normalizedFilePath.startsWith(`${normalizedBackupDir}/`)) {
    return false;
  }

  const relativePath = normalizedFilePath.slice(normalizedBackupDir.length + 1);
  if (relativePath.includes('..')) {
    return false;
  }

  if (!filePath.endsWith('.db')) {
    return false;
  }

  return true;
}

export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return true;
    }

    return false;
  }
}

export const exchangeRateLimiter = new RateLimiter(5, 60000);

const DB_ERROR_PATTERNS: Array<[RegExp, string]> = [
  [/UNIQUE constraint failed/i, 'error.db.uniqueConstraint'],
  [/FOREIGN KEY constraint failed/i, 'error.db.foreignKeyConstraint'],
  [/NOT NULL constraint failed/i, 'error.db.notNullConstraint'],
  [/CHECK constraint failed/i, 'error.db.checkConstraint'],
  [/no such table/i, 'error.db.schemaError'],
  [/no such column/i, 'error.db.schemaError'],
  [/syntax error/i, 'error.db.systemError'],
  [/database is locked/i, 'error.db.databaseLocked'],
  [/disk I\/O error/i, 'error.db.diskIOError'],
  [/database disk image is malformed/i, 'error.db.databaseCorrupted'],
];

export function sanitizeError(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  const message = errorText(error);
  for (const [pattern, userMessage] of DB_ERROR_PATTERNS) {
    if (pattern.test(message)) return userMessage;
  }
  return 'error.unexpected';
}
