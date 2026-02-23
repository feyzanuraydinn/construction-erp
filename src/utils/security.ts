/**
 * Security utilities for input sanitization and validation
 */

/**
 * Validate and sanitize backup file path
 * Ensures the path is within the allowed backup directory
 */
export function validateBackupPath(backupDir: string, filePath: string): boolean {
  if (!filePath || !backupDir) return false;

  // Normalize paths
  const normalizedBackupDir = backupDir.replace(/\\/g, '/').toLowerCase();
  const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase();

  // Check if file path starts with backup directory
  if (!normalizedFilePath.startsWith(normalizedBackupDir)) {
    return false;
  }

  // Check for path traversal in the relative path
  const relativePath = normalizedFilePath.slice(normalizedBackupDir.length);
  if (relativePath.includes('..')) {
    return false;
  }

  // Check file extension
  if (!filePath.endsWith('.db')) {
    return false;
  }

  return true;
}

/**
 * Rate limiting helper for API calls
 */
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

  getRemainingRequests(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  getResetTime(): number {
    if (this.timestamps.length === 0) return 0;
    const oldestTimestamp = Math.min(...this.timestamps);
    return Math.max(0, this.windowMs - (Date.now() - oldestTimestamp));
  }
}

// Global rate limiter for exchange rate API
export const exchangeRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute

/**
 * Known DB/SQL error patterns that should NOT be forwarded to the renderer.
 * Maps regex patterns to user-friendly error messages.
 */
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

/**
 * Sanitize error messages before sending to the renderer process.
 * Prevents internal DB schema details (table names, column names, SQL syntax)
 * from leaking to the frontend.
 *
 * - Validation errors (from validateId/validateInput) are passed through as-is
 *   since they are already user-friendly.
 * - DB/SQL errors are mapped to generic user-friendly messages.
 * - Unknown errors get a generic fallback message.
 */
export function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // Validation errors from schemas.ts are already safe — pass through
  // They follow patterns like "Geçersiz ID", "Zorunlu alan: ...", etc.
  if (
    message.startsWith('Geçersiz') ||
    message.startsWith('Zorunlu') ||
    message.startsWith('Eşleştirmeler') ||
    message.startsWith('Bu kayıt')
  ) {
    return message;
  }

  // Check against known DB error patterns
  for (const [pattern, userMessage] of DB_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return userMessage;
    }
  }

  // Fallback: if the message looks like it contains SQL/DB internals, sanitize it
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|COLUMN|INDEX)\b/i.test(message)) {
    return 'error.db.genericDbError';
  }

  // If it doesn't match any known dangerous pattern, still be cautious
  // Only pass through short, non-technical messages
  if (message.length < 200 && !/[{}[\]()]/.test(message)) {
    return message;
  }

  return 'error.unexpected';
}
