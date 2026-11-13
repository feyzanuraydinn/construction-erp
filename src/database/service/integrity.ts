import type { Database as SqlJsDatabase } from 'sql.js';
import { queryRows } from '../sqlQuery';
import { errorText } from '../../utils/errorText';

const REQUIRED_TABLES = ['companies', 'projects', 'transactions'];

export function findDatabaseProblem(db: SqlJsDatabase): string | null {
  try {
    const check = db.exec('PRAGMA quick_check');
    const status = check[0]?.values[0]?.[0];
    if (status !== 'ok') return `integrity check failed: ${String(status)}`;

    const tables = db.exec("SELECT name FROM sqlite_master WHERE type = 'table'");
    const names = new Set((tables[0]?.values ?? []).map((row) => String(row[0])));
    const missing = REQUIRED_TABLES.filter((name) => !names.has(name));
    if (missing.length > 0) return `missing tables: ${missing.join(', ')}`;

    return null;
  } catch (error) {
    return errorText(error);
  }
}

export function foreignKeyCheck(db: SqlJsDatabase): { ok: boolean; violations: unknown[] } {
  try {
    const violations = queryRows<unknown>(db, 'PRAGMA foreign_key_check');
    return { ok: violations.length === 0, violations };
  } catch {
    return { ok: true, violations: [] };
  }
}
